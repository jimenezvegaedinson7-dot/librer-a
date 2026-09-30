const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const pool = require('../src/config/database');
const ventaModel = require('../src/models/venta.model');
let usuario, autor, categoria, libro, venta;
test.before(async () => {
    const [u] = await pool.query("INSERT INTO usuarios (nombre,apellido,email,password) VALUES ('PayU','Audit',?,'x')", [`${crypto.randomUUID()}@example.test`]); usuario = u.insertId;
    const [a] = await pool.query("INSERT INTO autores (nombre,apellido) VALUES ('PayU','Audit')"); autor = a.insertId;
    const [c] = await pool.query("INSERT INTO categorias (nombre) VALUES ('PayU Audit')"); categoria = c.insertId;
    const [l] = await pool.query("INSERT INTO libros (titulo,precio,id_autor,id_categoria,stock) VALUES ('PayU Audit',10,?,?,0)", [autor,categoria]); libro = l.insertId;
    await pool.query('INSERT INTO inventario (id_libro,stock) VALUES (?,0)', [libro]);
    const [v] = await pool.query("INSERT INTO ventas (id_usuario,total,external_reference,fecha_venta) VALUES (?,10,?,NOW()-INTERVAL '1 hour')", [usuario,crypto.randomUUID()]); venta = v.insertId;
    await pool.query('INSERT INTO detalle_venta (id_venta,id_libro,cantidad,precio_unitario,subtotal) VALUES (?,?,1,10,10)', [venta,libro]);
});
test.after(async () => {
    await pool.query('DELETE FROM comprobantes WHERE id_venta = ?', [venta]);
    await pool.query('DELETE FROM detalle_venta WHERE id_venta = ?', [venta]);
    await pool.query('DELETE FROM ventas WHERE id_venta = ?', [venta]);
    await pool.query('DELETE FROM movimientos_inventario WHERE id_libro = ?', [libro]);
    await pool.query('DELETE FROM inventario WHERE id_libro = ?', [libro]);
    await pool.query('DELETE FROM libros WHERE id_libro = ?', [libro]);
    await pool.query('DELETE FROM autores WHERE id_autor = ?', [autor]);
    await pool.query('DELETE FROM categorias WHERE id_categoria = ?', [categoria]);
    await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [usuario]);
    await pool.end();
});
const escenarios = [
    ['HTTP 500', 500, {}, false], ['timeout', 'timeout', {}, false],
    ['network error', 'network', {}, false], ['orden inexistente', 200, [], true],
    ['pagada', 200, [{status:'CAPTURED'}], false], ['pendiente', 200, [{status:'PENDING'}], false],
    ['error lógico HTTP 200', 200, null, false], ['estado desconocido', 200, [{status:'UNKNOWN'}], false],
    ['aprobada en segunda orden', 200, [{status:'DECLINED'},{status:'APPROVED'}], false]
];
for (const [caso, codigo, payload, cancelar] of escenarios) {
    test(`limpieza PayU ${caso}: venta y stock reales`, async () => {
        await pool.query("UPDATE ventas SET estado='pendiente' WHERE id_venta=?", [venta]);
        await pool.query('UPDATE inventario SET stock=0 WHERE id_libro=?', [libro]);
        await pool.query('UPDATE libros SET stock=0 WHERE id_libro=?', [libro]);
        const upstream = http.createServer((req,res) => {
            if (codigo === 'network') { req.socket.destroy(); return; }
            if (codigo === 'timeout') return;
            res.writeHead(codigo, {'Content-Type':'application/json'});
            res.end(JSON.stringify({ code: payload === null ? 'ERROR' : 'SUCCESS', result: {payload} }));
        }).listen(0, '127.0.0.1');
        await new Promise(r => upstream.once('listening', r));
        const original = global.fetch;
        global.fetch = (url, opts) => original(`http://127.0.0.1:${upstream.address().port}/reports`, opts);
        try {
            await ventaModel.cancelarOrdenesAbandonadas(30);
            const [v] = await pool.query('SELECT estado FROM ventas WHERE id_venta=?', [venta]);
            const [i] = await pool.query('SELECT stock FROM inventario WHERE id_libro=?', [libro]);
            assert.equal(v[0].estado, cancelar ? 'cancelada' : 'pendiente');
            assert.equal(i[0].stock, cancelar ? 1 : 0);
        } finally { global.fetch = original; upstream.closeAllConnections(); await new Promise(r => upstream.close(r)); }
    });
}

for (const [state, esperado, stock] of [['4','pagada',0],['7','pendiente',0],['6','cancelada',1]]) {
    test(`webhook firmado ${state}: estado ${esperado}, duplicado sin restauración doble`, async () => {
        const ref = crypto.randomUUID();
        await pool.query("UPDATE ventas SET estado='pendiente',external_reference=?,payu_payment_status=NULL,payu_order_id=NULL,payu_payment_id=NULL WHERE id_venta=?",[ref,venta]);
        await pool.query('UPDATE inventario SET stock=0 WHERE id_libro=?',[libro]);
        await pool.query('UPDATE libros SET stock=0 WHERE id_libro=?',[libro]);
        const sign = crypto.createHash('md5').update(`${process.env.PAYU_API_KEY}~${process.env.PAYU_MERCHANT_ID}~${ref}~10.0~PEN~${state}`).digest('hex');
        const body = {merchant_id:process.env.PAYU_MERCHANT_ID,reference_sale:ref,value:'10.00',currency:'PEN',state_pol:state,
            transaction_id:crypto.randomUUID(),reference_pol:'123',sign};
        const solicitar = datos => fetch(`${process.env.TEST_BASE_URL}/api/pagos/webhook`,{
            method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(datos)
        });
        assert.equal((await solicitar({...body,sign:'firma-inválida'})).status,401);
        const primero = await solicitar(body); assert.equal(primero.status,200);
        const duplicado = await solicitar(body); assert.equal(duplicado.status,200); assert.equal((await duplicado.json()).duplicado,true);
        const [rows]=await pool.query('SELECT estado FROM ventas WHERE id_venta=?',[venta]); assert.equal(rows[0].estado,esperado);
        const [inventario]=await pool.query('SELECT stock FROM inventario WHERE id_libro=?',[libro]); assert.equal(inventario[0].stock,stock);
    });
}
