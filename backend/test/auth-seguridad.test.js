const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const otplib = require('otplib');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const password = 'Fixture-password-123';
const passwordHash = bcrypt.hashSync(password, 4);
let state;
let lastStep;
const database = require.resolve('../src/config/database');
require.cache[database] = { id: database, filename: database, loaded: true, exports: { query: async (sql, values = []) => {
    if (sql.includes('SELECT two_factor_secret')) return [[{ two_factor_secret: state.two_factor_secret }]];
    if (sql.includes('SELECT')) return [sql.includes('LOWER(email)') && values[0] !== state.email ? [] : [{ ...state }]];
    let count = 1;
    if (sql.includes('SET two_factor_secret = ?')) {
        if (state.two_factor_enabled) count = 0;
        else { state.two_factor_secret = values[0]; lastStep = null; }
    } else if (/SET\s+two_factor_enabled = 1/.test(sql)) {
        state.two_factor_enabled = 1; lastStep = values[0];
    } else if (sql.includes('SET two_factor_last_step = ?')) {
        assert.match(sql, /two_factor_last_step < \?/);
        assert.match(sql, /two_factor_secret = \?/);
        assert.match(sql, /sesion_version = \?/);
        count = lastStep == null || values[0] > lastStep ? 1 : 0;
        if (count) lastStep = values[0];
    }
    return [{ affectedRows: count }];
} } };
const mailer = require.resolve('../src/utils/mailer');
require.cache[mailer] = { id: mailer, filename: mailer, loaded: true, exports: {} };
const encryption = require('../src/utils/crypto');
const controller = require('../src/controllers/auth2fa.controller');
const auth = require('../src/controllers/auth.controller');
const response = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });
test.beforeEach(() => {
    lastStep = null;
    state = { id_usuario: 1, email: 'fixture@example.invalid', nombre: 'Fixture', rol: 'cliente', estado: 1, sesion_version: 2,
        password: passwordHash, email_verified_at: new Date(), two_factor_enabled: 1,
        two_factor_secret: encryption.cifrar(otplib.generateSecret()), email_verification_code: null };
});
test('dos verificaciones simultáneas no reutilizan el mismo período OTP', async () => {
    const codigo = otplib.generateSync({ secret: encryption.descifrar(state.two_factor_secret) });
    const challenge = jwt.sign({ id_usuario: 1, sesion_version: 2, proposito: '2fa_login' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const a = response(), b = response();
    await Promise.all([controller.verificarLogin({ body: { codigo, two_factor_token: challenge } }, a), controller.verificarLogin({ body: { codigo, two_factor_token: challenge } }, b)]);
    assert.deepEqual([a.statusCode, b.statusCode].sort(), [200, 400]);
});
test('setup requiere contraseña y no modifica la configuración al rechazarla', async () => {
    state.two_factor_enabled = 0;
    const before = state.two_factor_secret;
    for (const body of [{}, { password: 'wrong' }]) {
        const r = response(); await controller.setup({ usuario: { id_usuario: 1 }, body }, r);
        assert.equal(r.statusCode, 400); assert.equal(state.two_factor_secret, before);
    }
});
test('la activación exige prueba reciente de contraseña vinculada a usuario y secreto', async () => {
    state.two_factor_enabled = 0;
    const r = response(); await controller.setup({ usuario: { id_usuario: 1 }, body: { password } }, r);
    assert.equal(r.statusCode, 200);
    const codigo = otplib.generateSync({ secret: r.body.data.secret });
    const missing = response(); await controller.confirmar({ usuario: { id_usuario: 1 }, body: { codigo } }, missing);
    assert.equal(missing.statusCode, 400); assert.equal(state.two_factor_enabled, 0);
    const accepted = response(); await controller.confirmar({ usuario: { id_usuario: 1 }, body: { codigo, setup_token: r.body.data.setup_token } }, accepted);
    assert.equal(accepted.statusCode, 200); assert.equal(state.two_factor_enabled, 1);
});
test('restablecer no distingue correo inexistente, no verificado y sin código', async () => {
    const results = [];
    for (const [email, verified] of [['missing@example.invalid', true], [state.email, false], [state.email, true]]) {
        state.email_verified_at = verified ? new Date() : null;
        const r = response(); await auth.reestablecerContrasena({ body: { email, codigo: '000000', password } }, r);
        results.push({ status: r.statusCode, body: r.body });
    }
    assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
});
