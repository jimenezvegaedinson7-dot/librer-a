import { test, expect } from '@playwright/test';

test.use({ channel: 'chrome' });

const API = 'http://127.0.0.1:59999/api';
const CLAVE = `lds:portada-animacion:v1:${API}`;
const IMAGEN = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
const LIBRO = {
    id_libro: 7, titulo: 'El principito', autor: 'Antoine de Saint-Exupéry',
    categoria: 'Infantil', precio: '40.00', stock: 4, estado: 1,
    portada: `${API}/portada-carga.gif`, creado_en: '2026-10-20T00:00:00Z',
};
const pausa = () => {
    let liberar;
    const espera = new Promise((resolver) => { liberar = resolver; });
    return { espera, liberar };
};

async function preparar(page) {
    await page.route(`${API}/**`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.route(`${API}/libros`, (r) => r.fulfill({ json: [LIBRO] }));
    await page.route(`${API}/empresa`, (r) => r.fulfill({ json: { success: true, empresa: {} } }));
    await page.route(`${API}/anuncios`, (r) => r.fulfill({ json: { success: true, anuncio: null } }));
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ json: { success: true, data: { libro: LIBRO } } }));
    await page.route(LIBRO.portada, (r) => r.fulfill({ contentType: 'image/gif', body: IMAGEN }));
}

for (const width of [1440, 390]) {
    test(`carga ${width}px: spinner durante API, textura y fuente, sin portada provisional`, async ({ page }, testInfo) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: 900 });
        await preparar(page);
        const datos = pausa(), textura = pausa(), fuente = pausa();
        const errores = [];
        page.on('pageerror', (e) => errores.push(e.message));
        await page.route(`${API}/anuncios/protagonista`, async (r) => {
            await datos.espera;
            await r.fulfill({ json: { success: true, data: { libro: LIBRO } } });
        });
        await page.route(LIBRO.portada, async (r) => {
            await textura.espera;
            await r.fulfill({ contentType: 'image/gif', body: IMAGEN });
        });
        await page.route('**/fonts/source-serif-4-editorial-latin.woff2', async (r) => {
            await fuente.espera;
            await r.continue();
        });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#precarga')).toHaveCount(0);
        await expect(page.locator('.portada3d--cargando .portada3d__spinner')).toBeVisible();
        await expect(page.locator('.portada3d__cargando')).toHaveCSS('background-color', 'rgb(247, 241, 232)');
        await expect(page.locator('main > div')).toHaveCSS('animation-name', 'none');
        await expect(page.locator('.portada3d--estatica')).toHaveCount(0);
        datos.liberar();
        await expect(page.locator('.portada3d--3d .portada3d__spinner')).toBeVisible();
        await expect(page.locator('.portada3d__titulo')).toBeHidden();
        await expect(page.locator('.portada3d__respaldo')).toHaveCount(0);
        textura.liberar();
        // La textura sola no basta: el titular no debe aparecer en otra fuente.
        await expect(page.locator('.portada3d--lista')).toHaveCount(0);
        fuente.liberar();
        await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
        await expect(page.locator('.portada3d__lienzo')).toHaveCSS('opacity', '1');
        await expect(page.locator('.portada3d__lienzo')).toHaveCSS('transition-duration', '0s');
        await expect(page.locator('.portada3d__spinner')).toHaveCount(0);
        await expect(page.locator('.portada3d__titulo')).toBeVisible();
        await expect(page.locator('.portada3d--lista')).toHaveAttribute('aria-busy', 'false');
        await expect(page.locator('#precarga')).toHaveCount(0);
        await page.screenshot({ path: testInfo.outputPath(`carga-${width}.png`) });
        expect(errores).toEqual([]);
    });
}

test('recarga: usa el protagonista guardado mientras Render responde y respeta su retirada', async ({ page }) => {
    test.setTimeout(90000);
    await preparar(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    const cache = await page.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE);
    expect(cache.protagonista.valor.titulo).toBe(LIBRO.titulo);
    expect(cache.recientes.valor.length).toBeLessThanOrEqual(5);

    const respuesta = pausa();
    await page.route(`${API}/anuncios/protagonista`, async (r) => {
        await respuesta.espera;
        await r.fulfill({ json: { success: true, data: { libro: null } } });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    // La escena puede estar lista aunque todavía no contestó el servidor.
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.portada3d__acceso-titulo')).toHaveText(LIBRO.titulo);
    respuesta.liberar();
    await expect(page.locator('.portada3d--estatica')).toBeVisible();
    await expect(page.locator('.portada3d__acceso')).toHaveCount(0);
    await expect.poll(() => page.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).protagonista.valor, CLAVE)).toBeNull();
});

test('API antigua 404: guarda el respaldo con su oferta y arranca antes de la consulta siguiente', async ({ page }) => {
    test.setTimeout(90000);
    await preparar(page);
    const oferta = { ...LIBRO, precio_final: '30.00', descuento_vigente: 1, descuento_porcentaje_efectivo: 25 };
    await page.route(`${API}/libros`, (r) => r.fulfill({ json: [oferta] }));
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ status: 404, json: {} }));
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.portada3d__acceso .oferta__final')).toHaveText('S/ 30.00');
    const guardado = await page.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE);
    expect(guardado.protagonista.valor.precio_final).toBe(30);
    const respuesta = pausa();
    await page.route(`${API}/anuncios/protagonista`, async (r) => {
        await respuesta.espera;
        await r.fulfill({ status: 404, json: {} });
    });
    await page.route(`${API}/libros`, async (r) => {
        await respuesta.espera;
        await r.fulfill({ json: [oferta] });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.portada3d__acceso .oferta__final')).toHaveText('S/ 30.00');
    respuesta.liberar();
});

for (const caso of ['vencida', 'corrupta']) {
    test(`caché ${caso}: espera datos nuevos con spinner`, async ({ page }) => {
        await preparar(page);
        await page.addInitScript(({ clave, libro, caso }) => {
            localStorage.setItem(clave, caso === 'corrupta' ? '{incompleto' : JSON.stringify({
                protagonista: { fecha: Date.now() - 16 * 60 * 1000, valor: libro },
            }));
        }, { clave: CLAVE, libro: LIBRO, caso });
        const respuesta = pausa();
        await page.route(`${API}/anuncios/protagonista`, async (r) => {
            await respuesta.espera;
            await r.fulfill({ json: { success: true, data: { libro: LIBRO } } });
        });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.portada3d--cargando .portada3d__spinner')).toBeVisible();
        await expect(page.locator('.portada3d--estatica')).toHaveCount(0);
        respuesta.liberar();
        await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    });
}
