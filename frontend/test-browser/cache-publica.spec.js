import { test, expect } from '@playwright/test';

test.use({ channel: 'chrome', reducedMotion: 'reduce' });
const API = 'http://127.0.0.1:59999/api';
const CLAVE = `lds:datos-publicos:v1:${API}`;
const LIBRO = { id_libro: 7, titulo: 'Lectura guardada', autor: 'Autora', estado: 1,
    precio: '40.00', stock: 4, portada: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==' };
const pausa = () => { let liberar; const espera = new Promise((r) => { liberar = r; }); return { espera, liberar }; };

async function preparar(page) {
    await page.route(`${API}/**`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.route(`${API}/libros`, (r) => r.fulfill({ json: [LIBRO] }));
    await page.route(`${API}/libros/7`, (r) => r.fulfill({ json: { success: true, data: LIBRO } }));
}

test('catálogo y ficha aparecen desde caché y cambian al recibir datos vigentes', async ({ page }) => {
    await preparar(page);
    await page.goto('/catalogo', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.rejilla-libros--todos .libro__titulo')).toHaveText(LIBRO.titulo);
    const catalogo = pausa(), ficha = pausa();
    await page.route(`${API}/libros`, async (r) => { await catalogo.espera; await r.fulfill({ json: [LIBRO] }); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.rejilla-libros--todos .libro__titulo')).toHaveText(LIBRO.titulo);
    catalogo.liberar();
    await page.route(`${API}/libros/7`, async (r) => {
        await ficha.espera;
        await r.fulfill({ json: { success: true, data: { ...LIBRO, precio: '45.00', stock: 0 } } });
    });
    await page.goto('/libro/7', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.ficha-informacion h1')).toHaveText(LIBRO.titulo);
    await expect(page.locator('.ficha-precio')).toHaveText('S/ 40.00');
    ficha.liberar();
    await expect(page.locator('.ficha-precio')).toHaveText('S/ 45.00');
    await expect(page.getByRole('button', { name: 'Comprar ahora', exact: true })).toBeDisabled();
});

test('un libro retirado invalida la ficha guardada', async ({ page }) => {
    await preparar(page);
    await page.goto('/libro/7', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.ficha-informacion h1')).toHaveText(LIBRO.titulo);
    await page.route(`${API}/libros/7`, (r) => r.fulfill({ status: 404, json: { success: false, mensaje: 'Libro retirado' } }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Libro no encontrado' })).toBeVisible();
    const entrada = await page.evaluate((clave) => JSON.parse(localStorage.getItem(clave))?.['/libros/7'], CLAVE);
    expect(entrada).toBeUndefined();
});

test('caché vencida espera al servidor y no queda bloqueada por datos dañados', async ({ page }) => {
    await preparar(page);
    await page.addInitScript(({ clave, libro }) => localStorage.setItem(clave, JSON.stringify({
        '/libros': { fecha: Date.now() - 16 * 60 * 1000, datos: [libro] },
    })), { clave: CLAVE, libro: LIBRO });
    const respuesta = pausa();
    await page.route(`${API}/libros`, async (r) => { await respuesta.espera; await r.fulfill({ json: [LIBRO] }); });
    await page.goto('/catalogo', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.rejilla-libros--todos')).toHaveAttribute('aria-busy', 'true');
    respuesta.liberar();
    await expect(page.locator('.rejilla-libros--todos .libro__titulo')).toHaveText(LIBRO.titulo);
});
