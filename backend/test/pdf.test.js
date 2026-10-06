const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { generarPdfDesdeHtml } = require('../src/utils/pdf');
test('genera el comprobante PDF y bloquea JavaScript y recursos externos', async () => {
    let requests = 0;
    const server = http.createServer((_req, res) => { requests++; res.end('fixture'); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        const pdf = await generarPdfDesdeHtml(`<h1>Comprobante de prueba</h1><p>Total: S/ 42.00</p><img src="${base}/image"><script>fetch('${base}/script')</script>`);
        assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
        assert.ok(pdf.length > 1000);
        assert.equal(requests, 0);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
test('rechaza HTML inválido antes de abrir el navegador', async () => {
    await assert.rejects(generarPdfDesdeHtml(null), /no es válido/);
});
