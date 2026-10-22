import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const PORTADA = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const libros = Array.from({ length: 8 }, (_, i) => ({
    id_libro: i + 1, titulo: `Lectura ${i + 1}`, autor: 'Autora',
    categoria: i % 2 ? 'Novela' : 'Poesía', estado: 1, stock: 5,
    portada: PORTADA, precio: '35.00', creado_en: `2026-10-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
}));

async function preparar(page, retraso = 0, sinProtagonista = false, muestra = libros) {
    await page.route(`${API}/**`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.route(`${API}/libros`, async (r) => {
        if (retraso) await new Promise((resolve) => setTimeout(resolve, retraso));
        await r.fulfill({ json: { success: true, data: muestra } });
    });
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill(sinProtagonista
        ? { json: { success: true, data: { modo: 'ninguno', libro: null } } }
        : { status: 404, json: {} }));
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#precarga')).toHaveCount(0, { timeout: 10000 });
}

test('el libro de respaldo aparece aunque el catálogo llegue después del 404', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await preparar(page, 1000);
    await expect(page.locator('.portada3d__libro-titulo')).toHaveText('Lectura 8');
    await expect(page.locator('.portada3d__estatica-libro img')).toBeVisible();
    await expect(page.locator('.portada3d__apilar-item')).toHaveCount(5);
    const posiciones = await page.locator('.portada3d__apilar-item').evaluateAll((els) =>
        els.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(posiciones).size).toBe(5);
});

test('revelados finalizan y se limpian al navegar sin ocultar compras ni hero', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await preparar(page);
    await page.locator('.categorias').scrollIntoViewIfNeeded();
    const titulo = page.locator('.categorias h2');
    await expect(titulo).toHaveAttribute('data-motion-state', 'done');
    await expect(titulo).toHaveCSS('opacity', '1');
    expect(await page.locator('.portada3d [data-reveal]').count()).toBe(0);
    await page.locator('.pie a[href="/catalogo"]').click();
    await expect(page.locator('.tarjeta-libro').first()).toBeVisible();
    expect(await page.locator('.tarjeta-libro [data-reveal]').count()).toBe(0);
    await page.locator('.pie a[href="/"]').first().click();
    await page.locator('.categorias').scrollIntoViewIfNeeded();
    await expect(page.locator('.categorias h2')).toHaveAttribute('data-motion-state', 'done');
    // El paralaje termina en su sitio: sin desplazamiento residual.
    await expect(page.locator('.categorias h2')).toHaveCSS('transform', /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    expect(errores).toEqual([]);
});

test('móvil ofrece cinco libros desplazables sin desbordar la página', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await preparar(page);
    const carrusel = page.locator('.portada3d__apilar-carrusel');
    await expect(carrusel.locator('li')).toHaveCount(5);
    await carrusel.scrollIntoViewIfNeeded();
    const medidas = await carrusel.evaluate((el) => ({
        desplazable: el.scrollWidth > el.clientWidth,
        pagina: document.documentElement.scrollWidth <= innerWidth,
        display: getComputedStyle(el.querySelector('ul')).display,
    }));
    expect(medidas).toEqual({ desplazable: true, pagina: true, display: 'flex' });
    await carrusel.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    expect(await carrusel.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
});

test('cambiar a movimiento reducido durante la sesión retira los efectos espaciales', async ({ page }) => {
    // Esta prueba comprueba el motor editorial, no compila además el shader 3D.
    await preparar(page, 0, true);
    await page.locator('.categorias').scrollIntoViewIfNeeded();
    await expect(page.locator('.categorias h2')).toHaveAttribute('data-motion-state', 'done');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // El paralaje termina en su sitio: sin desplazamiento residual.
    await expect(page.locator('.categorias h2')).toHaveCSS('transform', /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await expect(page.locator('.categorias h2')).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-motion-state="running"]')).toHaveCount(0);
});

for (const width of [1024, 1440]) {
    test(`novedades ${width}px: títulos largos, autores y precios no invaden otra columna`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const largos = libros.map((l) => ({ ...l,
            titulo: 'Las historias extraordinarias que se esconden entre las páginas de un libro',
            autor: 'María del Carmen Fernández de los Ríos',
            precio: '1234.50', precio_final: '1111.05', descuento_vigente: 1,
            descuento_porcentaje_efectivo: 10,
        }));
        await preparar(page, 0, false, largos);
        const escena = page.locator('.portada3d__apilar');
        await escena.scrollIntoViewIfNeeded();
        const medidas = await escena.evaluate((el) => [...el.children].map((card) => {
            const info = card.querySelector('.portada3d__apilar-info');
            const r = info.getBoundingClientRect();
            return { left: r.left, right: r.right,
                overflow: info.scrollWidth > info.clientWidth,
                textoInclinado: getComputedStyle(card).transform !== 'none',
            };
        }));
        expect(medidas.every((r) => !r.overflow && !r.textoInclinado)).toBe(true);
        for (let i = 1; i < medidas.length; i++) {
            expect(medidas[i].left - medidas[i - 1].right).toBeGreaterThanOrEqual(15);
        }
    });
}
