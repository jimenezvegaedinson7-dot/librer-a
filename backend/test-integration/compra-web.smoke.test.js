const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const ventaModel = require('../src/models/venta.model');

test('compra web: cuenta, canal, monto, idempotencia, propiedad y gestión de entrega', async t => {
    const usuarios=[];let autor,categoria,libro,zona;
    const pedir=(ruta,token,method='GET',body)=>fetch(`${process.env.TEST_BASE_URL}/api${ruta}`,{
        method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    try {
        const clave='Compra-Web-123!';
        const hash=await bcrypt.hash(clave,4);
        for(const rol of ['administrador','cliente','cliente']) {
            const [u]=await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol,email_verified_at) VALUES ('Web','Prueba',?,?,?,NOW())",[`${randomUUID()}@example.test`,hash,rol]);usuarios.push(u.insertId);
        }
        const tokens=usuarios.map(id_usuario=>jwt.sign({id_usuario},process.env.JWT_SECRET));
        const [a]=await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Web','Autor')");autor=a.insertId;
        const [c]=await pool.query('INSERT INTO categorias(nombre) VALUES (?)',[`Web-${randomUUID()}`]);categoria=c.insertId;
        const [l]=await pool.query('INSERT INTO libros(titulo,precio,descuento_porcentaje,id_autor,id_categoria,estado) VALUES (?,100,25,?,?,1)',[`Web ${randomUUID()}`,autor,categoria]);libro=l.insertId;
        await pool.query('INSERT INTO inventario(id_libro,stock,stock_minimo) VALUES (?,5,1)',[libro]);
        const [z]=await pool.query('INSERT INTO zonas_delivery_pallasca(nombre,tarifa,estado) VALUES (?,7.50,1)',[`Zona prueba web ${randomUUID()}`]);zona=z.insertId;
        const cuerpo={canal_compra:'web',items:[{id_libro:libro,cantidad:1,precio:1}],tipo_entrega:'tienda',cliente_tipo_documento:'DNI',cliente_documento:'12345678',costo_envio:999,idempotencia_clave:randomUUID()};
        let orden;
        await t.test('cliente inicia sesión real; un administrador no crea compras web',async()=>{
            const [[u]]=await pool.query('SELECT email FROM usuarios WHERE id_usuario=?',[usuarios[1]]);
            const login=await pedir('/auth/login',null,'POST',{email:u.email,password:clave});assert.equal(login.status,200);
            assert.equal((await login.json()).data.rol,'cliente');
            assert.equal((await pedir('/pagos/crear-orden',tokens[0],'POST',cuerpo)).status,403);
            assert.equal((await pedir('/pagos/crear-orden',tokens[1],'POST',{...cuerpo,canal_compra:'panel'})).status,400);
        });
        await t.test('crea compra web y cobra descuento real con recojo gratis',async()=>{
            const r=await pedir('/pagos/crear-orden',tokens[1],'POST',cuerpo);assert.equal(r.status,201,await r.clone().text());orden=(await r.json()).data;
            const [[v]]=await pool.query('SELECT * FROM ventas WHERE id_venta=?',[orden.id_venta]);
            assert.equal(v.canal_compra,'web');assert.equal(v.origen,'app');assert.equal(v.cobertura_entrega,'pallasca');
            assert.equal(Number(v.total),75);assert.equal(Number(v.costo_envio),0);
            const html=await (await fetch(orden.checkout_url)).text();assert.match(html,/name="amount"\s+value="75\.00"/);assert.match(html,/name="currency"\s+value="PEN"/);
            const retorno=await (await fetch(`${process.env.TEST_BASE_URL}/api/pagos/respuesta/${orden.order_id}?transactionState=4`)).text();
            assert.match(retorno,/mis-compras\?orden=/);
            assert.equal((await pool.query('SELECT estado FROM ventas WHERE id_venta=?',[orden.id_venta]))[0][0].estado,'pendiente');
        });
        await t.test('reintento no duplica venta ni stock; otro cliente no ve la compra',async()=>{
            const r=await pedir('/pagos/crear-orden',tokens[1],'POST',cuerpo);assert.equal(r.status,200);assert.equal((await r.json()).data.id_venta,orden.id_venta);
            assert.equal((await pool.query('SELECT stock FROM inventario WHERE id_libro=?',[libro]))[0][0].stock,4);
            assert.equal((await pedir(`/ventas/${orden.id_venta}`,tokens[2])).status,403);
            assert.equal((await pedir(`/ventas/${orden.id_venta}/pago`,tokens[2])).status,403);
            assert.equal((await pedir(`/pagos/${orden.order_id}`,tokens[2])).status,403);
            assert.equal((await pedir(`/pedidos/${orden.id_venta}/estado`,tokens[0],'PUT',{estado:'preparando'})).status,409);
            await assert.rejects(ventaModel.actualizarEstadoEntrega(orden.id_venta,'preparando'),e=>e.status===409);
        });
        await t.test('webhook firmado confirma pago y el panel gestiona el pedido web',async()=>{
            const value='75.00',state_pol='4';
            const sign=createHash('md5').update(`${process.env.PAYU_API_KEY}~${process.env.PAYU_MERCHANT_ID}~${orden.order_id}~75.0~PEN~${state_pol}`).digest('hex');
            const webhook=await pedir('/pagos/webhook',null,'POST',{reference_sale:orden.order_id,value,currency:'PEN',state_pol,sign,merchant_id:process.env.PAYU_MERCHANT_ID,transaction_id:randomUUID()});
            assert.equal(webhook.status,200,await webhook.clone().text());assert.equal((await webhook.json()).procesado,true);
            const compras=(await (await pedir('/ventas/mis-ventas',tokens[1])).json()).data;
            assert.equal(compras.find(v=>v.id_venta===orden.id_venta).estado,'pagada');
            const pedidos=(await (await pedir('/pedidos',tokens[0])).json()).data;
            assert.equal(pedidos.find(v=>v.id_venta===orden.id_venta).canal_compra,'web');
            const pagos=(await (await pedir('/pagos',tokens[0])).json()).pagos;
            assert.equal(pagos.find(v=>v.id_venta===orden.id_venta).canal_compra,'web');
            for(const estado of ['preparando','listo_recojo','entregado'])assert.equal((await pedir(`/pedidos/${orden.id_venta}/estado`,tokens[0],'PUT',{estado})).status,200);
        });
        await t.test('delivery web toma tarifa BD y conserva dirección y referencia',async()=>{
            const r=await pedir('/pagos/crear-orden',tokens[1],'POST',{...cuerpo,idempotencia_clave:randomUUID(),tipo_entrega:'domicilio',id_zona_delivery:zona,direccion:'Dirección de prueba Pallasca',referencia:'Referencia prueba',costo_envio:0.01});
            assert.equal(r.status,201,await r.clone().text());const data=(await r.json()).data;assert.equal(Number(data.total),82.5);assert.equal(Number(data.costo_envio),7.5);
            const detalle=(await (await pedir(`/ventas/${data.id_venta}`,tokens[1])).json()).data;
            assert.equal(detalle.referencia,'Referencia prueba');assert.equal(detalle.id_zona_delivery,zona);assert.equal(detalle.canal_compra,'web');
        });
        await t.test('033 es repetible y no modifica el historial',async()=>{
            const [previas]=await pool.query('SELECT * FROM ventas ORDER BY id_venta');
            const sql=readFileSync(path.join(__dirname,'../database/migrations/033_canal_compra_web.sql'),'utf8');await pool.query(sql);await pool.query(sql);
            assert.deepEqual((await pool.query('SELECT * FROM ventas ORDER BY id_venta'))[0],previas);
        });
        await t.test('consulta de PayU con monto incorrecto o ausente no confirma una venta',async()=>{
            const [filas]=await pool.query("SELECT id_venta,external_reference FROM ventas WHERE id_usuario=? AND estado='pendiente' LIMIT 1",[usuarios[1]]);
            const v=filas[0];await pool.query("UPDATE ventas SET payu_order_id='123' WHERE id_venta=?",[v.id_venta]);
            const servicio=require('../src/services/payu.service');
            const controller=require('../src/controllers/pago.controller');
            const anterior=servicio.obtenerOrdenDiagnostico;
            try {
                for(const resultado of [{state:'APPROVED',amount:1},{state:'APPROVED'}]) {
                    servicio.obtenerOrdenDiagnostico=async()=>resultado;
                    let status=200;
                    const res={status(n){status=n;return this;},json(datos){return datos;}};
                    await controller.obtenerOrden({params:{orderId:v.external_reference},usuario:{id_usuario:usuarios[1],rol:'cliente'}},res);
                    assert.equal(status,409);
                    assert.equal((await pool.query('SELECT estado FROM ventas WHERE id_venta=?',[v.id_venta]))[0][0].estado,'pendiente');
                }
            } finally {servicio.obtenerOrdenDiagnostico=anterior;}
        });
    } finally {
        if(usuarios.length){
            await pool.query('DELETE FROM movimientos_inventario WHERE id_usuario IN (?,?,?)',usuarios);
            await pool.query('DELETE FROM ventas WHERE id_usuario IN (?,?,?)',usuarios);
            await pool.query('DELETE FROM historial_operaciones WHERE id_usuario IN (?,?,?)',usuarios);
            await pool.query('DELETE FROM usuarios WHERE id_usuario IN (?,?,?)',usuarios);
        }
        if(zona)await pool.query('DELETE FROM zonas_delivery_pallasca WHERE id_zona=?',[zona]);
        if(libro){await pool.query('DELETE FROM inventario WHERE id_libro=?',[libro]);await pool.query('DELETE FROM libros WHERE id_libro=?',[libro]);}
        if(autor)await pool.query('DELETE FROM autores WHERE id_autor=?',[autor]);if(categoria)await pool.query('DELETE FROM categorias WHERE id_categoria=?',[categoria]);
        await pool.end();
    }
});
