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
    const fallos = await page.locator('.tarjeta-libro, .libro, .oferta-tarjeta, .categoria-tarjeta').evaluateAll((tarjetas) => {
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
                if (tarjeta.matches('.oferta-tarjeta')) {
                    const boton = acciones.querySelector('.boton--compra'),
                        detalle = acciones.querySelector('a.compra-libro__detalle, a.boton--linea');
                    if (boton && detalle) {
                        const b = boton.getBoundingClientRect(),
                            d = detalle.getBoundingClientRect(),
                            apilado = d.top >= b.bottom - 1,
                            espacio = apilado ? d.top - b.bottom : d.left - b.right;
                        if (espacio < -1 || espacio > 9) errores.push('oferta: carrito y detalle deben permanecer juntos');
                        const datos = tarjeta.querySelector('.oferta-tarjeta__datos').getBoundingClientRect();
                        if (Math.abs(b.left - d.left) > 1 || Math.abs(b.width - d.width) > 1) errores.push('oferta: botones desalineados entre sí');
                        if (Math.abs(b.left - datos.left) > 1 || Math.abs(b.width - datos.width * 0.8) > 1) errores.push('oferta: conservar el borde izquierdo y recortar solo la derecha');
                        if (Math.abs(b.height - d.height) > 1 || b.height < 44 || d.height < 44) errores.push('oferta: conservar la altura de los botones');
                        for (const accion of [boton, detalle]) {
                            if (!accion.textContent.trim() || accion.scrollWidth > accion.clientWidth + 1) errores.push('oferta: texto de acción oculto o desbordado');
                        }
                        const referencia = document.querySelector('.libro .boton--compra, .tarjeta-libro .boton--compra');
                        if (referencia) {
                            const actual = getComputedStyle(boton),
                                compartido = getComputedStyle(referencia);
                            for (const propiedad of ['borderRadius', 'backgroundColor', 'color', 'minHeight']) {
                                if (actual[propiedad] !== compartido[propiedad]) errores.push(`oferta: estilo de carrito distinto en ${propiedad}`);
                            }
                        }
                    }
                }
            }
        }
        return errores;
    });
    expect(fallos).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test.use({ reducedMotion: 'reduce' });
for (const width of [390, 1440]) {
    test(`Ver detalle ${width}px: hover verde y pulsación verde oscuro con texto blanco, Agregar negro con hover naranja`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await preparar(page);
        await page.goto('/');
        const revisar = async selector => {
            const grupo = page.locator(selector).first().locator('.compra-libro');
            const detalle = grupo.getByRole('link', { name: /^Ver detalle de / });
            const agregar = grupo.getByRole('button', { name: /^Agregar / });
            await page.mouse.move(0, 0);
            await expect(detalle).toHaveCSS('background-color', 'rgb(255, 255, 255)');
            await expect(detalle).toHaveCSS('color', 'rgb(20, 18, 18)');
            await detalle.hover();
            await expect(detalle).toHaveCSS('background-color', 'rgb(0, 77, 67)');
            await expect(detalle).toHaveCSS('color', 'rgb(255, 255, 255)');
            await expect(detalle.locator('svg')).toHaveCSS('color', 'rgb(255, 255, 255)');
            await detalle.focus();
            await expect(detalle).toHaveCSS('background-color', 'rgb(0, 77, 67)');
            await expect(detalle).toHaveCSS('color', 'rgb(255, 255, 255)');
            await page.mouse.down();
            await expect(detalle).toHaveCSS('background-color', 'rgb(1, 58, 51)');
            await expect(detalle).toHaveCSS('color', 'rgb(255, 255, 255)');
            await page.mouse.move(0, 0);
            await page.mouse.up();
            await expect(agregar).toHaveCSS('background-color', 'rgb(20, 18, 18)');
            await agregar.hover();
            await expect(agregar).toHaveCSS('background-color', 'rgb(217, 95, 31)');
        };
        await revisar('.catalogo .libro');
        await revisar('.ofertas .oferta-tarjeta');
        await page.goto('/catalogo');
        await revisar('.catalogo-resultados .tarjeta-libro');
    });
}

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
        if ([390, 1440].includes(width)) await page.locator('.ofertas .contenedor').screenshot({ path: test.info().outputPath(`ofertas-${width}.png`) });
        await revisarTarjetas(page);
        if ([390, 1440].includes(width)) {
            await page
                .locator('.oferta-tarjeta')
                .first()
                .getByRole('link', { name: `Ver detalle de ${libros[0].titulo}`, exact: true })
                .click();
            await expect(page).toHaveURL(/\/libro\/1$/);
            await page.goto('/');
            await page
                .locator('.oferta-tarjeta')
                .first()
                .getByRole('button', { name: `Agregar ${libros[0].titulo} al carrito`, exact: true })
                .click();
            const carrito = page.locator('.compra-carrito');
            await expect(carrito).toHaveAttribute('aria-label', 'Carrito (1)');
            await expect(carrito).not.toHaveAttribute('data-cantidad');
            expect(await carrito.evaluate((el) => getComputedStyle(el, '::after').content)).toBe('none');
        }
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
            const carrusel = page.locator('.portada3d__carrusel-pista');
            const reciente = await carrusel.locator('.portada3d__carrusel-link').first().boundingBox();
            expect(reciente.width).toBeLessThanOrEqual(width / 2);
            await expect(carrusel.locator('.portada3d__carrusel-item').first()).toHaveCSS('animation-name', 'none');
            await expect(carrusel.locator('.portada3d__carrusel-item')).toHaveCount(16);
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
        await expect(page.locator('.compra-carrito')).toHaveAttribute('aria-label', /Carrito \([1-9]\d*\)/);
        await page.goto('/carrito');
        await expect(page.locator('main')).toContainText('Cien años de soledad');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        for (const ruta of ['/descargar', '/cuenta']) {
            await page.goto(ruta);
            await expect(page.locator('main h1')).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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

test('390px: enlaces secundarios y footer alcanzan 44px sin desbordar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await preparar(page);
    const revisar = async (selectores) => {
        for (const selector of selectores) {
            const alturas = await page.locator(selector).evaluateAll((elementos) =>
                elementos
                    .filter((el) => el.getClientRects().length)
                    .map((el) => ({ texto: (el.textContent || '').trim().slice(0, 40), alto: Math.round(el.getBoundingClientRect().height) }))
            );
            expect(alturas.length, selector).toBeGreaterThan(0);
            expect(alturas.filter((x) => x.alto < 44), selector).toEqual([]);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await page.goto('/');
    await page.locator('.navegacion-publica .cabecera .buscador input:visible').first().waitFor();
    await page.locator('.enlace-mas:visible').first().waitFor();
    await page.locator('.categorias__todas:visible').first().waitFor();
    await revisar(['.navegacion-publica .cabecera .buscador input', '.enlace-mas', '.categorias__todas', 'footer.pie .pie__rejilla ul a', 'footer.pie .pie__reclamaciones', 'footer.pie .marca']);
    await page.goto('/catalogo');
    await page.locator('.migas a:visible').first().waitFor();
    await revisar(['.migas a', 'footer.pie .pie__rejilla ul a']);
});
