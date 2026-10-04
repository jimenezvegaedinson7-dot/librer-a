const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

test('HTTP: desafío 2FA emitido por login no autoriza lecturas ni escrituras protegidas', async () => {
    let id;
    try {
        const email = `${randomUUID()}@example.test`, password = 'AuditLocal-2026';
        const [u] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol,two_factor_enabled,email_verified_at) VALUES ('Audit','2FA',?,?,'administrador',1,NOW())", [email, await bcrypt.hash(password, 4)]);
        id = u.insertId;
        const r = await fetch(`${process.env.TEST_BASE_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        assert.equal(r.status, 200); const login = await r.json(); assert.equal(login.requires_2fa, true);
        const headers = { Authorization: `Bearer ${login.two_factor_token}`, 'Content-Type': 'application/json' };
        for (const [ruta, method, body] of [['/usuarios', 'GET'], ['/usuarios/perfil', 'GET'], ['/categorias', 'POST', { nombre: 'No debe crearse' }]]) {
            const respuesta = await fetch(`${process.env.TEST_BASE_URL}/api${ruta}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
            assert.equal(respuesta.status, 401); assert.equal((await respuesta.json()).codigo, 'TOKEN_NO_ES_SESION');
        }
        const sesion = jwt.sign({ id_usuario: id }, process.env.JWT_SECRET, { expiresIn: '5m' });
        const perfil = await fetch(`${process.env.TEST_BASE_URL}/api/usuarios/perfil`, { headers: { Authorization: `Bearer ${sesion}` } });
        assert.equal(perfil.status, 200);
        const otraSesion = jwt.sign({ id_usuario: id, sesion_version: 0 }, process.env.JWT_SECRET);
        const cambio = await fetch(`${process.env.TEST_BASE_URL}/api/usuarios/password`, {
            method: 'PUT', headers: { Authorization: `Bearer ${sesion}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password_actual: password, password_nueva: 'ClaveNueva-2026', confirmar_password: 'ClaveNueva-2026' })
        });
        assert.equal(cambio.status, 200); assert.equal((await cambio.json()).sesiones_revocadas, true);
        for (const token of [sesion, otraSesion]) {
            const revocada = await fetch(`${process.env.TEST_BASE_URL}/api/usuarios/perfil`, { headers: { Authorization: `Bearer ${token}` } });
            assert.equal(revocada.status, 401); assert.equal((await revocada.json()).codigo, 'SESSION_REVOKED');
        }
        const nuevoLogin = await fetch(`${process.env.TEST_BASE_URL}/api/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'ClaveNueva-2026' })
        });
        const j = await nuevoLogin.json(); assert.equal(nuevoLogin.status, 200);
        assert.equal(jwt.decode(j.two_factor_token).sesion_version, 1);
        const vigente = jwt.sign({ id_usuario: id, sesion_version: 1 }, process.env.JWT_SECRET);
        assert.equal((await fetch(`${process.env.TEST_BASE_URL}/api/usuarios/perfil`, { headers: { Authorization: `Bearer ${vigente}` } })).status, 200);
    } finally {
        if (id) await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        await pool.end();
    }
});
