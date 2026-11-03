import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const imagen =
    'data:image/svg+xml,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="#24304b"/><text x="24" y="160" fill="white" font-size="22">Lecturas</text></svg>'
    );
const libros = Array.from({ length: 8 }, (_, i) => ({
    id_libro: i + 1,
    titulo: `Libro de prueba ${i + 1}`,
    autor: 'Autora de prueba',
    estado: 1,
    precio: 100,
    precio_final: 75,
    descuento_vigente: 1,
    descuento_porcentaje_efectivo: 25,
    stock: 4,
    portada: imagen,
    creado_en: `2026-10-${20 + i}`
}));

async function preparar(page, protagonista = libros[0]) {
    await page.route(`${API}/**`, (r) => {
        const ruta = new URL(r.request().url()).pathname;
        if (ruta === '/api/libros') return r.fulfill({ json: libros });
        if (ruta === '/api/anuncios/protagonista') return r.fulfill({ json: { success: true, data: { libro: protagonista } } });
        return r.fulfill({ json: { success: true, data: [] } });
    });
}

const titulo = (page) => page.locator('.portada-ligera__ficha h2, .portada3d__acceso-titulo, .portada3d__libro-titulo').first();

async function sinAnimacion3D(page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '4g' } });
    });
}

async function sinVidrio(page) {
    const filtros = await page.locator('.sitio *').evaluateAll((els) =>
        els
            .filter((el) => {
                const filtro = getComputedStyle(el).backdropFilter;
                return filtro && filtro !== 'none';
            })
            .map((el) => el.className)
    );
    expect(filtros).toEqual([]);
}

for (const width of [390, 1440])
    test(`inicio ${width}px: primera pintura ligera y animación 3D diferida`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const peticiones = [],
            errores = [];
        page.on('request', (r) => peticiones.push(r.url()));
        page.on('pageerror', (e) => errores.push(e.message));
        await preparar(page);
        let liberar;
        const espera = new Promise((r) => {
            liberar = r;
        });
        await page.route(/PortadaEspacial/, async (r) => {
            await espera;
            await r.continue();
        });
        await page.goto('/');

        await expect(page.locator('.portada-ligera__ficha h2')).toHaveText('Libro de prueba 1');
        await expect(page.locator('.portada-ligera__ficha .oferta__final')).toHaveText('S/ 75.00');
        await expect(page.locator('.portada-ligera__recientes li')).toHaveCount(5);
        await expect(page.locator('.oferta-tarjeta').first()).toHaveCSS('opacity', '1');
        await expect(page.locator('.ofertas .seccion__titulo')).toHaveCSS('animation-name', 'none');
        await expect(page.locator('canvas')).toHaveCount(0);
        await expect(page.locator('html')).not.toHaveAttribute('data-precarga');
        await expect(page.locator('.cabecera')).toHaveCSS('background-image', 'none');
        await expect(page.locator('footer.pie')).toHaveCSS('animation-name', 'none');
        expect(peticiones.some((u) => /escenaLibro|portalEditorial|three|AdminLayout|fonts\.googleapis/.test(u))).toBe(false);
        await sinVidrio(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('inicio-ligero.png'), fullPage: true });

        liberar();
        await page.waitForSelector('.portada3d--lista, .portada3d--estatica', { timeout: 30000 });
        await expect(titulo(page)).toContainText('Libro de prueba 1');
        const es3D = await page.locator('.portada3d--lista').count();
        await expect(page.locator('.portada3d canvas')).toHaveCount(es3D ? 1 : 0);
        await sinVidrio(page);
        await page.screenshot({ path: testInfo.outputPath('inicio-3d.png'), fullPage: true });

        await page.goto('/aplicacion');
        const tarjeta = page.locator('.app-funcion').first();
        await expect(tarjeta).toBeVisible();
        await tarjeta.hover();
        await expect(tarjeta).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await expect(tarjeta).toHaveCSS('transform', 'none');
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: testInfo.outputPath('aplicacion-limpia.png'), fullPage: true });
        expect(errores).toEqual([]);
    });

test('portada: navegación disponible incluso si la API tarda', async ({ page }) => {
    await preparar(page);
    await sinAnimacion3D(page);
    let liberar;
    const espera = new Promise((r) => {
        liberar = r;
    });
    await page.route(`${API}/anuncios/protagonista`, async (r) => {
        await espera;
        await r.fulfill({ json: { success: true, data: { libro: libros[0] } } });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.portada-ligera__texto').getByRole('link', { name: 'Ver catálogo', exact: true })).toBeVisible();
    await expect(page.locator('.cabecera')).toBeVisible();
    liberar();
    await expect(titulo(page)).toHaveText('Libro de prueba 1');
});

test('portada: respeta libro nulo y el respaldo 404 cuando el catálogo llega después', async ({ page }) => {
    await preparar(page, null);
    await sinAnimacion3D(page);
    await page.goto('/');
    await expect(page.locator('.portada-ligera__recientes li')).toHaveCount(5);
    await expect(page.locator('.portada-ligera__destacado')).toHaveCount(0);
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ status: 404, json: {} }));
    let liberar;
    const espera = new Promise((r) => {
        liberar = r;
    });
    await page.route(`${API}/libros`, async (r) => {
        await espera;
        await r.fulfill({ json: libros });
    });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.portada-ligera__texto').getByRole('link', { name: 'Ver catálogo', exact: true })).toBeVisible();
    liberar();
    await expect(titulo(page)).toHaveText('Libro de prueba 8');
});

test('acceso administrativo: libro limpio sin vidrio y credenciales listas', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/admin/login');
    await expect(page.getByLabel('Correo electrónico', { exact: true })).toBeVisible();
    await expect(page.locator('.login-libro')).toHaveCSS('backdrop-filter', 'none');
    await expect(page.locator('.login-campo').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await page.screenshot({ path: testInfo.outputPath('login-limpio.png'), fullPage: true });
});
