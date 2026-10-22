import { test, expect } from '@playwright/test';

test.use({ channel: 'chrome', serviceWorkers: 'allow' });
const API = 'http://127.0.0.1:59999/api';
const IMAGEN = '/portadas/9788467045437.jpg';

async function preparar(page) {
    await page.route(`${API}/**`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.route(`${API}/libros`, (r) => r.fulfill({ json: [] }));
    await page.goto('/catalogo', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    });
}

const cargarImagen = (page, ruta) => page.evaluate((ruta) => new Promise((resolver, rechazar) => {
    const imagen = new Image();
    imagen.crossOrigin = 'anonymous';
    imagen.onload = () => resolver({ ancho: imagen.naturalWidth, alto: imagen.naturalHeight });
    imagen.onerror = () => rechazar(new Error('No cargó la imagen'));
    imagen.src = ruta;
    document.body.appendChild(imagen);
}), ruta);

test('portada persistente: otra página la obtiene del SW incluso sin red', async ({ page, context }) => {
    test.setTimeout(60000);
    await preparar(page);
    expect((await cargarImagen(page, IMAGEN)).ancho).toBeGreaterThan(1);
    await expect.poll(() => page.evaluate(async (ruta) => Boolean(await (await caches.open('lds-recursos-v1')).match(new URL(ruta, location.origin).href)), IMAGEN)).toBe(true);

    const otra = await context.newPage();
    await preparar(otra);
    await context.setOffline(true);
    const respuesta = otra.waitForResponse((r) => r.url().endsWith(IMAGEN));
    expect((await cargarImagen(otra, IMAGEN)).alto).toBeGreaterThan(1);
    expect((await respuesta).fromServiceWorker()).toBe(true);
    await context.setOffline(false);
});

test('precarga en segundo plano guarda portadas y excluye HTML, errores y API JSON', async ({ page }) => {
    test.setTimeout(60000);
    await preparar(page);
    await page.evaluate((ruta) => navigator.serviceWorker.controller.postMessage({
        tipo: 'PRECARGAR_PORTADAS', urls: [new URL(ruta, location.origin).href,
            new URL('/portada-que-no-existe.jpg', location.origin).href,
            'http://127.0.0.1:59999/api/libros'],
    }), IMAGEN);
    await expect.poll(() => page.evaluate(async (ruta) => Boolean(await (await caches.open('lds-recursos-v1')).match(new URL(ruta, location.origin).href)), IMAGEN)).toBe(true);
    const claves = await page.evaluate(async () => (await (await caches.open('lds-recursos-v1')).keys()).map((r) => r.url));
    expect(claves.some((u) => u.includes('portada-que-no-existe'))).toBe(false);
    expect(claves.some((u) => u.endsWith('/api/libros'))).toBe(false);
    expect(claves.some((u) => u.endsWith('/index.html'))).toBe(false);
});
