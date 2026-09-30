const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
let usuario, autor, categoria, libro;
const ventas = [];
let token;
const pedir = async ruta => {
    const res = await fetch(`${process.env.TEST_BASE_URL}${ruta}`,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(res.status,200); return (await res.json()).data;
};
test.before(async () => {
    const [u] = await pool.query("INSERT INTO usuarios (nombre,apellido,email,password,rol) VALUES ('Dash','Audit',?,'x','administrador')",[`${crypto.randomUUID()}@example.test`]); usuario = u.insertId;
    token = jwt.sign({id_usuario:usuario},process.env.JWT_SECRET);
});
test.after(async () => {
    for (const id of ventas) { await pool.query('DELETE FROM detalle_venta WHERE id_venta=?',[id]); await pool.query('DELETE FROM ventas WHERE id_venta=?',[id]); }
    if (libro) { await pool.query('DELETE FROM inventario WHERE id_libro=?',[libro]); await pool.query('DELETE FROM libros WHERE id_libro=?',[libro]); }
    if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?',[autor]);
    if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?',[categoria]);
    await pool.query('DELETE FROM usuarios WHERE id_usuario=?',[usuario]); await pool.end();
});
test('Dashboard base sin operaciones: ceros y listas vacías',async () => {
    const resumen = await pedir('/api/reportes/resumen');
    for (const campo of ['total_libros','total_ventas','total_vendido','total_reservas','libros_stock_bajo']) assert.equal(Number(resumen[campo]),0,campo);
    const indicadores = await pedir('/api/reportes/indicadores-ventas');
    assert.equal(Number(indicadores.total_vendido),0); assert.equal(indicadores.mejor_mes,null);
    for (const ruta of ['libros-mas-vendidos','ventas-por-dia','ventas-por-mes','ventas-por-estado','reservas-por-estado']) assert.deepEqual(await pedir(`/api/reportes/${ruta}`),[]);
});
test('Dashboard suma solo pagada/entregada una vez y stock bajo coherente',async () => {
    const [a] = await pool.query("INSERT INTO autores (nombre,apellido) VALUES ('Dash','Audit')"); autor = a.insertId;
    const [c] = await pool.query("INSERT INTO categorias (nombre) VALUES ('Dash Audit')"); categoria = c.insertId;
    const [l] = await pool.query("INSERT INTO libros (titulo,id_autor,id_categoria) VALUES ('Dash Audit',?,?)",[autor,categoria]); libro=l.insertId;
    await pool.query('INSERT INTO inventario (id_libro,stock,stock_minimo) VALUES (?,1,5)',[libro]);
    for (const [estado,total] of [['pagada',10],['entregada',20],['cancelada',50],['reembolsada',100],['pendiente',200]]) {
        const [v] = await pool.query('INSERT INTO ventas (id_usuario,estado,total,tipo_entrega) VALUES (?,?,?,\'tienda\')',[usuario,estado,total]); ventas.push(v.insertId);
        await pool.query('INSERT INTO detalle_venta (id_venta,id_libro,cantidad,precio_unitario,subtotal) VALUES (?,?,1,?,?)',[v.insertId,libro,total,total]);
    }
    const resumen = await pedir('/api/reportes/resumen'); assert.equal(Number(resumen.total_vendido),30); assert.equal(Number(resumen.total_ventas),2); assert.equal(Number(resumen.libros_stock_bajo),1);
    const top = await pedir('/api/reportes/libros-mas-vendidos'); assert.equal(Number(top[0].cantidad_vendida),2); assert.equal(Number(top[0].total_generado),30);
    for (const ruta of ['ventas-por-dia','ventas-por-mes']) assert.equal((await pedir(`/api/reportes/${ruta}`)).reduce((n,r) => n+Number(r.total_vendido),0),30);
    const indicadores=await pedir('/api/reportes/indicadores-ventas'); assert.equal(Number(indicadores.ticket_promedio),15);
});
