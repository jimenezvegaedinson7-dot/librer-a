import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const CLAVE = `lds:carrusel-orbite:v3:${API}`;
const IMAGEN = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
const LIBROS = Array.from({ length: 16 }, (_, i) => ({
    id_libro: i + 1,
    titulo: `Libro de prueba ${i + 1}`,
    autor: 'Autora de prueba',
    estado: 1,
    precio: 100,
    precio_final: 75,
    descuento_vigente: 1,
    descuento_porcentaje_efectivo: 25,
    stock: 4,
    portada: `${API}/portada-carga-${i + 1}.gif`,
    creado_en: `2026-10-${String(20 - i).padStart(2, '0')}T00:00:00Z`
}));

const pausa = () => {
    let liberar;
    const espera = new Promise((resolver) => {
        liberar = resolver;
    });
    return { espera, liberar };
};

async function preparar(page, libros = LIBROS) {
    await page.route(`${API}/**`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.route(`${API}/libros`, (r) => r.fulfill({ json: libros }));
    await page.route(`${API}/empresa`, (r) => r.fulfill({ json: { success: true, empresa: {} } }));
    await page.route(`${API}/anuncios`, (r) => r.fulfill({ json: { success: true, anuncio: null } }));
    await page.route(`${API}/portada-carga-*.gif`, (r) => r.fulfill({ contentType: 'image/gif', body: IMAGEN }));
}

for (const width of [1440, 390]) {
    test(`carga ${width}px: portada y navegación visibles mientras llegan los libros`, async ({ page }, testInfo) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: 900 });
        await preparar(page);
        const datos = pausa();
        const errores = [];
        page.on('pageerror', (e) => errores.push(e.message));
        await page.route(`${API}/libros`, async (r) => {
            await datos.espera;
            await r.fulfill({ json: LIBROS });
        });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.portada3d__orbite')).toBeVisible();
        await expect(page.getByRole('heading', { name: /Las ideas no se quedan quietas/ })).toBeVisible();
        await expect(page.locator('#precarga')).toHaveCount(0);
        datos.liberar();
        const carrusel = page.getByRole('region', { name: 'Últimos libros agregados' });
        await expect(carrusel.getByRole('link')).toHaveCount(16);
        await expect(carrusel.getByRole('link').first()).toHaveAttribute('href', '/libro/1');
        const guardado = await page.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE);
        expect(guardado.recientes.valor).toHaveLength(16);
        expect(guardado.recientes.valor[0].titulo).toBe(LIBROS[0].titulo);
        expect(Object.keys(guardado)).toEqual(['recientes']);
        await page.screenshot({ path: testInfo.outputPath(`carga-${width}.png`) });
        expect(errores).toEqual([]);
    });
}

test('recarga: usa los recientes guardados mientras la API responde', async ({ page }) => {
    test.setTimeout(90000);
    await preparar(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const carrusel = page.getByRole('region', { name: 'Últimos libros agregados' });
    await expect(carrusel.getByRole('link')).toHaveCount(16);
    const guardado = await page.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE);
    expect(guardado.recientes.valor).toHaveLength(16);

    const respuesta = pausa();
    await page.route(`${API}/libros`, async (r) => {
        await respuesta.espera;
        await r.fulfill({ json: [] });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(carrusel.getByRole('link')).toHaveCount(16);
    respuesta.liberar();
    await expect.poll(async () => (await page.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE)).recientes.valor.length).toBe(0);
    await expect(page.locator('.portada3d__orbite')).toBeVisible();
});

for (const caso of ['vencida', 'corrupta']) {
    test(`caché ${caso}: espera datos nuevos sin bloquear la navegación`, async ({ page }) => {
        await preparar(page);
        await page.addInitScript(
            ({ clave, caso }) => {
                localStorage.setItem(clave, caso === 'corrupta' ? '{incompleto' : JSON.stringify({ recientes: { fecha: Date.now() - 16 * 60 * 1000, valor: [] } }));
            },
            { clave: CLAVE, caso }
        );
        const respuesta = pausa();
        await page.route(`${API}/libros`, async (r) => {
            await respuesta.espera;
            await r.fulfill({ json: LIBROS });
        });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Las ideas no se quedan quietas/ })).toBeVisible();
        respuesta.liberar();
        await expect(page.getByRole('region', { name: 'Últimos libros agregados' }).getByRole('link')).toHaveCount(16);
    });
}
