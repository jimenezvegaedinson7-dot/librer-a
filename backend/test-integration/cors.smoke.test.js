const test = require('node:test');
const assert = require('node:assert/strict');
for (const origin of ['https://libreria-egfzvvw0e-jimenezvegaedinson7-dot.vercel.app', 'https://librer-a-zeta.vercel.app', 'https://evil.example.com', undefined]) {
    test(`OPTIONS servidor completo ${origin || 'sin Origin'}`, async () => {
        const res = await fetch(`${process.env.TEST_BASE_URL}/api/auth/solicitar-reseteo`, {
            method: 'OPTIONS', headers: { ...(origin ? { Origin: origin } : {}),
                'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type' }
        });
        assert.ok(res.status < 500);
        if (origin && !origin.includes('evil')) {
            assert.equal(res.headers.get('access-control-allow-origin'), origin);
            assert.match(res.headers.get('access-control-allow-methods'), /POST/);
            assert.match(res.headers.get('access-control-allow-headers'), /content-type/i);
        } else assert.equal(res.headers.get('access-control-allow-origin'), null);
    });
}
