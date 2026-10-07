const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
let usuario, cambios;
const db = require.resolve('../src/config/database');
require.cache[db] = { id: db, filename: db, loaded: true, exports: { query: async (sql, valores) => {
    if (sql.includes('SELECT')) return [[...(valores[0] === usuario.email || valores[0] === usuario.id_usuario ? [{ ...usuario }] : [])]];
    assert.match(sql, /email_verification_code = \?/);
    assert.match(sql, /email_verification_expires > NOW\(\)/);
    assert.match(sql, /sesion_version = \?/);
    const valido = valores[1] === usuario.id_usuario && valores[2] === usuario.email_verification_code
        && valores[3] === usuario.sesion_version && new Date(usuario.email_verification_expires) > new Date();
    if (valido) { cambios++; usuario.password = valores[0]; usuario.sesion_version++; usuario.email_verification_code = null; usuario.email_verification_expires = null; }
    return [{ affectedRows: valido ? 1 : 0 }];
} } };
const auth = require('../src/controllers/auth.controller');
const middleware = require('../src/middlewares/auth.middleware');
const respuesta = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });
test.beforeEach(() => {
    cambios = 0;
    usuario = { id_usuario: 7, email: 'cliente@example.invalid', rol: 'cliente', estado: 1, sesion_version: 2,
        email_verified_at: new Date(), email_verification_code: bcrypt.hashSync('123456', 4),
        email_verification_expires: new Date(Date.now() + 600000), password: 'clave-anterior' };
});
async function permiso() {
    const r = respuesta(); await auth.verificarReseteo({ body: { email: usuario.email, codigo: '123456' } }, r);
    assert.equal(r.statusCode, 200); return r.body.reset_token;
}
test('OTP primero: verificar no cambia la clave ni inicia sesión', async () => {
    const token = await permiso();
    assert.equal(cambios, 0); assert.equal(usuario.password, 'clave-anterior');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    assert.equal(payload.proposito, 'password_reset'); assert.ok(payload.exp - payload.iat <= 300);
    const r = respuesta(); await middleware({ headers: { authorization: `Bearer ${token}` } }, r, () => assert.fail('No es una sesión'));
    assert.equal(r.statusCode, 401);
});
test('el paso de nueva clave consume el permiso una sola vez, incluso con dos peticiones simultáneas', async () => {
    const token = await permiso();
    const a = respuesta(), b = respuesta();
    const req = { body: { email: usuario.email, reset_token: token, password: 'NuevaClave123' } };
    await Promise.all([auth.reestablecerContrasena(req, a), auth.reestablecerContrasena(req, b)]);
    assert.deepEqual([a.statusCode, b.statusCode].sort(), [200, 400]);
    assert.equal(cambios, 1); assert.equal(usuario.sesion_version, 3);
    assert.equal(usuario.email_verification_code, null);
    assert.ok(await bcrypt.compare('NuevaClave123', usuario.password));
});
test('reenviar código invalida el permiso anterior', async () => {
    const token = await permiso(); usuario.email_verification_code = bcrypt.hashSync('654321', 4);
    const r = respuesta(); await auth.reestablecerContrasena({ body: { email: usuario.email, reset_token: token, password: 'NuevaClave123' } }, r);
    assert.equal(r.statusCode, 400); assert.equal(cambios, 0);
});
test('código incorrecto, vencido y cuenta inexistente no producen permisos', async () => {
    for (const caso of ['incorrecto', 'vencido', 'inexistente']) {
        if (caso === 'vencido') usuario.email_verification_expires = new Date(Date.now() - 1000);
        const r = respuesta(); await auth.verificarReseteo({ body: { email: caso === 'inexistente' ? 'otro@example.invalid' : usuario.email, codigo: caso === 'incorrecto' ? '000000' : '123456' } }, r);
        assert.equal(r.statusCode, 400); assert.equal(r.body.reset_token, undefined); assert.equal(cambios, 0);
    }
});
test('un permiso para otro propósito o una sesión anterior no cambia contraseñas', async () => {
    const token = await permiso();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const falso = jwt.sign({ ...payload, proposito: '2fa_login' }, process.env.JWT_SECRET);
    for (const permiso of [falso, token]) {
        if (permiso === token) usuario.sesion_version++;
        const r = respuesta(); await auth.reestablecerContrasena({ body: { email: usuario.email, reset_token: permiso, password: 'NuevaClave123' } }, r);
        assert.equal(r.statusCode, 400); assert.equal(cambios, 0);
    }
});
test('las apps ya publicadas aún pueden enviar código y clave juntos', async () => {
    const r = respuesta(); await auth.reestablecerContrasena({ body: { email: usuario.email, codigo: '123456', password: 'NuevaClave123' } }, r);
    assert.equal(r.statusCode, 200); assert.equal(cambios, 1);
});
