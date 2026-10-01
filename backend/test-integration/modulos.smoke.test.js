const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
let admin, cliente, cajero, autor, categoria, libro, reclamacion;
const ventas = [];
let token;
const password = 'Audit-only-123!';
const pedir = (ruta, method='GET', body) => fetch(`${process.env.TEST_BASE_URL}${ruta}`,{
    method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body === undefined ? undefined : JSON.stringify(body)
});
test.before(async () => {
    const hash=await bcrypt.hash(password,4);
    for (const rol of ['administrador','cliente','rolRetirado']) {
        const [u]=await pool.query('INSERT INTO usuarios (nombre,apellido,email,password,rol) VALUES (\'Módulo\',\'Audit\',?,?,?)',[`${crypto.randomUUID()}@example.test`,hash,rol === 'rolRetirado' ? 'cliente' : rol]);
        if (rol==='administrador') admin=u.insertId; else if (rol==='cliente') cliente=u.insertId; else cajero=u.insertId;
    }
    token=jwt.sign({id_usuario:admin},process.env.JWT_SECRET);
    const [a]=await pool.query("INSERT INTO autores (nombre,apellido) VALUES ('Módulo','Audit')"); autor=a.insertId;
    const [c]=await pool.query("INSERT INTO categorias (nombre) VALUES ('Módulo Audit')"); categoria=c.insertId;
    const [l]=await pool.query("INSERT INTO libros (titulo,id_autor,id_categoria,precio) VALUES ('Módulo Audit',?,?,10)",[autor,categoria]); libro=l.insertId;
    await pool.query('INSERT INTO inventario (id_libro) VALUES (?)',[libro]);
    for (let i=0;i<2;i++) {
        const [v]=await pool.query("INSERT INTO ventas (id_usuario,estado,total,tipo_entrega,correo_compra) VALUES (?,'pagada',10,'tienda','buyer@example.test')",[cliente]); ventas.push(v.insertId);
        await pool.query('INSERT INTO detalle_venta (id_venta,id_libro,cantidad,precio_unitario,subtotal) VALUES (?,?,1,10,10)',[v.insertId,libro]);
    }
});
test.after(async () => {
    await fetch(`${process.env.SMTP_TEST_URL}/ok`,{method:'POST'});
    if(reclamacion) await pool.query('DELETE FROM reclamaciones WHERE id_reclamacion=?',[reclamacion]);
    for(const id of ventas) { await pool.query('DELETE FROM comprobantes WHERE id_venta=?',[id]); await pool.query('DELETE FROM detalle_venta WHERE id_venta=?',[id]); await pool.query('DELETE FROM ventas WHERE id_venta=?',[id]); }
    await pool.query('DELETE FROM movimientos_inventario WHERE id_libro=?',[libro]);
    await pool.query('DELETE FROM inventario WHERE id_libro=?',[libro]); await pool.query('DELETE FROM libros WHERE id_libro=?',[libro]);
    await pool.query('DELETE FROM autores WHERE id_autor=?',[autor]); await pool.query('DELETE FROM categorias WHERE id_categoria=?',[categoria]);
    for(const id of [admin,cliente,cajero]) { await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?',[id]); await pool.query('DELETE FROM usuarios WHERE id_usuario=?',[id]); }
    await pool.end();
});
for (const [modulo,id] of [['autores',()=>autor],['categorias',()=>categoria]]) {
    for(const [caso,datos] of [['nombre objeto',{nombre:{}}],['nombre null',{nombre:null}],['nombre largo',{nombre:'x'.repeat(81)}],
        ['estado null',{estado:null}],['estado vacío',{estado:''}],['estado booleano',{estado:true}]]) {
        test(`${modulo} editar ${caso} devuelve 400`,async () => assert.equal((await pedir(`/api/${modulo}/${id()}`,'PUT',datos)).status,400));
    }
    test(`${modulo} crear tipo inválido devuelve 400`,async () => assert.equal((await pedir(`/api/${modulo}`,'POST',{nombre:{},apellido:'Audit'})).status,400));
    test(`${modulo} eliminar con libro asociado devuelve 409`,async () => assert.equal((await pedir(`/api/${modulo}/${id()}`,'DELETE',{password})).status,409));
    test(`${modulo} estados activo e inactivo persisten`,async () => {
        for(const estado of [0,1]) { assert.equal((await pedir(`/api/${modulo}/${id()}`,'PUT',{estado})).status,200); const res=await pedir(`/api/${modulo}/${id()}`); assert.equal((await res.json()).data.estado,estado); }
    });
}
for(const [campo,valor] of [['fecha_inicio','2026-02-30'],['razon_social',''],['razon_social',{}],['direccion','x'.repeat(256)],['aplica_igv',true]]) {
    test(`empresa ${campo}=${JSON.stringify(valor)} devuelve 400`,async () => assert.equal((await pedir('/api/empresa','PUT',{[campo]:valor})).status,400));
}
test('empresa guarda datos válidos y mantiene RUC de emisor',async () => {
    assert.equal((await pedir('/api/empresa','PUT',{razon_social:'Audit S.A.',direccion:'Audit 123',fecha_inicio:'2026-02-28'})).status,200);
    const res=await pedir('/api/empresa'); const {empresa}=await res.json(); assert.equal(empresa.razon_social,'Audit S.A.'); assert.equal(empresa.ruc.length,11);
});
test('historial tipos y longitud inválidos producen 400',async () => {
    for(const datos of [{tipo_operacion:'x'.repeat(21),modulo:'audit',descripcion:'Audit'}, {tipo_operacion:'CREAR',modulo:{},descripcion:'Audit'}])
        assert.equal((await pedir('/api/historial','POST',datos)).status,400);
});
test('historial válido aparece en listado',async () => {
    assert.equal((await pedir('/api/historial','POST',{tipo_operacion:'CREAR',modulo:'audit',descripcion:'Auditoría persistente'})).status,201);
    assert.ok((await (await pedir('/api/historial')).json()).data.some(r => r.descripcion==='Auditoría persistente'));
});
test('usuarios rol cajero inválido, null inválido, no auto-desactivar y cambio efectivo',async () => {
    for(const body of [{rol:'cajero'},{estado:null},{estado:'abc'}]) assert.equal((await pedir(`/api/usuarios/${cliente}`,'PATCH',body)).status,400);
    assert.equal((await pedir(`/api/usuarios/${admin}`,'PATCH',{estado:0})).status,403);
    const viejo=jwt.sign({id_usuario:cliente},process.env.JWT_SECRET);
    assert.equal((await pedir(`/api/usuarios/${cliente}`,'PATCH',{estado:0})).status,200);
    assert.equal((await fetch(`${process.env.TEST_BASE_URL}/api/usuarios/perfil`,{headers:{Authorization:`Bearer ${viejo}`}})).status,401);
    assert.equal((await pedir(`/api/usuarios/${cliente}`,'PATCH',{estado:1})).status,200);
});
test('tarifa: negativa, inexistente, repetición sin duplicado y sin renombrar distrito',async () => {
    assert.equal((await pedir('/api/ubicaciones/distritos/21','PUT',{tarifa_envio:-1})).status,400);
    assert.equal((await pedir('/api/ubicaciones/distritos/2147483647','PUT',{tarifa_envio:3})).status,404);
    assert.equal((await pedir('/api/ubicaciones/distritos/21','PUT',{tarifa_envio:3,nombre:'x'})).status,400);
    for(let i=0;i<2;i++) assert.equal((await pedir('/api/ubicaciones/distritos/21','PUT',{tarifa_envio:0})).status,200);
    const [rows]=await pool.query('SELECT tarifa_envio FROM distritos_lima WHERE id_distrito=21'); assert.equal(rows.length,1); assert.equal(Number(rows[0].tarifa_envio),0);
});
let comprobante;
test('pedidos: dos avances concurrentes del mismo estado no producen 500',async () => {
    const id=ventas[0];
    await pool.query("UPDATE ventas SET estado_entrega='pendiente' WHERE id_venta=?",[id]);
    const bloqueo=await pool.getConnection();
    await bloqueo.beginTransaction(); await bloqueo.query('SELECT id_venta FROM ventas WHERE id_venta=? FOR UPDATE',[id]);
    const solicitudes=[1,2].map(() => pedir(`/api/pedidos/${id}/estado`,'PUT',{estado:'preparando'}));
    try {
        await new Promise(r => setTimeout(r,250));
        await bloqueo.commit();
        const respuestas=await Promise.all(solicitudes);
        assert.deepEqual(respuestas.map(r => r.status).sort(),[200,400]);
    } finally { await bloqueo.rollback(); bloqueo.release(); }
});
test('un claim de rol retirado no permite consultar ventas, pagos o reservas ajenos por ID',async () => {
    const legacy=jwt.sign({id_usuario:cajero,rol:'cajero'},process.env.JWT_SECRET);
    const referencia=crypto.randomUUID(); await pool.query('UPDATE ventas SET external_reference=? WHERE id_venta=?',[referencia,ventas[0]]);
    const [r]=await pool.query('INSERT INTO reservas (id_usuario,id_libro,cantidad) VALUES (?,?,1)',[cliente,libro]);
    try {
        for(const ruta of [`/api/ventas/${ventas[0]}`,`/api/ventas/${ventas[0]}/pago`,`/api/pagos/${referencia}`,`/api/reservas/${r.insertId}`]) {
            const res=await fetch(`${process.env.TEST_BASE_URL}${ruta}`,{headers:{Authorization:`Bearer ${legacy}`}}); assert.equal(res.status,403,ruta);
        }
    } finally { await pool.query('DELETE FROM reservas WHERE id_reserva=?',[r.insertId]); }
});
test('ventas legacy panel/reserva solo lectura: estado, reembolso y emisión bloqueados',async () => {
    for(const origen of ['panel','reserva']) {
        const [v]=await pool.query("INSERT INTO ventas (id_usuario,estado,total,origen,tipo_entrega) VALUES (?,'pagada',10,?,'tienda')",[cliente,origen]); ventas.push(v.insertId);
        assert.equal((await pedir(`/api/ventas/${v.insertId}`)).status,200);
        for(const [ruta,method,body] of [
            [`/api/ventas/${v.insertId}/estado`,'PUT',{estado:'entregada'}],
            [`/api/ventas/${v.insertId}/reembolso`,'POST',{motivo:'Auditoría legacy'}],
            [`/api/ventas/${v.insertId}/comprobante`,'POST',{tipo:'boleta'}]
        ]) assert.equal((await pedir(ruta,method,body)).status,409,ruta);
        const [actual]=await pool.query('SELECT estado FROM ventas WHERE id_venta=?',[v.insertId]); assert.equal(actual[0].estado,'pagada');
    }
});
test('comprobante: boleta concurrente no duplica, total real y email guardado',async () => {
    const res=await Promise.all([1,2].map(() => pedir(`/api/ventas/${ventas[0]}/comprobante`,'POST',{tipo:'boleta',cliente_email:'buyer@example.test'})));
    assert.deepEqual(res.map(r => r.status).sort(),[201,409]);
    comprobante=(await res.find(r => r.status===201).json()).comprobante;
    assert.equal(Number(comprobante.total),10); assert.equal(comprobante.cliente_email,'buyer@example.test');
});
test('comprobante: factura rechaza DNI y emite RUC válido',async () => {
    assert.equal((await pedir(`/api/ventas/${ventas[1]}/comprobante`,'POST',{tipo:'factura',cliente_dni_ruc:'12345678',cliente_tipo_documento:'DNI',cliente_nombre:'Audit'})).status,400);
    const res=await pedir(`/api/ventas/${ventas[1]}/comprobante`,'POST',{tipo:'factura',cliente_dni_ruc:'10447545387',cliente_tipo_documento:'RUC',cliente_nombre:'Audit'});
    assert.equal(res.status,201); assert.equal((await res.json()).comprobante.tipo,'factura');
});
test('comprobante: envío y reenvío SMTP reales no crean comprobantes',async () => {
    const antes=(await (await fetch(process.env.SMTP_TEST_URL)).json()).mensajes.length;
    for(let i=0;i<2;i++) {
        const res=await pedir(`/api/comprobantes/${comprobante.id_comprobante}/enviar-email`,'POST'); assert.equal(res.status,200); assert.equal((await res.json()).enviado,true);
    }
    const despues=(await (await fetch(process.env.SMTP_TEST_URL)).json()).mensajes;
    assert.equal(despues.length-antes,2); assert.ok(despues.at(-1).includes('buyer@example.test'));
    const [rows]=await pool.query('SELECT enviado_por_email FROM comprobantes WHERE id_venta=?',[ventas[0]]); assert.equal(rows.length,1); assert.equal(rows[0].enviado_por_email,true);
});
test('comprobante: fallo SMTP no devuelve éxito falso',async () => {
    await fetch(`${process.env.SMTP_TEST_URL}/fail`,{method:'POST'});
    try {
        const res=await pedir(`/api/comprobantes/${comprobante.id_comprobante}/enviar-email`,'POST');
        assert.equal(res.status,409); assert.equal((await res.json()).success,false);
    } finally { await fetch(`${process.env.SMTP_TEST_URL}/ok`,{method:'POST'}); }
});
test('reclamación: registro público, respuesta admin y estado persistido',async () => {
    const body={tipo:'reclamo',consumidor_nombre:'Audit Persona',consumidor_tipo_documento:'DNI',consumidor_documento:'12345678',
        consumidor_domicilio:'Audit 123',consumidor_email:'buyer@example.test',bien_tipo:'producto',bien_descripcion:'Libro auditado',detalle:'Detalle de la auditoría del libro',pedido:'Solicito una respuesta'};
    const res=await pedir('/api/reclamaciones','POST',body); assert.equal(res.status,201); reclamacion=(await res.json()).data.id_reclamacion;
    assert.equal((await pedir(`/api/reclamaciones/${reclamacion}/respuesta`,'PUT',{respuesta:''})).status,400);
    assert.equal((await pedir(`/api/reclamaciones/${reclamacion}/respuesta`,'PUT',{respuesta:'Respondemos a la consulta de auditoría.'})).status,200);
    const [rows]=await pool.query('SELECT estado,id_usuario_respuesta FROM reclamaciones WHERE id_reclamacion=?',[reclamacion]); assert.equal(rows[0].estado,'respondido'); assert.equal(rows[0].id_usuario_respuesta,admin);
});
