import { test, expect } from '@playwright/test';

const imagen =
    'data:image/svg+xml,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="#24304b"/><text x="20" y="140" fill="white" font-size="22">Libro de prueba</text></svg>'
    );
const libros = Array.from({ length: 24 }, (_, i) => ({
    id_libro: i + 1,
    titulo: i % 2 ? 'Historias extraordinarias de un viaje por la literatura latinoamericana' : 'Cien años de soledad',
    autor: 'Gabriel García Márquez y una colaboración editorial',
    categoria: ['Literatura latinoamericana', 'Novela', 'Poesía', 'Cuento', 'Ensayo', 'Fantasía', 'Historia', 'Infantil'][i % 8],
    precio: 1399.9,
    precio_final: i < 12 ? 979.93 : 1399.9,
    descuento_vigente: i < 12 ? 1 : 0,
    descuento_porcentaje_efectivo: i < 12 ? 30 : 0,
    es_nuevo: 1,
    mas_vendido: i >= 12 ? 1 : 0,
    stock: i === 1 ? 0 : 5,
    estado: 1,
    portada: imagen
}));

async function preparar(page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '4g' } });
    });
    await page.route('http://127.0.0.1:59999/api/**', (route) => {
        const p = new URL(route.request().url()).pathname;
        if (p === '/api/anuncios/protagonista') return route.fulfill({ status: 404, json: {} });
        return route.fulfill({
            json:
                p === '/api/libros'
                    ? libros
                    : p === '/api/empresa'
                      ? { success: true, empresa: {} }
                      : p === '/api/anuncios'
                        ? { success: true, anuncio: null }
                        : { success: true, data: [] }
        });
    });
}

async function revisarTarjetas(page) {
    const fallos = await page.locator('.tarjeta-libro, .libro, .oferta-tarjeta, .categoria-tarjeta, .app-funcion').evaluateAll((tarjetas) => {
        const errores = [];
        for (const tarjeta of tarjetas) {
            const caja = tarjeta.getBoundingClientRect();
            for (const e of tarjeta.querySelectorAll(
                '.libro__titulo, .libro__autor, .categoria, .categoria__nombre, .categoria__flecha, .precio, .oferta-tarjeta__autor, .compra-libro, .boton, b, p'
            )) {
                const r = e.getBoundingClientRect();
                if (!r.width || !r.height) continue;
                if (r.left < caja.left - 1 || r.right > caja.right + 1 || r.bottom > caja.bottom + 1)
                    errores.push(`${tarjeta.className}: ${e.className || e.tagName} sale de la tarjeta`);
            }
            const acciones = tarjeta.querySelector('.compra-libro');
            if (acciones) {
                const a = acciones.getBoundingClientRect();
                for (const texto of tarjeta.querySelectorAll('.libro__titulo, .precio, .oferta-tarjeta__ahorro')) {
                    if (texto.getBoundingClientRect().bottom > a.top + 1) errores.push(`${tarjeta.className}: acciones sobre el contenido`);
                }
            }
        }
        return errores;
    });
    expect(fallos).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test.use({ reducedMotion: 'reduce' });
for (const [width, height] of [
    [320, 667],
    [360, 800],
    [390, 844],
    [430, 932],
    [600, 900],
    [768, 1024],
    [1024, 768],
    [1440, 1000],
    [844, 390]
]) {
    test(`responsive ${width}x${height}: tarjetas, ofertas, formularios y navegación sin solapamientos`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await preparar(page);
        const errores = [];
        page.on('pageerror', (e) => errores.push(e.message));
        await page.goto('/');
        await expect(page.locator('.oferta-tarjeta')).toHaveCount(12);
        await revisarTarjetas(page);
        if (width <= 640) {
            for (const selector of ['.categorias__rejilla', '.ofertas__carrusel']) {
                const pista = page.locator(selector);
                const dimensiones = await pista.evaluate((e) => ({
                    ancho: e.clientWidth,
                    tarjeta: e.firstElementChild.getBoundingClientRect().width,
                    desplazable: e.scrollWidth > e.clientWidth
                }));
                expect(dimensiones.tarjeta).toBeGreaterThan(dimensiones.ancho * 0.4);
                expect(dimensiones.desplazable).toBe(true);
            }
        }
        if (width <= 900) {
            const reciente = await page.locator('.portada-ligera__recientes li a').first().boundingBox();
            expect(reciente.width).toBeLessThanOrEqual(width / 2);
            const carrusel = page.locator('.portada-ligera__recientes ul');
            const antes = await carrusel.evaluate((e) => e.scrollLeft);
            await carrusel.evaluate((e) => e.scrollBy({ left: e.clientWidth, behavior: 'instant' }));
            expect(await carrusel.evaluate((e) => e.scrollLeft)).toBeGreaterThan(antes);
        }
        await page.goto('/catalogo');
        await expect(page.locator('.rejilla-libros--todos .tarjeta-libro')).toHaveCount(24);
        await revisarTarjetas(page);
        if (width <= 640) {
            const estante = page.locator('.catalogo-estante .rejilla-libros').first();
            expect(await estante.evaluate((e) => e.firstElementChild.getBoundingClientRect().width > e.clientWidth * 0.4)).toBe(true);
            const filas = await page.locator('.rejilla-libros--todos .tarjeta-libro').evaluateAll((es) => es.slice(0, 3).map((e) => e.getBoundingClientRect().top));
            expect(filas[0]).toBeCloseTo(filas[1], 0);
            expect(filas[2]).toBeGreaterThan(filas[1]);
        }
        if ([320, 768, 1440].includes(width)) await page.screenshot({ path: test.info().outputPath('catalogo.png'), fullPage: true });
        await page
            .locator('.rejilla-libros--todos .tarjeta-libro')
            .first()
            .getByRole('button', { name: /Agregar/ })
            .click();
        await page.goto('/carrito');
        await expect(page.locator('main')).toContainText('Cien años de soledad');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        for (const ruta of ['/aplicacion', '/descargar', '/cuenta']) {
            await page.goto(ruta);
            await expect(page.locator('main h1')).toBeVisible();
            await revisarTarjetas(page);
            if ([320, 768, 1440].includes(width)) await page.screenshot({ path: test.info().outputPath(`${ruta.slice(1)}.png`), fullPage: true });
        }
        if (width < 1024) {
            await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
            await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible();
            await page.keyboard.press('Escape');
        }
        expect(errores).toEqual([]);
    });
}
