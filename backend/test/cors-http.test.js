const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const crearCors = require('../src/config/cors');
const principal = 'https://librer-a-zeta.vercel.app';
const preview = 'https://libreria-egfzvvw0e-jimenezvegaedinson7-dot.vercel.app';
async function probar(env, callback) {
    const errores = [];
    const app = express(); app.use(crearCors(env, { error: msg => errores.push(msg) }));
    app.use((req, res) => res.status(204).end());
    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    try { await callback(`http://127.0.0.1:${server.address().port}`, errores); }
    finally { await new Promise(r => server.close(r)); }
}
const headers = origin => ({ ...(origin ? { Origin: origin } : {}),
    'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type,Authorization' });
for (const origin of [preview, principal, 'https://evil.example.com', undefined]) {
    test(`OPTIONS HTTP configuración real: ${origin || 'sin Origin'}`, async () => {
        await probar({ FRONTEND_ORIGINS: principal }, async base => {
            const res = await fetch(`${base}/api/auth/solicitar-reseteo`, { method: 'OPTIONS', headers: headers(origin) });
            assert.ok(res.status < 500);
            if (origin === principal || origin === preview) {
                assert.equal(res.headers.get('access-control-allow-origin'), origin);
                assert.match(res.headers.get('access-control-allow-methods'), /POST/);
                assert.match(res.headers.get('access-control-allow-headers'), /content-type/i);
            } else assert.equal(res.headers.get('access-control-allow-origin'), null);
        });
    });
}
test('regex env STRING se compila y regex inválida conserva allowlist sin abrir previews', async () => {
    await probar({ FRONTEND_ORIGINS: principal, FRONTEND_ORIGINS_REGEX: '[' }, async (base, errores) => {
        assert.equal(errores.length, 1);
        for (const origin of [preview, principal]) {
            const res = await fetch(base, { method: 'OPTIONS', headers: headers(origin) });
            assert.ok(res.status < 500);
            assert.equal(res.headers.get('access-control-allow-origin'), origin === principal ? principal : null);
        }
    });
    await probar({ FRONTEND_ORIGINS_REGEX: '^https://custom\\.example$' }, async base => {
        const res = await fetch(base, { method: 'OPTIONS', headers: headers('https://custom.example') });
        assert.equal(res.headers.get('access-control-allow-origin'), 'https://custom.example');
    });
});
