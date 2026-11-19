import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { DESCARGAS } from '../src/models/config/web/downloads.js';

const API = 'http://127.0.0.1:59999/api';
const CATEGORIAS = ['Novela', 'Poesía', 'Fantasía'];
const LIBROS = Array.from({ length: 14 }, (_, i) => ({
    id_libro: i + 1,
    titulo: i === 0 ? 'Cien años de soledad' : `Libro de prueba ${i + 1}`,
    autor: i === 0 ? 'Gabriel García Márquez' : 'Autora de Prueba',
    categoria: CATEGORIAS[i % 3],
    precio: '39.90',
    stock: i === 3 ? 0 : 5,
    estado: i === 13 ? 0 : 1,
    portada: 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
}));

const VIDEO_PRUEBA = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/anuncio.webm'));

async function apiPublica(page, { falla = false, vacia = false, libros = LIBROS, anuncio = null } = {}) {
    await page.route(`${API}/libros`, (r) => (falla ? r.fulfill({ status: 503, json: {} }) : r.fulfill({ json: vacia ? [] : libros })));
    await page.route(`${API}/empresa`, (r) =>
        r.fulfill({ json: { success: true, empresa: { razon_social: 'FLORES SALINAS SARA', nombre_comercial: 'MATIDANA', ruc: '10447545387' } } })
    );
    await page.route(`${API}/app/version`, (r) =>
        r.fulfill({ json: { version: DESCARGAS.android.version, versionCode: 4, apkUrl: DESCARGAS.android.url, sha256: 'a'.repeat(64) } })
    );

    await page.route(`${API}/anuncios`, (r) => r.fulfill({ json: { success: true, anuncio } }));
    await page.route(`${API}/anuncios/carrusel`, (r) => r.fulfill({ json: { success: true, data: [] } }));

    if (anuncio?.video_url && !anuncio.roto) {
        await page.route(anuncio.video_url, (r) => r.fulfill({ body: VIDEO_PRUEBA, contentType: 'video/webm' }));
    }
}

const menu = (page) => page.getByRole('navigation', { name: 'Principal' });

test('cobertura Pallasca: textos y SEO estático no ofrecen entrega en Lima ni nacional', async ({ page }) => {
    const html = await (await page.request.get('/')).text();
    expect(html).not.toMatch(/entrega en Lima|domicilio en Lima|"areaServed": "PE"/);
    expect(html).toContain('"areaServed": "Ciudad de Pallasca"');
    expect(html).toContain('"streetAddress": "Plaza de Armas, Jr. Marañón 161"');
    expect(html).toContain('"postalCode": "02835"');
    await apiPublica(page);
    for (const ruta of ['/', '/catalogo', '/aplicacion', '/nosotros']) {
        await page.goto(ruta);
        await expect(page.locator('main')).toBeVisible();
        expect(await page.locator('body').innerText()).not.toMatch(/\bLima\b|envíos nacionales/);
        expect(await page.locator('meta[name="description"]').getAttribute('content')).not.toMatch(/\bLima\b/);
    }
});

const APK_FUTURA = 'https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/v8.0.0/libreria-8.0.0.apk';
for (const width of [390, 1440]) {
    test(`actualización: QR visible y botón usa la última versión del servidor a ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await apiPublica(page);
        let sinToken = false;
        await page.addInitScript(() => localStorage.setItem('token', 'token-del-panel-no-enviar'));
        await page.route(`${API}/app/version`, (r) => {
            sinToken = !r.request().headers().authorization;
            return r.fulfill({ json: { version: '8.0.0', versionCode: 80, apkUrl: APK_FUTURA, sha256: 'a'.repeat(64) } });
        });
        await page.goto('/descargar');
        await expect(page.getByRole('heading', { name: '¿Ya tienes la app en Android?' })).toBeVisible();
        await expect(page.getByText('Versión disponible: 8.0.0', { exact: true })).toBeVisible();
        const qr = page.getByAltText('Código QR para descargar la actualización más reciente de MATIDANA Libros y Cultura');
        await expect(qr).toBeVisible();
        expect(await qr.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
        await expect(page.locator('a[data-actualizar-app]')).toHaveAttribute('href', APK_FUTURA);
        expect(sinToken).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
}

test('actualización: escanear QR abre el APK más reciente, no una versión fija', async ({ page }) => {
    await apiPublica(page);
    await page.route(`${API}/app/version`, (r) => r.fulfill({ json: { version: '8.0.0', versionCode: 80, apkUrl: APK_FUTURA, sha256: 'a'.repeat(64) } }));
    await page.route(APK_FUTURA, (r) =>
        r.fulfill({
            body: 'APK de prueba',
            contentType: 'application/vnd.android.package-archive',
            headers: { 'Content-Disposition': 'attachment; filename="libreria-8.0.0.apk"' }
        })
    );
    const archivo = page.waitForEvent('download');
    await page.goto('/descargar?actualizar=1', { waitUntil: 'domcontentloaded' });
    const descargado = await archivo;
    expect(descargado.url()).toBe(APK_FUTURA);
    expect(descargado.suggestedFilename()).toBe('libreria-8.0.0.apk');
});

test('actualización: API no disponible deja una alternativa y no inicia una descarga equivocada', async ({ page }) => {
    await apiPublica(page);
    await page.route(`${API}/app/version`, (r) => r.fulfill({ status: 503, json: {} }));
    let descargas = 0;
    page.on('download', () => descargas++);
    await page.goto('/descargar?actualizar=1');
    await expect(page.getByText('No pudimos consultar la última versión. Puedes descargar la versión publicada en esta página.')).toBeVisible();
    await expect(page.locator('a[data-actualizar-app]')).toHaveAttribute('href', DESCARGAS.android.url);
    expect(descargas).toBe(0);
});

test.use({ reducedMotion: 'reduce' });

for (const width of [390, 1440]) {
    test(`Nuevo: catálogo e inicio con libros recientes a ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        const errores = [];
        page.on('pageerror', (e) => errores.push(e.message));
        const libros = LIBROS.map((libro, i) => ({ ...libro, es_nuevo: i === 0 ? 1 : 0, stock: i === 0 ? 0 : libro.stock }));
        await apiPublica(page, { libros });
        await page.goto('/catalogo');
        const todos = page.locator('.rejilla-libros--todos');
        await expect(todos.locator('.libro-nuevo')).toHaveCount(1);
        await expect(todos.locator('.libro-nuevo')).toBeVisible();
        const nuevo = await todos.locator('.libro-nuevo').boundingBox();
        const agotado = await todos.locator('.tarjeta-libro').first().locator('.agotado').boundingBox();

        expect(agotado.y).toBeGreaterThanOrEqual(nuevo.y + nuevo.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.goto('/');
        await expect(page.locator('.libro-nuevo')).toHaveCount(1);
        expect(errores).toEqual([]);
    });
}

test('inicio: web pública con metadatos, menú de páginas y sin errores', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await apiPublica(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Libros y anuncios de MATIDANA Libros y Cultura');
    await expect(page).toHaveTitle(/MATIDANA Libros y Cultura/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /PayU/);
    for (const texto of ['Inicio', 'Nosotros', 'Aplicación', 'Ofertas', 'Descargar']) {
        await expect(menu(page).getByRole('link', { name: texto, exact: true })).toBeVisible();
    }
    await expect(menu(page).getByRole('link', { name: 'Catálogo', exact: true })).toHaveCount(0);
    await expect(menu(page).getByRole('link', { name: 'Ofertas', exact: true })).toHaveAttribute('href', '/catalogo?ofertas=1');
    await expect(menu(page).getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(menu(page).locator('ul.contenedor > li').first().getByRole('link')).toHaveText('Inicio');
    expect(await page.locator('main').innerText()).not.toMatch(/\bNaN\b|\bundefined\b|\[object Object\]/);
    expect(errores).toEqual([]);
});

test('cada sección es una página: título, URL canónica y foco en su h1', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    const pie = page.locator('footer');
    const paginas = [
        ['Aplicación', '/aplicacion', 'Toda la librería cabe en la app', menu(page)],
        ['Nosotros', '/nosotros', 'Una librería de barrio, abierta a todo el Perú', menu(page)],
        ['Descargar', '/descargar', 'Descargue la app', menu(page)],
        ['Catálogo', '/catalogo', 'Catálogo', pie]
    ];
    for (const [enlace, ruta, h1, enlaces] of paginas) {
        await enlaces.getByRole('link', { name: enlace, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${ruta}$`));
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
        await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://libreria.my${ruta}`);
        if (enlaces !== pie) await expect(menu(page).getByRole('link', { name: enlace, exact: true })).toHaveAttribute('aria-current', 'page');
    }
});

test('catálogo: solo activos, filtros por categoría y búsqueda sin tildes', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/catalogo');
    await expect(page.locator('.catalogo-cabeza .seccion__entrada')).toHaveText('Libros físicos para descubrir historias y encontrar tu próxima lectura.');
    await expect(page.locator('.catalogo-cabeza')).toHaveCSS('border-bottom-width', '0px');
    await expect(page.locator('.catalogo-cabeza').getByLabel('Ordenar por')).toBeVisible();
    await expect(page.locator('.catalogo-pagina').getByRole('searchbox')).toHaveCount(0);
    await expect(page.locator('.catalogo-cabeza').getByRole('list')).toHaveCount(0);
    const tarjetas = page.locator('.rejilla-libros .tarjeta-libro');
    await expect(tarjetas).toHaveCount(13);
    await expect(page.getByText('13 libros')).toBeVisible();
    await expect(tarjetas.first()).toContainText('S/ 39.90');
    await expect(page.locator('.rejilla-libros')).not.toContainText('Libro de prueba 14');
    await expect(page.getByText('Sin stock por ahora')).toHaveCount(1);

    await page.getByRole('group', { name: 'Filtrar por categoría' }).getByRole('button', { name: 'Poesía' }).click();
    await expect(page).toHaveURL(/categoria=Poes%C3%ADa/);
    await expect(tarjetas).toHaveCount(4);

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await page.locator('#buscar-escritorio').fill('garcia');
    await page.locator('#buscar-escritorio').press('Enter');
    await expect(tarjetas).toHaveCount(1);
    await expect(tarjetas.first()).toContainText('Cien años de soledad');
});

test('catálogo: categorías destacadas como la referencia abren el filtro correspondiente', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await apiPublica(page);
    await page.goto('/catalogo');

    const seccion = page.locator('.catalogo-categorias');
    await expect(seccion.getByRole('heading', { name: 'Categorías destacadas' })).toBeVisible();
    await expect(seccion.getByRole('link', { name: 'Ver más temáticas' })).toHaveAttribute('href', '#categorias');
    await expect(seccion.getByRole('link')).toHaveCount(4);
    await expect(seccion.getByRole('link', { name: 'Novela', exact: true })).toHaveAttribute('href', '/catalogo?categoria=Novela');
    await expect(seccion.getByRole('link', { name: 'Poesía', exact: true })).toHaveAttribute('href', '/catalogo?categoria=Poes%C3%ADa');
    await expect(seccion.getByRole('link', { name: 'Fantasía', exact: true })).toHaveAttribute('href', '/catalogo?categoria=Fantas%C3%ADa');
    await expect(seccion.locator('.catalogo-categorias__portadas')).toHaveCount(0);

    await seccion.getByRole('link', { name: 'Poesía', exact: true }).click();
    await expect(page).toHaveURL(/categoria=Poes%C3%ADa$/);
    await expect(page.locator('.rejilla-libros .tarjeta-libro')).toHaveCount(4);
    await expect(seccion.getByRole('link', { name: 'Poesía', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('buscador de la cabecera lleva al catálogo con la búsqueda', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/nosotros');
    await page.locator('#buscar-escritorio').fill('soledad');
    await page.locator('#buscar-escritorio').press('Enter');
    await expect(page).toHaveURL(/\/catalogo\?q=soledad$/);
    await expect(page.locator('.rejilla-libros .tarjeta-libro')).toHaveCount(1);
});

test('catálogo: aviso si la API falla o no hay libros', async ({ page, context }) => {
    await apiPublica(page, { falla: true });
    await page.goto('/catalogo');
    await expect(page.getByRole('status').filter({ hasText: 'no se pudo cargar' })).toBeVisible();
    const otra = await context.newPage();
    await apiPublica(otra, { vacia: true });
    await otra.goto('/catalogo');
    await expect(otra.getByText('Estamos actualizando el catálogo')).toBeVisible();
});

test('descargar: Android real desde la configuración, iOS en preparación sin enlace', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/descargar');
    const android = page.locator('a[data-descarga="android"]');
    await expect(android).toHaveAttribute('href', DESCARGAS.android.url);
    await expect(page.locator('main')).toContainText(DESCARGAS.android.tamano);
    await expect(page.locator('main')).toContainText(DESCARGAS.android.version);
    await expect(page.locator('.descargar-portada__seguridad')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveText(/Página oficial de la app/);
    const ios = page.getByRole('article', { name: 'iPhone' });
    await expect(ios).toContainText('En preparación');
    await expect(ios.locator('a')).toHaveCount(0);
});

test('en un iPhone se destaca su tarjeta sin ocultar Android', async ({ browser }) => {
    const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce'
    });
    const page = await ctx.newPage();
    await apiPublica(page);
    await page.goto('/descargar');
    await expect(page.getByRole('article', { name: 'iPhone' })).toHaveAttribute('data-destacada', 'true');
    await expect(page.getByRole('article', { name: 'Android' })).toBeVisible();
    await ctx.close();
});

for (const ancho of [390, 1023]) {
    test(`cajón móvil ${ancho}px: abre, cierra con Escape devolviendo el foco y navega`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await apiPublica(page);
        await page.goto('/');
        await expect(page.getByRole('navigation', { name: 'Principal' })).toBeHidden();
        await page.locator('.cabecera').screenshot({ path: test.info().outputPath(`menu-movil-${ancho}.png`) });
        await page.getByRole('button', { name: 'Abrir menú' }).click();
        const cajon = page.getByRole('dialog', { name: 'Menú' });
        await expect(cajon).toBeVisible();
        await expect(cajon.getByRole('link', { name: 'Inicio', exact: true })).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(cajon).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeFocused();
        await page.getByRole('button', { name: 'Abrir menú' }).click();
        await page.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name: 'Aplicación' }).click();
        await expect(page).toHaveURL(/\/aplicacion$/);
        await expect(page.getByRole('dialog', { name: 'Menú' })).toHaveCount(0);
        await ctx.close();
    });
}

test('selector de entrega: teclado y resultado anunciado dentro de Aplicación', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/aplicacion');
    await expect(page.getByRole('heading', { name: 'Comprar un libro, sin vueltas' })).toBeVisible();
    const grupo = page.getByRole('radiogroup', { name: /Tipo de entrega/ });
    await grupo.getByRole('radio', { name: /Delivery dentro de Pallasca/ }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(grupo.getByRole('radio', { name: /Recojo en Pallasca/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.selector-entrega__resultado')).toContainText('Pallasca');
});

test('acceso administrativo: sin enlace público y disponible escribiendo /admin', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await expect(page.locator('a[href="/admin/login"], .pie__admin')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveText(/Acceso administrativo/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page).toHaveTitle(/Acceso administrativo/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('rutas: panel sin sesión va a /admin/login; ruta desconocida va al inicio', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
    await apiPublica(page);
    await page.goto('/pagina-que-no-existe');
    await expect(page).toHaveURL('http://127.0.0.1:5179/');
});

test('la web pública no envía el token del panel a la API', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('token', 'token-del-panel'));
    const cabeceras = [];
    await page.route(`${API}/**`, (r) => {
        cabeceras.push(r.request().headers().authorization || '');
        r.fulfill({ json: [] });
    });
    const peticion = page.waitForRequest((r) => r.url().startsWith(API));
    await page.goto('/');
    await peticion;
    await expect.poll(() => cabeceras.length).toBeGreaterThan(0);
    expect(cabeceras.every((c) => c === '')).toBe(true);
});

test('recarga: vuelve arriba sin cambiar de página', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/nosotros');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
    await expect(page).toHaveURL(/\/nosotros$/);
});

test('recarga: un enlace con ancla sigue llevando a su sección', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/nosotros#tienda');
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

    await page.reload();
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
});

test('video del inicio: sin anuncio activo no hay sección, y no rompe la portada', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page);
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    await expect(page.locator('.video-destacado')).toHaveCount(0);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(errores).toHaveLength(0);
});

test('video del inicio: el anuncio activo muestra el video y los textos del panel', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page, {
        anuncio: {
            id_anuncio: 7,
            titulo: 'Lecturas para el verano',
            video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4',
            etiqueta: 'Novedades de la casa',
            descripcion: 'Nuevos títulos cada semana.',
            boton_texto: 'Ver novedades',
            boton_enlace: '/catalogo?orden=titulo'
        }
    });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    const seccion = page.locator('.video-destacado');
    await expect(seccion).toHaveCount(1);
    const video = seccion.locator('video');
    await expect(video).toHaveAttribute('src', /anuncio\.mp4$/);
    await expect(video).toHaveAttribute('controls', '');

    await expect(seccion.getByRole('heading', { level: 2, name: 'Lecturas para el verano' })).toBeVisible();
    await expect(seccion.getByText('Novedades de la casa')).toBeVisible();
    await expect(seccion.getByText('Nuevos títulos cada semana.')).toBeVisible();
    await expect(seccion.getByRole('link', { name: 'Ver novedades' })).toHaveAttribute('href', '/catalogo?orden=titulo');

    const caja = await video.boundingBox();
    const texto = await seccion.locator('.video-destacado__texto').boundingBox();
    expect(texto.x).toBeGreaterThan(caja.x + caja.width);
    expect(Math.abs(caja.width / caja.height - 16 / 9)).toBeLessThan(0.02);
    expect(errores).toHaveLength(0);
});

test('video del inicio: sin textos usa los de ejemplo y nunca enlaza fuera de la web', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await apiPublica(page, {
        anuncio: { id_anuncio: 9, titulo: 'Promo', video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4', boton_enlace: '//externo.example' }
    });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    const seccion = page.locator('.video-destacado');
    await expect(seccion.getByText('Descubre nuestra librería')).toBeVisible();
    await expect(seccion.getByRole('link', { name: 'Explorar libros' })).toHaveAttribute('href', '/catalogo');

    const caja = await seccion.locator('video').boundingBox();
    const texto = await seccion.locator('.video-destacado__texto').boundingBox();
    expect(texto.y).toBeGreaterThanOrEqual(caja.y + caja.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('video del inicio: si el archivo no carga, la sección se retira en vez de quedar rota', async ({ page }) => {
    await apiPublica(page, { anuncio: { id_anuncio: 8, titulo: 'Roto', video_url: 'https://res.cloudinary.com/x/video/upload/v1/no-existe.mp4', roto: true } });
    await page.route('https://res.cloudinary.com/x/video/upload/v1/no-existe.mp4', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect(page.locator('.video-destacado')).toHaveCount(0);
});

test('video del inicio: usa el fondo de la página, no uno propio', async ({ page }) => {
    await apiPublica(page, { anuncio: { id_anuncio: 7, titulo: 'Promo', video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4' } });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    await expect(page.locator('.video-destacado')).toHaveCount(1);
    const fondos = await page.evaluate(() => {
        const seccion = document.querySelector('.video-destacado');
        const anterior = seccion.previousElementSibling;
        return {
            seccion: getComputedStyle(seccion).backgroundColor,
            cuerpo: getComputedStyle(document.body).backgroundColor,
            transparente: getComputedStyle(seccion).backgroundColor === 'rgba(0, 0, 0, 0)',
            anterior: anterior ? getComputedStyle(anterior).backgroundColor : null
        };
    });

    expect(fondos.transparente).toBe(true);
    expect(fondos.seccion).not.toBe('rgb(253, 245, 228)');
});

test('video del inicio: en escritorio el video ocupa cerca del 60 % de la sección, no todo el ancho', async ({ page }) => {
    await apiPublica(page, { anuncio: { id_anuncio: 7, titulo: 'Promo', video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4' } });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    const video = page.locator('.video-destacado__marco video');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute('src', 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4');

    await page.setViewportSize({ width: 1366, height: 800 });
    const anchos = await page.evaluate(() => {
        const marco = document.querySelector('.video-destacado__marco');
        const contenedor = document.querySelector('.video-destacado .contenedor');
        return { marco: marco.getBoundingClientRect().width, contenedor: contenedor.getBoundingClientRect().width };
    });
    expect(anchos.marco / anchos.contenedor).toBeGreaterThan(0.52);
    expect(anchos.marco / anchos.contenedor).toBeLessThan(0.65);

    await page.waitForTimeout(1000);
    await expect(video).toHaveCount(1);
});

const enOferta = { ...LIBROS[0], descuento_vigente: 1, descuento_porcentaje: 30, descuento_porcentaje_efectivo: 30, precio_final: '27.93' };
const promoVencida = { ...LIBROS[1], descuento_vigente: 0, descuento_porcentaje: 30, descuento_porcentaje_efectivo: 0, precio_final: '39.90' };

test('catálogo: en oferta muestra porcentaje, precio tachado y precio final', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page, { libros: [enOferta, ...LIBROS.slice(1)] });
    await page.goto('/catalogo');

    const tarjeta = page.locator('.rejilla-libros .tarjeta-libro').first();
    await expect(tarjeta.locator('.oferta__pastilla')).toHaveText('-30%');
    await expect(tarjeta.locator('.oferta__anterior s')).toHaveText('S/ 39.90');
    await expect(tarjeta.locator('.oferta__final')).toHaveText('S/ 27.93');

    await expect(tarjeta.locator('.oferta__pastilla')).toHaveCSS('background-color', 'rgb(177, 39, 4)');
    await expect(tarjeta.locator('.oferta__pastilla')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(tarjeta.locator('.oferta__final')).toHaveCSS('color', 'rgb(177, 39, 4)');
    expect(errores).toHaveLength(0);
});

test('catálogo: una promoción vencida vuelve al precio normal y sin pastilla', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page, { libros: [promoVencida, ...LIBROS.slice(2)] });
    await page.goto('/catalogo');

    const tarjeta = page.locator('.rejilla-libros .tarjeta-libro').first();
    await expect(tarjeta.locator('.oferta')).toHaveCount(0);
    await expect(tarjeta.locator('.oferta__pastilla')).toHaveCount(0);
    await expect(tarjeta).toContainText('S/ 39.90');
    expect(errores).toHaveLength(0);
});

test('catálogo: sin descuento no hay precio tachado en ninguna tarjeta', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/catalogo');
    await expect(page.locator('.rejilla-libros .oferta')).toHaveCount(0);
    await expect(page.locator('.rejilla-libros .oferta__anterior')).toHaveCount(0);
});

test('inicio: recomendados excluye ofertas y sus enlaces de detalle abren la ficha', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page, { libros: [enOferta, ...LIBROS.slice(1)] });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect(page.getByRole('heading', { name: 'Libros recomendados' })).toBeVisible();
    await expect(page.locator('.libro').first()).toBeVisible();
    await expect(page.locator('.libro .oferta__pastilla')).toHaveCount(0);
    await expect(page.locator('.libro', { hasText: enOferta.titulo })).toHaveCount(0);
    const libro = LIBROS[1];
    await page.route(`${API}/libros/${libro.id_libro}`, (r) => r.fulfill({ json: { success: true, data: libro } }));
    await page
        .locator('.libro')
        .first()
        .getByRole('link', { name: `Ver detalle de ${libro.titulo}`, exact: true })
        .click();
    await expect(page).toHaveURL(new RegExp(`/libro/${libro.id_libro}$`));
    await expect(page.getByRole('heading', { level: 1, name: libro.titulo, exact: true })).toBeVisible();
    expect(errores).toHaveLength(0);
});

test('favoritos y reclamaciones usan sus propios metadatos y conservan la navegación', async ({ page }) => {
    await apiPublica(page);
    for (const [ruta, titulo] of [
        ['/favoritos', 'Mis favoritos'],
        ['/libro-de-reclamaciones', 'Libro de Reclamaciones']
    ]) {
        await page.goto(ruta);
        await expect(page.getByRole('heading', { level: 1, name: titulo, exact: true })).toBeVisible();
        await expect(page).toHaveTitle(`${titulo} · MATIDANA Libros y Cultura`);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://libreria.my${ruta}`);
    }
    await page.getByRole('link', { name: 'Volver a MATIDANA', exact: true }).click();
    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle('MATIDANA Libros y Cultura · Delivery y recojo en Pallasca');
});

test('catálogo: el precio es texto sobrio sin pastilla de color', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/catalogo');
    const precio = page.locator('.tarjeta-libro__precio').first();
    await expect(precio).toBeVisible();
    const estilos = await precio.evaluate((e) => {
        const s = getComputedStyle(e);
        return { fondo: s.backgroundColor, color: s.color, radio: s.borderRadius };
    });

    expect(estilos.fondo).toBe('rgba(0, 0, 0, 0)');
    expect(estilos.color).toBe('rgb(17, 24, 32)');
});

test('el botón principal de descargas es verde píldora con texto blanco', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/descargar');
    const boton = page.locator('.descargar-portada .boton').first();
    await expect(boton).toBeVisible();
    const estilos = await boton.evaluate((e) => {
        const s = getComputedStyle(e);
        return { fondo: s.backgroundColor, color: s.color, radio: s.borderRadius };
    });
    expect(estilos.fondo).toBe('rgb(0, 77, 67)');
    expect(estilos.color).toBe('rgb(255, 255, 255)');
    expect(parseFloat(estilos.radio)).toBeGreaterThanOrEqual(22);
});

test('aplicación con características integradas y descargas usan la paleta de la referencia', async ({ page }) => {
    await apiPublica(page);
    const secciones = [
        ['/aplicacion', '.app-portada'],
        ['/aplicacion', '#ventajas'],
        ['/descargar', '.descargar-portada']
    ];

    for (const [ruta, selector] of secciones) {
        await page.goto(ruta);
        const titulo = page.locator('main h1');
        await expect(titulo).toBeVisible();

        const medido = await page.evaluate((sel) => {
            const seccion = document.querySelector(sel);
            const estiloSeccion = getComputedStyle(seccion);
            const estiloTitulo = getComputedStyle(document.querySelector('main h1'));
            const tarjetas = document.querySelector('.casa-tarjetas');
            return {
                fondo: estiloSeccion.backgroundColor,
                imagen: estiloSeccion.backgroundImage,
                colorTitulo: estiloTitulo.color,
                fuenteTitulo: estiloTitulo.fontFamily,
                etiqueta: Boolean(document.querySelector('.casa-etiqueta')),
                columnasTarjetas: tarjetas ? getComputedStyle(tarjetas).gridTemplateColumns.split(' ').length : 0
            };
        }, selector);

        expect(medido.fondo, ruta).toBe('rgb(255, 255, 255)');
        expect(medido.imagen, ruta).toBe('none');
        expect(medido.colorTitulo, ruta).toBe('rgb(0, 77, 67)');
        expect(medido.fuenteTitulo, ruta).toContain('Work Sans');
        expect(medido.etiqueta, ruta).toBe(true);
        expect(medido.columnasTarjetas, ruta).toBeGreaterThan(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), ruta).toBe(true);
    }
});

test('el pie mantiene contraste alto', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    await expect(page.locator('footer.pie')).toBeVisible({ timeout: 30000 });

    const medido = await page.evaluate(() => {
        const brillo = (c) => {
            const [r, g, b] = c
                .match(/\d+/g)
                .slice(0, 3)
                .map(Number)
                .map((v) => {
                    v /= 255;
                    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
                });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const leer = (sel) => {
            const e = document.querySelector(sel);
            if (!e) return null;
            const s = getComputedStyle(e);
            return { fondo: s.backgroundColor, texto: s.color };
        };
        const ratio = (a, b) => {
            const [x, y] = [brillo(a), brillo(b)].sort((p, q) => q - p);
            return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
        };
        const pie = leer('.pie');
        const crema = leer('.pie__crema');
        const legal = leer('.pie__legal');
        return {
            pieFondo: pie.fondo,
            cremaFondo: crema.fondo,
            legalFondo: legal.fondo,
            h2: ratio(pie.fondo, leer('.pie h2').texto),

            enlace: ratio(pie.fondo, leer('.pie ul a').texto),
            lema: ratio(pie.fondo, leer('.pie__lema').texto),
            legal: ratio(legal.fondo, legal.texto),
            marca: ratio(pie.fondo, leer('.pie .marca span').texto),
            cremaTitulo: ratio(crema.fondo, leer('.pie__crema-titulo').texto),
            cremaTexto: ratio(crema.fondo, leer('.pie__crema-texto').texto),
            servicio: ratio(crema.fondo, leer('.pie__servicio').texto),

            familias: [...new Set([...document.querySelectorAll('.pie h2, .pie__lema, .pie nav a, .pie__crema-titulo, .pie__servicio')].map((e) => getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g, '')))]
        };
    });

    expect(medido.pieFondo).toBe('rgb(0, 77, 67)');
    expect(medido.cremaFondo).toBe('rgb(255, 245, 230)');
    expect(medido.legalFondo).toBe('rgb(243, 243, 243)');
    expect(medido.familias).toEqual(['Work Sans']);
    for (const [donde, valor] of Object.entries(medido)) {
        if (['pieFondo', 'cremaFondo', 'legalFondo', 'familias'].includes(donde)) continue;
        expect(valor, `${donde} = ${valor}:1`).toBeGreaterThanOrEqual(4.5);
    }
});

test('el enlace de la app conserva un texto legible', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/nosotros');
    await expect(page.locator('.nosotros-valores .app-tiendas')).toHaveCount(0);
    await expect(page.locator('footer.pie .app-tiendas a')).toBeVisible({ timeout: 30000 });
    const descarga = await page.locator('footer.pie .app-tiendas a').evaluate((e) => {
        const s = getComputedStyle(e);
        return { fondo: s.backgroundColor, texto: s.color };
    });

    expect(descarga.fondo).toBe('rgba(0, 0, 0, 0)');
    expect(descarga.texto).toBe('rgb(240, 236, 228)');
});

test('catálogo: "Más vendido" solo en los libros que la API marca', async ({ page }) => {
    const libros = LIBROS.map((l, i) => ({ ...l, mas_vendido: i === 2 ? 1 : 0 }));
    await apiPublica(page, { libros });
    await page.goto('/catalogo');
    await expect(page.locator('.etiqueta-top')).toHaveCount(1);

    await expect(page.locator('.rejilla-libros .tarjeta-libro').first()).toContainText('Libro de prueba 3');
    await expect(page.locator('.rejilla-libros .tarjeta-libro').first().locator('.etiqueta-top')).toHaveText('Más vendido');
});

test('catálogo: ordenar por precio y filtrar ofertas y stock', async ({ page }) => {
    const libros = LIBROS.map((l, i) => ({ ...l, precio: String(10 + i), ...(i === 5 ? { descuento_vigente: 1, precio_final: '5.00', descuento_porcentaje_efectivo: 67 } : {}) }));
    await apiPublica(page, { libros });
    await page.goto('/catalogo');
    const tarjetas = page.locator('.rejilla-libros .tarjeta-libro');

    await page.getByLabel('Ordenar por').selectOption('precio-asc');
    await expect(page).toHaveURL(/orden=precio-asc/);
    await expect(tarjetas.first()).toContainText('Libro de prueba 6');
    await expect(tarjetas.first().locator('.ahorro')).toHaveText('Ahorras S/ 10.00');

    await page.getByLabel('Ordenar por').selectOption('precio-desc');
    await expect(tarjetas.first()).toContainText('Libro de prueba 13');

    await page.getByLabel(/Solo ofertas/).click();
    await expect(page.getByLabel(/Solo ofertas/)).toBeChecked();
    await expect(tarjetas).toHaveCount(1);
    await page.getByLabel(/Solo ofertas/).click();
    await expect(page.getByLabel(/Solo ofertas/)).not.toBeChecked();

    await page.getByLabel(/Solo con stock/).click();
    await expect(page.getByLabel(/Solo con stock/)).toBeChecked();
    await expect(tarjetas).toHaveCount(12);
    await expect(page.getByText('Sin stock por ahora')).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(tarjetas).toHaveCount(13);
});

test('catálogo: botón de compra negro carbón y stock real en la tarjeta', async ({ page }) => {
    const libros = LIBROS.map((l, i) => ({ ...l, stock: i === 1 ? 2 : l.stock }));
    await apiPublica(page, { libros });
    await page.goto('/catalogo');
    const boton = page.locator('.tarjeta-libro .boton--compra').first();
    await expect(boton).toHaveCSS('background-color', 'rgb(20, 18, 18)');
    await expect(page.locator('.stock--poco')).toHaveCount(1);
    await expect(page.locator('.stock--poco')).toHaveText('Quedan solo 2 en stock');
    await expect(page.locator('.tarjeta-libro--sin-stock .boton--compra')).toBeDisabled();
    await expect(page.locator('.tarjeta-libro--sin-stock')).toContainText('Sin stock por ahora');
});

test('inicio: explora por categoría y cómo comprar', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    const tarjetas = page.locator('.categoria-tarjeta');
    await expect(tarjetas).toHaveCount(3);

    const pasos = page.locator('.comprar__paso');
    await expect(pasos).toHaveCount(3);
    await expect(pasos.nth(1)).toContainText('Pague con PayU');
    await tarjetas.first().click();
    await expect(page).toHaveURL(/\/catalogo\?categoria=/);
});

test('cabecera y pie siguen la paleta de la referencia Casa del Libro', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await expect(page.locator('.avisos')).toHaveCount(0);

    await expect(page.locator('.cabecera')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('.cabecera')).toHaveCSS('border-bottom-width', '1px');
    await expect(page.locator('.cabecera')).toHaveCSS('border-bottom-color', 'rgb(220, 223, 230)');
    await expect(page.locator('.cabecera')).toHaveCSS('box-shadow', 'none');
    await expect(page.locator('.hightlight-up')).toHaveCSS('background-color', 'rgb(223, 230, 221)');
    await expect(page.locator('.hightlight-down')).toHaveCSS('background-color', 'rgb(0, 77, 67)');
    const franja = await page.locator('.hightlight-up').boundingBox();
    expect(franja.width).toBeCloseTo(1440, 0);
    const enlacesFranja = await page.locator('.hightlight-up a, .hightlight-down a').evaluateAll((elementos) =>
        elementos.map((elemento) => {
            const rectangulo = elemento.getBoundingClientRect();
            return { ancho: rectangulo.width, dentro: rectangulo.left >= 0 && rectangulo.right <= window.innerWidth };
        })
    );
    expect(enlacesFranja).toHaveLength(6);
    expect(enlacesFranja.every((enlace) => enlace.ancho > 0 && enlace.dentro)).toBe(true);

    await expect(page.locator('.menu')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('.menu')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('.menu')).toHaveCSS('border-top-color', 'rgb(220, 223, 230)');
    await expect(page.locator('.menu')).toHaveCSS('box-shadow', 'none');
    expect(await page.locator('.menu a').first().evaluate((elemento) => getComputedStyle(elemento, '::after').content)).toBe('none');
    const colorNormal = await page.locator('.menu a:not([aria-current="page"])').first().evaluate((elemento) => getComputedStyle(elemento).color);
    expect(colorNormal).toBe('rgb(0, 0, 0)');
    await expect(page.locator('.menu a[aria-current="page"]').first()).toHaveCSS('color', 'rgb(0, 77, 67)');
    await expect(page.locator('.menu a[aria-current="page"]').first()).toHaveCSS('border-bottom-color', 'rgb(0, 77, 67)');
    await expect(page.locator('.menu a:not([aria-current="page"])').first()).toHaveCSS('border-bottom-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('.menu a:not([aria-current="page"])').first()).toHaveCSS('font-weight', '600');
    await expect(page.locator('.menu a[aria-current="page"]').first()).toHaveCSS('font-weight', '700');
    await expect(page.locator('.menu a').first()).toHaveCSS('text-transform', 'none');
    await expect(page.locator('.portada3d__orbite-texto h2 em')).toHaveCSS('color', 'rgb(0, 77, 67)');
    await expect(page.locator('.portada3d__orbite-subtitulo')).toHaveCSS('color', 'rgb(1, 58, 51)');
    await expect(page.locator('.cabecera .marca__texto strong')).toHaveText('MATIDANA');
    await expect(page.locator('.cabecera .marca__texto small')).toHaveText('Libros y Cultura');
    await expect(page.locator('.menu__numero')).toHaveCount(0);
    expect(await page.locator('.menu > ul > li').nth(1).evaluate((elemento) => getComputedStyle(elemento, '::before').content)).toBe('"|"');
    await expect(page.locator('.cabecera .buscador:visible').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('.cabecera .buscador__wrapper:visible').first()).toHaveCSS('border-radius', '4px');
    await expect(page.locator('.cabecera .buscador input:visible').first()).toHaveCSS('border-radius', '0px');
    await expect(page.locator('.cabecera .buscador input:visible').first()).toHaveCSS('color', 'rgb(0, 77, 67)');
    await expect(page.locator('.cabecera .buscador button[type="submit"]:visible').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const buscador = await page.locator('.cabecera .buscador:visible').first().boundingBox();
    const campo = await page.locator('.cabecera .buscador input:visible').first().boundingBox();
    const boton = await page.locator('.cabecera .buscador button[type="submit"]:visible').first().boundingBox();
    const envoltorio = await page.locator('.cabecera .buscador__wrapper:visible').first().boundingBox();
    expect(envoltorio.width).toBeGreaterThan(buscador.width * 0.95);
    expect(boton.x).toBeGreaterThanOrEqual(campo.x + campo.width - 1);
    expect(boton.x + boton.width).toBeLessThanOrEqual(envoltorio.x + envoltorio.width + 1);
});

test('barra de categorías: datos reales y desplegable con enlaces', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await apiPublica(page);
    await page.goto('/');

    const categoria = menu(page).getByRole('link', { name: 'Novela', exact: true });
    const panel = page.locator('#menu-categoria-0');
    await expect(categoria).toBeVisible();
    await expect(menu(page).getByRole('link', { name: 'Fantasía', exact: true })).toBeVisible();
    await expect(menu(page).getByRole('link', { name: 'Poesía', exact: true })).toBeVisible();
    await expect(panel).toBeHidden();

    await categoria.hover();
    await expect(panel).toBeVisible();
    await expect(categoria).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.getByText('Enlaces de MATIDANA')).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Ver los 5 títulos de Novela' })).toHaveAttribute('href', '/catalogo?categoria=Novela');
    await expect(panel.getByRole('link', { name: 'Aplicación', exact: true })).toHaveAttribute('href', '/aplicacion');
    await expect(panel.getByRole('heading', { name: 'Libros de Novela' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Cien años de soledad' })).toBeVisible();

    await page.mouse.move(0, 0);
    await categoria.focus();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(categoria).toHaveAttribute('aria-expanded', 'false');

    await categoria.click();
    await expect(page).toHaveURL(/\/catalogo\?categoria=Novela$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errores).toEqual([]);
});

test('desplegable de categorías: cada una muestra solo sus propios libros', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await apiPublica(page);
    await page.goto('/');

    const novela = menu(page).getByRole('link', { name: 'Novela', exact: true });
    const fantasia = menu(page).getByRole('link', { name: 'Fantasía', exact: true });
    const panelNovela = page.locator('#menu-categoria-0');
    const panelFantasia = page.locator('#menu-categoria-1');

    await novela.hover();
    await expect(panelNovela.getByRole('heading', { name: 'Libros de Novela' })).toBeVisible();
    await expect(panelNovela.locator('.menu__libros a')).toHaveCount(5);
    await expect(panelNovela.getByRole('link', { name: /Cien años de soledad/ })).toBeVisible();
    await expect(panelNovela.getByRole('link', { name: /Libro de prueba 2/ })).toHaveCount(0);

    await fantasia.hover();
    await expect(panelFantasia.getByRole('heading', { name: 'Libros de Fantasía' })).toBeVisible();
    await expect(panelFantasia.getByRole('link', { name: /Libro de prueba 3/ })).toBeVisible();
    await expect(panelFantasia.getByRole('link', { name: /Cien años de soledad/ })).toHaveCount(0);
});

test('cabecera móvil: menú, marca y acciones en una fila y buscador debajo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await apiPublica(page);
    await page.goto('/');
    await expect(page.locator('.cabecera__principal > .buscador')).toBeHidden();
    await expect(page.locator('.cabecera__movil .buscador')).toBeVisible();
    const cajas = await page.evaluate(() => {
        const medir = (selector) => {
            const rectangulo = document.querySelector(selector).getBoundingClientRect();
            return { x: rectangulo.x, y: rectangulo.y, ancho: rectangulo.width, alto: rectangulo.height };
        };
        return {
            menu: medir('.cabecera__boton-menu'),
            marca: medir('.cabecera .marca'),
            acciones: medir('.cabecera__acciones'),
            buscador: medir('.cabecera__movil .buscador__wrapper')
        };
    });
    expect(Math.abs(cajas.menu.y - cajas.acciones.y)).toBeLessThan(8);
    expect(Math.abs(cajas.menu.y - cajas.marca.y)).toBeLessThan(8);
    expect(cajas.buscador.y).toBeGreaterThan(cajas.menu.y + cajas.menu.alto);
    expect(cajas.buscador.x).toBeLessThanOrEqual(cajas.menu.x + 1);
    expect(cajas.buscador.x + cajas.buscador.ancho).toBeGreaterThanOrEqual(cajas.acciones.x + cajas.acciones.ancho - 1);

    await expect(menu(page).getByRole('link', { name: 'Novela', exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const cajon = page.getByRole('dialog', { name: 'Menú' });
    await expect(cajon.getByText('Categorías', { exact: true })).toBeVisible();
    await expect(cajon.getByRole('link', { name: /Novela/ })).toHaveAttribute('href', '/catalogo?categoria=Novela');
    await page.keyboard.press('Escape');
    await expect(cajon).toBeHidden();
});

test('inicio: sin secciones repetidas; el carrusel ofrece fichas de libros reales', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect(page.locator('.vitrina, .comprar__app, .banda-catalogo')).toHaveCount(0);
    await expect(page.locator('.portada3d__carrusel-link').first()).toHaveAttribute('href', '/libro/13');
});

for (const width of [390, 1440]) {
    test(`Aplicación ${width}px: presentación sin logo, teléfonos y enlaces disponibles`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await apiPublica(page);
        await page.goto('/aplicacion');
        const app = page.locator('.app-portada');
        await expect(app.getByRole('heading', { level: 1 })).toHaveText('Toda la librería cabe en la app');
        await expect(app.locator('.icono-app')).toHaveCount(0);
        await expect(app.locator('.telefono img')).toHaveCount(3);
        await expect(app.getByRole('link', { name: 'Descargar la app', exact: true })).toHaveAttribute('href', '/descargar');
        await expect(app.getByRole('link', { name: 'Ver el catálogo', exact: true })).toHaveAttribute('href', '/catalogo');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
}
