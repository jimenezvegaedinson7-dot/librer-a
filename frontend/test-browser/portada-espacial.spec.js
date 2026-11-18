import { test, expect } from '@playwright/test';

const erroresGraficos = new WeakMap();
test.beforeEach(({ page }) => {
    const errores = [];
    erroresGraficos.set(page, errores);
    page.on('console', (m) => {
        if (m.type() === 'error' && /WebGLProgram|Shader Error|VALIDATE_STATUS|GL_INVALID/.test(m.text())) errores.push(m.text());
    });
});
test.afterEach(({ page }) => expect(erroresGraficos.get(page) || []).toEqual([]));

const API = 'http://127.0.0.1:59999/api';
const PORTADA = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const LIBRO = {
    id_libro: 7,
    titulo: 'El principito',
    autor: 'Antoine de Saint-Exupéry',
    categoria: 'Infantil',
    descripcion: 'Un piloto conoce a un pequeño príncipe.',
    portada: PORTADA,
    precio: '40.00',
    precio_final: '30.00',
    descuento_vigente: 1,
    descuento_porcentaje_efectivo: 25,
    stock: 4,
    estado: 1
};

const hayWebGL2 = (page) =>
    page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return Boolean(gl);
    });

async function api(page, protagonista = { modo: 'automatico', libro: LIBRO }, libros = [LIBRO]) {
    const goto = page.goto.bind(page),
        reload = page.reload.bind(page);
    page.goto = (url, options) => goto(url, { waitUntil: 'domcontentloaded', ...options });
    page.reload = (options) => reload({ waitUntil: 'domcontentloaded', ...options });
    await page.route(`${API}/**`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.route(`${API}/libros`, (r) => r.fulfill({ json: libros }));
    await page.route(`${API}/libros/7`, (r) => r.fulfill({ json: { success: true, data: LIBRO } }));
    await page.route(`${API}/empresa`, (r) => r.fulfill({ json: { success: true, empresa: {} } }));
    await page.route(`${API}/anuncios`, (r) => r.fulfill({ json: { success: true, anuncio: null } }));
    await page.route(`${API}/anuncios/carrusel`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ json: { success: true, data: protagonista } }));
}

test('con movimiento reducido muestra la portada estática con el libro real y su precio con descuento', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await api(page);
    await page.goto('/');
    const portada = page.locator('.portada3d--estatica');
    await expect(portada).toBeVisible({ timeout: 30000 });
    await expect(portada.locator('.portada-mapa__identidad').getByRole('heading', { name: 'El principito' })).toBeVisible();
    await expect(portada.locator('.portada-mapa__autor').getByText('Antoine de Saint-Exupéry')).toBeVisible();
    await expect(portada.locator('.portada3d__ficha .oferta__final')).toHaveText('S/ 30.00');
    await expect(page.locator('.navegacion-publica')).toHaveCSS('display', 'contents');
    await expect(portada.getByRole('link', { name: /Ver este libro/ })).toHaveAttribute('href', '/libro/7');
    await expect(page.locator('.portada3d canvas')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Libros y anuncios de MATIDANA Libros y Cultura');

    await expect(page.getByRole('region', { name: 'Anuncios de la librería' })).toHaveCount(0);
    const ultimos = portada.locator('.portada3d__ultimos');
    await expect(ultimos.getByText('Últimos libros agregados')).toBeVisible();
    await expect(ultimos.getByRole('link').first()).toHaveAttribute('href', '/libro/7');
    expect(errores).toEqual([]);
});

for (const [width, height] of [[390, 844], [1024, 768], [1440, 1000]]) {
    test(`mapa del libro ${width}px: autor, título, categoría, precio y descripción conectados sin solaparse`, async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width, height });
        await api(page);
        await page.goto('/');
        await expect(page.locator('.portada3d svg[data-icon^="arrow"]')).toHaveCount(0);
        const presentacion = page.locator('.portada-mapa');
        await expect(presentacion.locator('.portada3d__libro-titulo')).toHaveText(LIBRO.titulo);
        await expect(presentacion.locator('.portada-mapa__autor .portada3d__autor')).toHaveText(LIBRO.autor);
        await expect(presentacion.locator('.portada-mapa__categoria strong')).toHaveText(LIBRO.categoria);
        await expect(presentacion.locator('.portada-mapa__descripcion')).toBeVisible();
        await expect(presentacion.locator('.portada-mapa__descripcion')).toHaveText(LIBRO.descripcion);
        const tamano = selector => presentacion.locator(selector).first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
        expect(await tamano('.portada-mapa__descripcion')).toBeGreaterThanOrEqual(width > 900 ? 15 : 14);
        expect(await tamano('.portada-mapa__etiqueta')).toBeGreaterThanOrEqual(13);
        expect(await tamano('.portada-mapa__valor')).toBeGreaterThanOrEqual(15);
        expect(await tamano('.portada3d__boton')).toBeGreaterThanOrEqual(15);
        await expect(presentacion.locator('.oferta__final')).toHaveText('S/ 30.00');
        await expect(page.locator('.portada3d--lista, .portada3d--estatica')).toBeVisible({ timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        const portada = await page.locator('.portada-unica__cubierta').boundingBox();
        const escenario = await page.locator('.portada3d__escenario').boundingBox();
        const autor = await presentacion.locator('.portada-mapa__autor').boundingBox();
        const identidad = await presentacion.locator('.portada-mapa__identidad').boundingBox();
        const lectura = await presentacion.locator('.portada-mapa__lectura').boundingBox();
        expect(Math.abs(portada.x + portada.width / 2 - escenario.x - escenario.width / 2)).toBeLessThan(escenario.width * 0.03);
        if (width > 900) {
            expect(identidad.x + identidad.width).toBeLessThan(portada.x);
            expect(autor.x + autor.width).toBeLessThan(portada.x);
            expect(autor.y + autor.height).toBeLessThan(identidad.y);
            expect(lectura.x).toBeGreaterThan(portada.x + portada.width);
        } else {
            expect(autor.y + autor.height).toBeLessThanOrEqual(identidad.y);
            expect(identidad.y + identidad.height).toBeLessThan(portada.y);
            expect(lectura.y).toBeGreaterThan(portada.y + portada.height);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await presentacion.getByRole('link', { name: 'Ver este libro', exact: true }).click();
        await expect(page).toHaveURL(/\/libro\/7$/);
    });
}

for (const reducido of [false, true]) {
    test(`conexiones del libro a 1920px ${reducido ? 'con movimiento reducido' : 'con 3D'} no tocan los datos`, async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: 1920, height: 1080 });
        if (reducido) await page.emulateMedia({ reducedMotion: 'reduce' });
        await api(page);
        await page.goto('/');
        await expect(page.locator('.portada3d--lista, .portada3d--estatica')).toBeVisible({ timeout: 30000 });
        await expect(page.locator('[data-rama="autor"]')).toHaveCount(0);
        const derecha = page.locator('.portada-mapa__trazos [data-rama="titulo"]');
        await expect.poll(() => derecha.getAttribute('d')).not.toBe('M210 325H238');
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        const colisiones = await page.evaluate(() => {
            const recta = (elemento) => {
                const r = elemento.getBoundingClientRect();
                return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
            };
            const bloques = {
                autor: document.querySelector('.portada-mapa__autor'),
                identidad: document.querySelector('.portada-mapa__identidad'),
                lectura: document.querySelector('.portada-mapa__lectura')
            };
            const encontradas = [];
            for (const rama of document.querySelectorAll('.portada-mapa__trazos path')) {
                const longitud = rama.getTotalLength();
                for (let i = 0; i <= 100; i++) {
                    const punto = rama.getPointAtLength((longitud * i) / 100);
                    const pantalla = new DOMPoint(punto.x, punto.y).matrixTransform(rama.getScreenCTM());
                    for (const [nombre, elemento] of Object.entries(bloques)) {
                        const b = recta(elemento);
                        if (pantalla.x >= b.x - 6 && pantalla.x <= b.right + 6 && pantalla.y >= b.y - 6 && pantalla.y <= b.bottom + 6) {
                            encontradas.push(`${rama.getAttribute('data-rama')}:${nombre}`);
                        }
                    }
                }
            }
            return [...new Set(encontradas)];
        });
        expect(colisiones).toEqual([]);
    });
}

test('la sinopsis de portada no repite el título ni la fuente verificada', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const libro = { ...LIBRO, descripcion: 'Edición en español de «El principito» publicada por Debolsillo en 2003 (372 páginas). Datos bibliográficos verificados en Open Library.' };
    await api(page, { libro }, [libro]);
    await page.goto('/');
    await expect(page.locator('.portada-mapa__descripcion')).toHaveText('Debolsillo · 2003 · 372 páginas');
    await expect(page.locator('.portada-mapa__valor')).toHaveText('Debolsillo · 2003 · 372 páginas');
});

test('mapa reducido en teléfono pequeño admite textos largos y no inventa datos ausentes', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 667 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const largo = { ...LIBRO, titulo: 'Las historias extraordinarias que se esconden entre las páginas de una biblioteca', autor: 'María del Carmen Fernández de los Ríos', descripcion: 'Una descripción extensa del libro que debe seguir siendo legible y conservar el acceso a su ficha. '.repeat(5) };
    await api(page, { libro: largo });
    await page.goto('/');
    await expect(page.locator('.portada-mapa__identidad h2')).toHaveText(largo.titulo);
    const tamanos = await page.evaluate(() => {
        const medir = selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
        return {
            descripcion: medir('.portada-mapa__descripcion'),
            valor: medir('.portada-mapa__valor'),
            boton: medir('.portada3d__boton'),
            autor: medir('.portada3d__autor')
        };
    });
    expect(tamanos.descripcion).toBeGreaterThanOrEqual(14);
    expect(tamanos.valor).toBeGreaterThanOrEqual(15);
    expect(tamanos.boton).toBeGreaterThanOrEqual(15);
    expect(tamanos.autor).toBeGreaterThanOrEqual(17);
    const libro = await page.locator('.portada-unica__cubierta').boundingBox();
    const titulo = await page.locator('.portada-mapa__identidad').boundingBox();
    const lectura = await page.locator('.portada-mapa__lectura').boundingBox();
    expect(titulo.y + titulo.height).toBeLessThan(libro.y);
    expect(lectura.y).toBeGreaterThan(libro.y + libro.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.route(`${API}/anuncios/protagonista`, r => r.fulfill({ json: { success: true, data: { libro: { ...LIBRO, autor: '', categoria: '', descripcion: '' } } } }));
    await page.reload();
    await expect(page.locator('.portada-mapa__identidad h2')).toHaveText(LIBRO.titulo);
    await expect(page.locator('.portada-mapa__categoria, .portada-mapa__descripcion, .portada-mapa__autor p')).toHaveCount(0);
    await expect(page.locator('.portada-mapa').getByRole('link', { name: 'Ver este libro', exact: true })).toHaveAttribute('href', '/libro/7');
});

test('cabecera comercial: controles legibles, fuente local y colores coherentes al navegar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await api(page);
    await page.goto('/');
    const boton = page.locator('.portada3d__ficha .portada3d__boton');
    await expect(boton).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.cabecera')).toHaveCSS('background-color', 'rgb(19, 25, 33)');
    const lectura = await boton.evaluate(async (e) => {
        await document.fonts.load('400 32px "Serif Editorial"');
        const s = getComputedStyle(e);
        const luminancia = (c) => {
            const rgb = c
                .match(/[\d.]+/g)
                .slice(0, 3)
                .map((v) => {
                    const x = Number(v) / 255;
                    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
                });
            return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const contraste = (a, b) => {
            const x = luminancia(a),
                y = luminancia(b);
            return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        };
        const nav = document.querySelector('.barra-movil a[aria-current=page]'),
            icono = nav.querySelector('svg');
        const cab = document.querySelector('.cabecera'),
            marca = cab.querySelector('.marca span'),
            buscador = cab.querySelector('.buscador'),
            campo = buscador.querySelector('input');
        const fondos = s.backgroundImage.match(/rgba?\([^)]+\)/g) || [s.backgroundColor];
        return {
            radio: s.borderRadius,
            contraste: Math.min(...fondos.map(fondo => contraste(s.color, fondo))),
            nav: contraste(getComputedStyle(icono).color, getComputedStyle(nav).backgroundColor),
            marca: contraste(getComputedStyle(marca).color, getComputedStyle(cab).backgroundColor),
            placeholder: contraste(getComputedStyle(campo, '::placeholder').color, getComputedStyle(buscador).backgroundColor),
            fuente: document.fonts.check('400 32px "Serif Editorial"')
        };
    });
    expect(lectura.radio).toBe('2px');
    expect(lectura.contraste).toBeGreaterThanOrEqual(4.5);
    expect(lectura.nav).toBeGreaterThanOrEqual(4.5);
    expect(lectura.marca).toBeGreaterThanOrEqual(4.5);
    expect(lectura.placeholder).toBeGreaterThanOrEqual(4.5);
    expect(lectura.fuente).toBe(true);
    await page.goto('/catalogo');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Catálogo');
    await expect(page.locator('.cabecera')).toHaveCSS('background-color', 'rgb(19, 25, 33)');
});

for (const ancho of [390, 1440])
    test(`cabecera siempre visible ${ancho}px: identidad y compra usables desde el primer cuadro`, async ({ page }) => {
        test.setTimeout(45000);
        await page.setViewportSize({ width: ancho, height: 1000 });
        await api(page);
        await page.goto('/');
        test.skip(!(await hayWebGL2(page)), 'La presentación a pantalla completa requiere WebGL 2');
        await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
        await page.locator('#precarga').waitFor({ state: 'detached', timeout: 30000 });
        const nav = page.locator('.navegacion-publica'),
            escenario = page.locator('.portada3d__escenario');

        await expect(nav).toHaveCSS('opacity', '1');
        await expect(nav).toHaveCSS('pointer-events', 'auto');
        await expect(page.locator('.portada3d__presentacion .portada3d__acceso')).toBeVisible();
        const inicial = await escenario.boundingBox();
        expect(inicial.y).toBeGreaterThanOrEqual(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`cabecera-visible-${ancho}.png`) });

        await page.evaluate(() => scrollTo(0, 180));
        await expect(escenario).toBeVisible();
        expect((await escenario.boundingBox()).height).toBeCloseTo(inicial.height, 0);
        await page.evaluate(() => scrollTo(0, 0));
        await expect(nav).toHaveCSS('opacity', '1');
        if (ancho < 1024) {
            await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
            const dialogo = page.getByRole('dialog', { name: 'Menú', exact: true });
            await expect(dialogo).toBeVisible();
            await dialogo.getByRole('link', { name: 'Catálogo', exact: true }).click();
        } else await nav.getByRole('link', { name: 'Catálogo', exact: true }).click();
        await expect(page).toHaveURL(/\/catalogo$/);
        await expect(page.locator('.catalogo, .portada-catalogo').first()).toBeVisible({ timeout: 30000 });

        await expect(nav).toHaveCSS('opacity', '1');
        await expect(nav).toHaveCSS('pointer-events', 'auto');
        await expect(page.locator('.cabecera')).toBeVisible();
    });

test('la identidad y la compra siguen legibles tras bajar y volver arriba', async ({ page }) => {
    await api(page);
    await page.goto('/');
    test.skip(!(await hayWebGL2(page)), 'Sin WebGL no hay escena 3D');
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await page.locator('#precarga').waitFor({ state: 'detached', timeout: 30000 });
    const nav = page.locator('.navegacion-publica');
    await expect(nav).toHaveCSS('opacity', '1');
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect(nav).toHaveCSS('opacity', '1');
    await expect(nav).toHaveCSS('pointer-events', 'auto');
    await page.evaluate(() => scrollTo(0, 0));
    await expect(nav).toHaveCSS('opacity', '1');
    await expect(page.locator('.portada3d__presentacion .portada3d__acceso')).toBeVisible();
});

test('la navegación es alcanzable con teclado desde el primer cuadro', async ({ page }) => {
    await api(page);
    await page.goto('/');
    test.skip(!(await hayWebGL2(page)), 'Sin WebGL se mantiene la cabecera normal');
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await page.locator('#precarga').waitFor({ state: 'detached', timeout: 30000 });
    const nav = page.locator('.navegacion-publica');
    await expect(nav).toHaveCSS('opacity', '1');
    await page.keyboard.press('Tab');
    await expect(page.locator('.saltar')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement.closest('.navegacion-publica')))).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('la cabecera comienza en el borde superior, sin franja de avisos', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await api(page);
    await page.goto('/');
    await expect(page.locator('.cabecera')).toBeVisible();
    await expect(page.locator('.avisos')).toHaveCount(0);
    expect((await page.locator('.cabecera').boundingBox()).y).toBe(0);
});

for (const ancho of [320, 390, 1024, 1440])
    test(`márgenes comerciales ${ancho}px: cabecera alineada sin desbordes`, async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await api(page);
        await page.goto('/');
        await expect(page.locator('.cabecera__principal .marca')).toBeVisible({ timeout: 30000 });
        const caja = await page.locator('.cabecera__principal').boundingBox();
        expect(caja.x).toBeGreaterThanOrEqual(15);
        expect(caja.x).toBeCloseTo(ancho - caja.x - caja.width, 0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const pie = page.locator('.pie');
        await pie.scrollIntoViewIfNeeded();
        await expect(pie).toHaveCSS('background-color', 'rgb(5, 5, 6)');
        await expect(pie.getByRole('link', { name: 'Ingresar a mi cuenta', exact: true })).toHaveAttribute('href', '/cuenta');
        await expect(pie.getByRole('link', { name: 'Libro de Reclamaciones', exact: true })).toHaveAttribute('href', '/libro-de-reclamaciones');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

for (const [width, height] of [
    [320, 667],
    [390, 844],
    [768, 1024],
    [1440, 1000]
]) {
    test(`escena y últimos cinco libros usables a ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        const errores = [];
        page.on('pageerror', (e) => errores.push(e.message));
        const libros = Array.from({ length: 6 }, (_, i) => ({
            ...LIBRO,
            id_libro: i + 1,
            titulo: `Libro de prueba ${i + 1}`,
            creado_en: i < 2 ? '2025-01-01T00:00:00Z' : '2026-01-01T00:00:00Z'
        }));
        await api(page, { modo: 'manual', libro: LIBRO }, libros);
        await page.goto('/');
        await expect(page.locator('.portada3d--lista, .portada3d--estatica .portada3d__ficha')).toBeVisible({ timeout: 30000 });
        const compra = (await page.locator('.portada3d--lista').count()) ? page.locator('.portada3d__acceso') : page.locator('.portada3d__ficha');
        await expect(compra.getByRole('link', { name: /Ver este libro/ })).toBeVisible();

        await compra.getByRole('link', { name: /Ver este libro/ }).click({ trial: true });
        const recientes = page.getByRole('region', { name: 'Últimos libros agregados', exact: true });

        if (await page.locator('.portada3d--3d').count()) {
            await page.evaluate(() => {
                const s = document.querySelector('.portada3d--3d');
                scrollTo(0, s.offsetTop + s.offsetHeight - innerHeight);
            });
            await expect(recientes.locator('.portada3d__apilar-item').last()).toHaveCSS('opacity', '1');
        } else await recientes.scrollIntoViewIfNeeded();
        await expect(recientes.getByRole('link')).toHaveCount(5);
        const ids = await recientes.getByRole('link').evaluateAll((links) => links.map((l) => l.getAttribute('href')));

        expect(new Set(ids)).toEqual(
            (await page.locator('.portada3d--3d').count())
                ? new Set(['/libro/7', '/libro/6', '/libro/5', '/libro/4', '/libro/3'])
                : new Set(['/libro/6', '/libro/5', '/libro/4', '/libro/3', '/libro/2'])
        );
        if (width > 900) {
            await expect(recientes.locator('.portada3d__apilar')).toHaveAttribute('data-final', 'true');
            await expect(recientes.locator('.portada3d__apilar-item').nth(2).locator('a')).toHaveAttribute('href', '/libro/7');
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(errores).toEqual([]);
    });
}

test('pérdida de WebGL o cambio a movimiento reducido retira el canvas y conserva la compra', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await api(page);
    await page.goto('/');
    test.skip(!(await hayWebGL2(page)), 'Este motor no dispone de WebGL 2; se verifica el respaldo estático en las otras pruebas');
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await page.locator('.portada3d canvas').evaluate((c) => c.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    await expect(page.locator('.portada3d--estatica')).toBeVisible();
    await expect(page.locator('.portada3d canvas')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.portada3d--estatica')).toBeVisible();
    await expect(page.locator('.portada3d canvas')).toHaveCount(0);
    await page.getByRole('link', { name: /Ver este libro/ }).click();
    await expect(page).toHaveURL(/\/libro\/7$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('El principito');
    expect(errores).toEqual([]);
});

test('si el motor 3D no avanza, cae a los últimos libros agregados', async ({ page }) => {
    test.setTimeout(45000);
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (tipo, ...args) {
            if (tipo === 'webgl2') return { getExtension: () => null };
            return original.call(this, tipo, ...args);
        };
    });
    let abortar;
    await page.route('**/escenaLibro*', (r) => new Promise((resolve) => { abortar = () => { r.abort(); resolve(); }; }));
    await api(page);
    try {
        await page.goto('/');
        await expect(page.locator('.portada3d--respaldo')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('.portada3d canvas')).toHaveCount(0);
        const ultimos = page.locator('.portada3d--estatica .portada3d__ultimos');
        await expect(ultimos.getByText('Últimos libros agregados')).toBeVisible();
        await expect(ultimos.getByRole('link').first()).toHaveAttribute('href', '/libro/7');
        await expect(page.getByRole('button', { name: 'Reintentar 3D' })).toBeVisible();
    } finally {
        abortar?.();
    }
    expect(errores).toEqual([]);
});

test('sin WebGL ni altura suficiente no descarga el motor 3D ni oculta el contenido', async ({ page }) => {
    const recursos = [];
    page.on('request', (r) => recursos.push(r.url()));
    await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (tipo, ...args) {
            return /^webgl/.test(tipo) ? null : original.call(this, tipo, ...args);
        };
    });
    await page.setViewportSize({ width: 844, height: 390 });
    await api(page);
    await page.goto('/');
    await expect(page.locator('.portada3d--estatica')).toBeVisible();
    expect(recursos.some((url) => url.includes('escenaLibro'))).toBe(false);
    await expect(page.getByRole('link', { name: /Ver este libro/ })).toBeVisible();
    await page.getByRole('link', { name: /Ver este libro/ }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: /Ver este libro/ })).toBeInViewport();
});

test('la portada rota degrada a una ficha sin imagen y un fallo de red se puede reintentar', async ({ page }) => {
    const roto = { ...LIBRO, portada: `${API}/portada-rota.png` };

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await api(page, { modo: 'manual', libro: roto });
    await page.route(`${API}/portada-rota.png`, (r) => r.fulfill({ status: 404 }));
    await page.goto('/');
    await expect(page.locator('.portada3d--estatica')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Portada no disponible', { exact: true })).toBeVisible();
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ status: 503, json: {} }));
    await page.reload();
    await expect(page.getByRole('button', { name: /^reintentar$/i })).toBeVisible({ timeout: 30000 });
    await page.route(`${API}/anuncios/protagonista`, (r) =>
        r.fulfill({ json: { success: true, data: { modo: 'automatico', libro: { ...LIBRO, portada: `${API}/portada-ok.png` } } } })
    );
    await page.route(`${API}/portada-ok.png`, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('') }));
    await page.getByRole('button', { name: /^reintentar$/i }).click();
    await expect(page.locator('.portada3d--estatica .portada3d__ficha')).toBeVisible({ timeout: 30000 });
});

test('la portada no ofrece sonido ni crea AudioContext', async ({ page }) => {
    test.setTimeout(60000);
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await page.addInitScript(() => {
        window.__audioPortada = [];
        const Contexto = window.AudioContext;
        if (!Contexto) return;
        window.AudioContext = new Proxy(Contexto, {
            construct(Target, args) {
                const ctx = new Target(...args);
                window.__audioPortada.push(ctx);
                return ctx;
            }
        });
    });
    await api(page);
    await page.goto('/');
    test.skip(!(await hayWebGL2(page)), 'La escena requiere WebGL 2');
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
    expect(await page.evaluate(() => window.__audioPortada.length)).toBe(0);

    await page.locator('.portada3d a[href="/libro/7"]').first().click();
    await expect(page).toHaveURL(/\/libro\/7$/);

    await expect(page.locator('.portada3d')).toHaveCount(0, { timeout: 30000 });
    expect(await page.evaluate(() => window.__audioPortada.length)).toBe(0);
    await page.goto('/');
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
    expect(await page.evaluate(() => window.__audioPortada.length)).toBe(0);
    expect(errores).toEqual([]);
});

test('sin libros elegibles no inventa un libro: portada sin libro con acceso al catálogo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await api(page, { modo: 'ninguno', libro: null });
    await page.goto('/');
    const portada = page.locator('.portada3d--estatica');
    await expect(portada).toBeVisible({ timeout: 30000 });
    await expect(portada.locator('.portada3d__libro-titulo')).toHaveText('');
    await expect(portada.locator('.portada3d__libro-titulo')).toHaveAttribute('aria-hidden', 'true');
    await expect(portada.locator('.portada-unica__poster')).toHaveCount(0);
    await expect(portada.getByRole('link', { name: /Ver catálogo/ })).toHaveAttribute('href', '/catalogo');
});

test('si la API de la portada falla, la página sigue usable', async ({ page }) => {
    await api(page);
    await page.unroute(`${API}/anuncios/protagonista`);
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ status: 503, json: { success: false } }));
    await page.goto('/');
    await expect(page.locator('.portada3d--estatica')).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Libros y anuncios de MATIDANA Libros y Cultura');
});

test('escena 3D: avanza y retrocede con el scroll sin controles de sonido', async ({ page, browserName }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await api(page);
    await page.goto('/');
    const webgl = await hayWebGL2(page);
    test.skip(!webgl, `Sin WebGL en ${browserName}: se cubre con la versión estática`);
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
    const { top, h, vh } = await page.evaluate(() => {
        const s = document.querySelector('.portada3d');
        return { top: s.offsetTop, h: s.offsetHeight, vh: innerHeight };
    });
    const ficha = page.locator('.portada3d__ficha--flotante');
    await expect(page.locator('.portada-mapa__lectura')).toBeVisible();
    await expect(ficha).toBeHidden();

    await page.evaluate((y) => window.scrollTo(0, y), top + (h - vh) * 0.32);
    await expect.poll(() => page.locator('.portada3d').evaluate(el => Number(getComputedStyle(el).getPropertyValue('--recorrido')))).toBeGreaterThan(0.2);
    await expect(ficha).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.locator('.portada3d').evaluate(el => Number(getComputedStyle(el).getPropertyValue('--recorrido')))).toBeLessThan(0.05);
    await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errores).toEqual([]);
});

for (const width of [390, 1440]) {
    test(`atelier nocturno ${width}px: fondo continuo, libro sólido y relevo alineado a novedades`, async ({ page }) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: 1000 });
        const libros = Array.from({ length: 6 }, (_, i) => ({ ...LIBRO, id_libro: i + 1, creado_en: '2026-11-01' }));
        await api(page, { libro: LIBRO }, libros);
        await page.goto('/');
        test.skip(!(await hayWebGL2(page)), 'Se comprueba el respaldo en las pruebas de movimiento reducido');
        await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
        await page.evaluate(async () => {
            const { default: Escena } = await import('/src/components/web/secciones/portada3d/escenaLibro.js');
            const original = Escena.prototype.dibujar;
            Escena.prototype.dibujar = function () {
                const estado = original.call(this);
                if (estado) {
                    const { T } = this.medidas;
                    const punto = this.libro.position.clone().set(0, 0, T / 2 + 0.0005).applyMatrix4(this.libro.matrixWorld).project(this.camara);
                    window.__acabadoLibro = {
                        alfa: this.renderer.getContext().getContextAttributes().alpha,
                        fondoTransparente: this.escena.background === null,
                        solido: this.matsLibro.every(m => !m.transparent && m.opacity === 1 && m.depthWrite),
                        centro: { x: (punto.x * 0.5 + 0.5) * this.ancho, y: (-punto.y * 0.5 + 0.5) * this.alto }
                    };
                }
                return estado;
            };
        });
        const escenario = page.locator('.portada3d__escenario');
        const fondo = await escenario.evaluate(el => getComputedStyle(el).backgroundImage);
        expect(fondo).toMatch(/atelier-libros|data:image\/svg\+xml/);
        for (const p of [0, 0.6, 0.8, 0.83, 0.96, 0.6, 0]) {
            await page.evaluate(p => {
                const s = document.querySelector('.portada3d');
                scrollTo(0, s.getBoundingClientRect().top + scrollY + (s.offsetHeight - innerHeight) * p);
            }, p);
            await expect.poll(() => page.locator('.portada3d').evaluate(el => Number(getComputedStyle(el).getPropertyValue('--recorrido')))).toBeCloseTo(p, 3);
            await expect(escenario).toHaveCSS('background-color', 'rgb(13, 24, 35)');
            expect(await escenario.evaluate(el => getComputedStyle(el).backgroundImage)).toBe(fondo);
            const acabado = await page.evaluate(() => window.__acabadoLibro);
            expect(acabado.alfa && acabado.fondoTransparente && acabado.solido).toBe(true);
            if (p === 0.83) {
                const centro = await page.locator('.portada3d__apilar-item--central .portada3d__apilar-tapa').evaluate(el => {
                    const caja = el.getBoundingClientRect(), marco = el.closest('.portada3d__escenario').getBoundingClientRect();
                    return { x: caja.left - marco.left + caja.width / 2, y: caja.top - marco.top + caja.height / 2 };
                });
                expect(Math.abs(centro.x - acabado.centro.x)).toBeLessThan(2);
                expect(Math.abs(centro.y - acabado.centro.y)).toBeLessThan(2);
            }
        }
    });
}

for (const ancho of [390, 1440])
    test(`libro cerrado ${ancho}px: tapa y hojas inmóviles, con transición reversible`, async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: ancho, height: 1000 });
        await page.addInitScript(() => performance.setResourceTimingBufferSize(3000));
        await api(page);
        await page.goto('/');
        test.skip(!(await hayWebGL2(page)), 'La coordinación 3D se prueba cuando existe WebGL 2');
        await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });

        await page.evaluate(async () => {
            const recurso = (nombre) =>
                performance
                    .getEntriesByType('resource')
                    .map((r) => r.name)
                    .filter((url) => url.includes('/' + nombre))
                    .at(-1);
            const { default: Escena } = await import(recurso('escenaLibro.js'));
            window.__coordinacion = [];
            const dibujar = Escena.prototype.dibujar;
            Escena.prototype.dibujar = function (...args) {
                const r = dibujar.apply(this, args);
                if (r)
                    window.__coordinacion.push({
                        p: r.p,
                        tapa: this.bisagra.rotation.y,
                        hojas: this.hojas.map((h) => h.rotation.y),
                        bloque: this.bloque.scale.z,
                        disolucion: r.disolucion
                    });
                return r;
            };
        });
        const ir = async (p) => {
            await page.evaluate((p) => {
                const s = document.querySelector('.portada3d--3d'),
                    top = s.getBoundingClientRect().top + scrollY,
                    cab = parseFloat(getComputedStyle(s).getPropertyValue('--cabecera')) || 0;
                scrollTo(0, top - cab + (s.offsetHeight - innerHeight + cab) * p);
            }, p);
            await page.waitForTimeout(1100);
        };
        for (const p of [0.3, 0.46, 0.6, 0.85, 0.46, 0]) await ir(p);
        const cuadros = await page.evaluate(() => window.__coordinacion);
        expect(cuadros.length).toBeGreaterThan(6);
        expect(cuadros.every((c) => Math.abs(c.tapa) < 1e-6 && c.hojas.every((h) => Math.abs(h) < 1e-6) && c.bloque === 1)).toBe(true);
        expect(cuadros.some((c) => c.disolucion > 0)).toBe(true);
        await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
        await page.screenshot({ path: test.info().outputPath(`libro-cerrado-${ancho}.png`) });
    });
