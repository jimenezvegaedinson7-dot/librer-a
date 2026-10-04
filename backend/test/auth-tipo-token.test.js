const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
let consultas = 0;
let falloConsulta = false;
const id = require.resolve('../src/config/database');
require.cache[id] = { id, filename: id, loaded: true, exports: {
    query: async () => { consultas++; if (falloConsulta) throw new Error('Base de pruebas temporalmente indisponible'); return [[{ id_usuario: 1, estado: 1, rol: 'administrador', email: 'audit@example.test', fecha_eliminacion: null }]]; }
} };
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const verificarToken = require('../src/middlewares/auth.middleware');
async function verificar(payload) {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5m' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let autorizado = false;
    await verificarToken(req, res, () => { autorizado = true; });
    return { res, req, autorizado };
}
test('token temporal de 2FA no permite acceso ni consulta privilegios', async () => {
    consultas = 0;
    const { res, autorizado } = await verificar({ id_usuario: 1, rol: 'administrador', proposito: '2fa_login' });
    assert.equal(res.statusCode, 401); assert.equal(autorizado, false);
    assert.equal(res.body.codigo, 'TOKEN_NO_ES_SESION'); assert.equal(consultas, 0);
});
test('otros tokens con propósito restringido tampoco son sesiones', async () => {
    for (const proposito of ['reset', '', null]) {
        assert.equal((await verificar({ id_usuario: 1, proposito })).res.statusCode, 401);
    }
});
test('sesión legítima conserva compatibilidad y obtiene el rol actual de BD', async () => {
    const { req, res, autorizado } = await verificar({ id_usuario: 1, rol: 'cliente' });
    assert.equal(res.statusCode, 200); assert.equal(autorizado, true);
    assert.equal(req.usuario.rol, 'administrador');
});
test('fallo de BD es recuperable: 503, nunca sesión inválida 401', async () => {
    falloConsulta = true;
    try {
        const { res, autorizado } = await verificar({ id_usuario: 1 });
        assert.equal(res.statusCode, 503); assert.equal(autorizado, false);
    } finally { falloConsulta = false; }
});
