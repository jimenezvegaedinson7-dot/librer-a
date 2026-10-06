// En Render el navegador instalado junto al paquete viaja con el despliegue.
if (process.env.NODE_ENV === 'production' && !process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}
const { chromium } = require('playwright');

// Un render a la vez, con cola acotada y límites de tiempo. El HTML del
// comprobante no necesita JavaScript ni acceso a servicios de red.
let cola = Promise.resolve();
let pendientes = 0;
const generarPdfDesdeHtml = (htmlContent) => {
    if (typeof htmlContent !== 'string' || Buffer.byteLength(htmlContent) > 1024 * 1024) {
        return Promise.reject(new Error('El contenido del PDF no es válido'));
    }
    if (pendientes >= 10) return Promise.reject(new Error('El generador de PDF está ocupado'));
    pendientes++;
    const operacion = cola.then(async () => {
        const browser = await chromium.launch({ headless: true, timeout: 30000,
            executablePath: process.env.PDF_CHROME_PATH || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        let limitePdf;
        try {
            const context = await browser.newContext({ javaScriptEnabled: false });
            await context.route('**/*', route => {
                if (/^(data:|about:)/.test(route.request().url())) return route.continue();
                return route.abort();
            });
            const page = await context.newPage();
            await page.setContent(htmlContent, { waitUntil: 'load', timeout: 15000 });
            return Buffer.from(await Promise.race([
                page.pdf({ format: 'A4', margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }, printBackground: true }),
                new Promise((_, reject) => { limitePdf = setTimeout(() => reject(new Error('El render del PDF excedió el tiempo permitido')), 15000); })
            ]));
        } finally { clearTimeout(limitePdf); await browser.close(); }
    }).finally(() => { pendientes--; });
    cola = operacion.catch(() => {});
    return operacion;
};
module.exports = { generarPdfDesdeHtml };
