import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const imagen =
    'data:image/svg+xml,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="#24304b"/><text x="24" y="160" fill="white" font-size="22">Lecturas</text></svg>');
const libros = Array.from({ length: 16 }, (_, i) => ({
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
    creado_en: `2026-09-${String(16 - i).padStart(2, '0')}`
}));

async function preparar(page) {
    await page.route(`${API}/**`, (r) => {
        const ruta = new URL(r.request().url()).pathname;
        if (ruta === '/api/libros') return r.fulfill({ json: libros });
        return r.fulfill({ json: { success: true, data: [] } });
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

for (const width of [390, 1440]) {
    test(`inicio ${width}px: portada ligera, sin escena 3D ni librerías innecesarias`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const peticiones = [],
            errores = [];
        page.on('request', (r) => peticiones.push(r.url()));
        page.on('pageerror', (e) => errores.push(e.message));
        await preparar(page);
        await page.goto('/');
        await expect(page.locator('.portada3d__orbite')).toBeVisible({ timeout: 30000 });
        await expect(page.getByRole('heading', { name: /Las ideas no se quedan quietas/ })).toBeVisible();
        await expect(page.getByText('Últimos libros agregados', { exact: true })).toBeVisible();
        await expect(page.getByRole('region', { name: 'Últimos libros agregados' }).getByRole('link')).toHaveCount(16);
        await expect(page.locator('.portada3d canvas')).toHaveCount(0);
        await expect(page.locator('html')).not.toHaveAttribute('data-precarga');
        await expect(page.locator('.cabecera')).toHaveCSS('background-image', 'none');
        await expect(page.locator('.oferta-tarjeta').first()).toHaveCSS('opacity', '1');
        await expect(page.locator('.ofertas .seccion__titulo')).toHaveCSS('animation-name', 'none');
        expect(peticiones.some((u) => /escenaLibro|portalEditorial|three|AdminLayout|fonts\.googleapis/.test(u))).toBe(false);
        await sinVidrio(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('inicio-ligero.png'), fullPage: true });

        await page.goto('/aplicacion');
        const tarjeta = page.locator('.app-funcion').first();
        await expect(tarjeta).toBeVisible();
        await tarjeta.hover();
        await expect(tarjeta).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await expect(tarjeta).toHaveCSS('transform', 'none');
        expect(errores).toEqual([]);
    });
}

test('portada: navegación disponible incluso si la API tarda', async ({ page }) => {
    let liberar;
    const espera = new Promise((resolver) => {
        liberar = resolver;
    });
    await page.route(`${API}/**`, async (r) => {
        if (new URL(r.request().url()).pathname === '/api/libros') await espera;
        return r.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Las ideas no se quedan quietas/ })).toBeVisible();
    await expect(page.locator('.cabecera')).toBeVisible();
    liberar();
    await expect(page.getByRole('region', { name: 'Últimos libros agregados' }).getByRole('link')).toHaveCount(0);
});

test('portada: catálogo vacío deja el carrusel sin libros inventados', async ({ page }) => {
    await page.route(`${API}/**`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.goto('/');
    await expect(page.locator('.portada3d__orbite')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Últimos libros agregados' }).getByRole('link')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('acceso administrativo: libro limpio sin vidrio y credenciales listas', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/admin/login');
    await expect(page.getByLabel('Correo electrónico', { exact: true })).toBeVisible();
    await expect(page.locator('.login-libro')).toHaveCSS('backdrop-filter', 'none');
    await expect(page.locator('.login-campo').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await page.screenshot({ path: testInfo.outputPath('login-limpio.png'), fullPage: true });
});
