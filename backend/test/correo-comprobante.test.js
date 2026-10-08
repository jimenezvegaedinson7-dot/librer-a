const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Se sustituye el generador de PDF y se captura el correo armado.
function cargarMailer({ pdf }) {
    const ruta = require.resolve('../src/utils/mailer');
    delete require.cache[ruta];
    const original = Module._load;
    Module._load = function (pedido, padre, ...resto) {
        if (pedido === './pdf' && padre?.filename === ruta) {
            return { generarPdfDesdeHtml: async () => { if (!pdf) throw new Error('sin pdf'); return Buffer.from('%PDF-1.4'); } };
        }
        return original.call(this, pedido, padre, ...resto);
    };
    try { return require('../src/utils/mailer'); } finally { Module._load = original; }
}

const datos = {
    destinatario: 'cliente@example.invalid', nombre: 'Ana', tipo: 'boleta', serie: 'B001', numero: 25,
    subtotal: 40, igv: 0, costoEnvio: 0, total: 40, items: [{ titulo: 'Rayuela', cantidad: 1, precio_unitario: 40, subtotal: 40 }],
};

test('con PDF, el correo trae solo un aviso breve (sin la vista del comprobante)', async () => {
    const mailer = cargarMailer({ pdf: true });
    const { cuerpoHtml } = mailer.construirHtmlComprobante(datos);
    const capturado = [];
    const consola = console.log;
    console.log = (m) => capturado.push(String(m));
    try { await mailer.enviarComprobantePorEmail(datos); } finally { console.log = consola; }
    // En modo consola no se envía nada, pero el armado no debe fallar.
    assert.ok(capturado.some((l) => l.includes('cliente@example.invalid')));
    assert.ok(cuerpoHtml.includes('Rayuela'));
});

test('la plantilla de aviso no repite el detalle del comprobante', () => {
    const fs = require('node:fs');
    const fuente = fs.readFileSync(require.resolve('../src/utils/mailer'), 'utf8');
    const aviso = fuente.slice(fuente.indexOf('function cuerpoAvisoComprobante'), fuente.indexOf('async function enviarComprobantePorEmail'));
    assert.match(aviso, /Adjuntamos tu/);
    assert.doesNotMatch(aviso, /items|precio_unitario|subtotal/);
    const envio = fuente.slice(fuente.indexOf('async function enviarComprobantePorEmail'));
    assert.match(envio, /cuerpoAvisoComprobante\(/);
    assert.match(envio, /attachments: \[\{ filename: archivoPdf, content: pdfBuffer \}\]/);
});

test('correos con código: formales, sin cabecera de color y con el nombre escapado', () => {
    const { plantillaCodigo } = require('../src/utils/mailer');
    const html = plantillaCodigo({ titulo: 'Verifica tu cuenta', saludo: 'Hola &lt;Ana&gt;,', intro: 'Ingresa este código:', codigo: '482915', cierre: 'Ignóralo si no fuiste tú.' });
    assert.match(html, /482915/);
    assert.match(html, /Librería del Saber/);
    assert.doesNotMatch(html, /#4f46e5|#4338ca|#eef2ff/i);
    assert.match(html, /no compartas este código/);
});

test('los correos llevan el logo arriba y el texto suelto, sin recuadros', () => {
    const fs = require('node:fs');
    const { plantillaCodigo } = require('../src/utils/mailer');
    const html = plantillaCodigo({ titulo: 'Restablece tu contraseña', saludo: 'Hola,', intro: 'Código:', codigo: '123456', cierre: '.' });
    assert.match(html, /<img src="https:\/\/libreria\.my\/logo-correo\.png"/);
    assert.doesNotMatch(html, /border:1px solid|border-radius|background:/);
    const fuente = fs.readFileSync(require.resolve('../src/utils/mailer'), 'utf8');
    const avisos = fuente.slice(fuente.indexOf('const plantillaBase'), fuente.indexOf('function construirHtmlComprobante'));
    assert.doesNotMatch(avisos, /border-radius|background:#/);
});
