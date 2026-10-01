const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const ids = [];
const tokens = {};
const rutas = ['/api/inventario', '/api/pedidos', '/api/ventas', '/api/pagos', '/api/comprobantes',
    '/api/reportes/resumen', '/api/usuarios', '/api/reclamaciones', '/api/historial'];
test.before(async () => {
    for (const rol of ['administrador','cajero','cliente','inactivo','eliminado','borrado']) {
        const [rows] = await pool.query("INSERT INTO usuarios (nombre,apellido,email,password,rol,estado) VALUES ('Sesión','Audit',?,'x',?,?)", [
            `${crypto.randomUUID()}@example.test`, ['cajero','cliente'].includes(rol) ? 'cliente' : 'administrador', rol === 'inactivo' ? 0 : 1]);
        const id = rows.insertId; ids.push(id);
        tokens[rol] = jwt.sign({id_usuario:id, rol: rol === 'cajero' ? 'cajero' : 'administrador'}, process.env.JWT_SECRET);
        if (rol === 'eliminado') await pool.query('UPDATE usuarios SET fecha_eliminacion=NOW() WHERE id_usuario=?',[id]);
        if (rol === 'borrado') await pool.query('DELETE FROM usuarios WHERE id_usuario=?',[id]);
    }
});
test.after(async () => {
    for (const id of ids) await pool.query('DELETE FROM usuarios WHERE id_usuario=?',[id]);
    await pool.end();
});
for (const rol of ['administrador','cajero','cliente','inactivo','eliminado','borrado','anónimo','inválido']) {
    test(`sesión ${rol}: matriz de lecturas administrativas`, async () => {
        const token = rol === 'inválido' ? 'no-es-jwt' : tokens[rol];
        const esperado = rol === 'administrador' ? 200 : ['cajero','cliente'].includes(rol) ? 403 : 401;
        for (const ruta of rutas) {
            const res = await fetch(`${process.env.TEST_BASE_URL}${ruta}`, {headers:token ? {Authorization:`Bearer ${token}`} : {}});
            assert.equal(res.status,esperado,`${rol} ${ruta}`);
        }
    });
}
for (const rol of ['cajero','cliente','anónimo','inválido']) {
    test(`debug-egress ${rol}: no ejecuta diagnóstico público`, async () => {
        const token = rol === 'inválido' ? 'bad' : tokens[rol];
        const res = await fetch(`${process.env.TEST_BASE_URL}/api/debug-egress`,{headers:token ? {Authorization:`Bearer ${token}`} : {}});
        assert.equal(res.status, ['cajero','cliente'].includes(rol) ? 403 : 401);
        const body = await res.json(); assert.equal(body.ipv4,undefined); assert.equal(body.https443,undefined);
    });
}
test('debug-egress admin: diagnóstico legítimo conservado y acotado', async () => {
    const res = await fetch(`${process.env.TEST_BASE_URL}/api/debug-egress`, {headers:{Authorization:`Bearer ${tokens.administrador}`},signal:AbortSignal.timeout(35000)});
    assert.equal(res.status,200); const body = await res.json();
    for (const key of ['tcp:465','tcp:587','tcp:25','https443']) assert.equal(typeof body[key],'string');
});
