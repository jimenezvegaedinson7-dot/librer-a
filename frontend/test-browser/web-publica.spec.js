import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { DESCARGAS } from '../src/public-site/config/downloads.js';

// Web pública: páginas separadas (Inicio, Catálogo, Aplicación,
// Características, Nosotros, Descargar), catálogo real (simulado aquí),
// descargas desde la configuración central y el panel en /admin/login.

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
    portada: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
}));

const VIDEO_PRUEBA = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/anuncio.webm'));

async function apiPublica(page, { falla = false, vacia = false, libros = LIBROS, anuncio = null } = {}) {
    await page.route(`${API}/libros`, (r) => (falla ? r.fulfill({ status: 503, json: {} }) : r.fulfill({ json: vacia ? [] : libros })));
    await page.route(`${API}/empresa`, (r) => r.fulfill({ json: { success: true, empresa: { razon_social: 'FLORES SALINAS SARA', nombre_comercial: 'MATIDANA', ruc: '10447545387' } } }));
    await page.route(`${API}/app/version`, r => r.fulfill({json:{version:DESCARGAS.android.version,
        versionCode:4, apkUrl:DESCARGAS.android.url, sha256:'a'.repeat(64)}}));
    // El video lo sube el administrador, así que por defecto no hay ninguno
    // activo. Las pruebas del video pasan uno explícito.
    await page.route(`${API}/anuncios`, (r) => r.fulfill({ json: { success: true, anuncio } }));
    await page.route(`${API}/anuncios/carrusel`,r=>r.fulfill({json:{success:true,data:[]}}));
    // El archivo del anuncio se sirve con un WebM real y diminuto: la portada
    // retira la sección si el video no carga, así que una URL inventada no basta.
    if (anuncio?.video_url && !anuncio.roto) {
        await page.route(anuncio.video_url, (r) => r.fulfill({ body: VIDEO_PRUEBA, contentType: 'video/webm' }));
    }
}

const menu = (page) => page.getByRole('navigation', { name: 'Principal' });

test('cobertura Pallasca: textos y SEO estático no ofrecen entrega en Lima ni nacional', async ({page}) => {
    const html = await (await page.request.get('/')).text();
    expect(html).not.toMatch(/entrega en Lima|domicilio en Lima|"areaServed": "PE"/);
    expect(html).toContain('"areaServed": "Pallasca"');
    await apiPublica(page);
    for (const ruta of ['/', '/catalogo', '/caracteristicas', '/nosotros']) {
        await page.goto(ruta);
        await expect(page.locator('main')).toBeVisible();
        expect(await page.locator('body').innerText()).not.toMatch(/\bLima\b|envíos nacionales/);
        expect(await page.locator('meta[name="description"]').getAttribute('content')).not.toMatch(/\bLima\b/);
    }
});

const APK_FUTURA = 'https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/v8.0.0/libreria-8.0.0.apk';
for (const width of [390, 1440]) {
    test(`actualización: QR visible y botón usa la última versión del servidor a ${width}px`, async ({page}) => {
        await page.setViewportSize({width,height:1000});
        await apiPublica(page);
        let sinToken = false;
        await page.addInitScript(() => localStorage.setItem('token','token-del-panel-no-enviar'));
        await page.route(`${API}/app/version`, r => {
            sinToken = !r.request().headers().authorization;
            return r.fulfill({json:{version:'8.0.0',versionCode:80,apkUrl:APK_FUTURA,sha256:'a'.repeat(64)}});
        });
        await page.goto('/descargar');
        await expect(page.getByRole('heading',{name:'¿Ya tienes la app en Android?'})).toBeVisible();
        await expect(page.getByText('Versión disponible: 8.0.0',{exact:true})).toBeVisible();
        const qr = page.getByAltText('Código QR para descargar la actualización más reciente de Librería');
        await expect(qr).toBeVisible();
        expect(await qr.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        await expect(page.locator('a[data-actualizar-app]')).toHaveAttribute('href',APK_FUTURA);
        expect(sinToken).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
}

test('actualización: escanear QR abre el APK más reciente, no una versión fija', async ({page}) => {
    await apiPublica(page);
    await page.route(`${API}/app/version`, r => r.fulfill({json:{version:'8.0.0',versionCode:80,apkUrl:APK_FUTURA,sha256:'a'.repeat(64)}}));
    await page.route(APK_FUTURA, r => r.fulfill({body:'APK de prueba',contentType:'application/vnd.android.package-archive',
        headers:{'Content-Disposition':'attachment; filename="libreria-8.0.0.apk"'}}));
    const archivo = page.waitForEvent('download');
    await page.goto('/descargar?actualizar=1',{waitUntil:'domcontentloaded'});
    const descargado = await archivo;
    expect(descargado.url()).toBe(APK_FUTURA);
    expect(descargado.suggestedFilename()).toBe('libreria-8.0.0.apk');
});

test('actualización: API no disponible deja una alternativa y no inicia una descarga equivocada', async ({page}) => {
    await apiPublica(page);
    await page.route(`${API}/app/version`, r => r.fulfill({status:503,json:{}}));
    let descargas=0; page.on('download',()=>descargas++);
    await page.goto('/descargar?actualizar=1');
    await expect(page.getByText('No pudimos consultar la última versión. Puedes descargar la versión publicada en esta página.')).toBeVisible();
    await expect(page.locator('a[data-actualizar-app]')).toHaveAttribute('href',DESCARGAS.android.url);
    expect(descargas).toBe(0);
});

test.use({ reducedMotion: 'reduce' });

for (const width of [390, 1440]) {
    test(`Nuevo: catálogo e inicio con libros recientes a ${width}px`, async ({page}) => {
        await page.setViewportSize({width, height: 900});
        const errores = []; page.on('pageerror', e => errores.push(e.message));
        const libros = LIBROS.map((libro, i) => ({...libro, es_nuevo: i === 0 ? 1 : 0,
            stock: i === 0 ? 0 : libro.stock}));
        await apiPublica(page, {libros});
        await page.goto('/catalogo');
        await expect(page.locator('.libro-nuevo')).toHaveCount(1);
        await expect(page.locator('.libro-nuevo')).toBeVisible();
        const nuevo = await page.locator('.libro-nuevo').boundingBox();
        const agotado = await page.locator('.tarjeta-libro').first().locator('.agotado').boundingBox();
        expect(nuevo.y).toBeGreaterThanOrEqual(agotado.y + agotado.height);
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Libros y anuncios de Librería del Saber');
    await expect(page).toHaveTitle(/Librería del Saber/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /PayU/);
    for (const texto of ['Inicio', 'Catálogo', 'Aplicación', 'Características', 'Nosotros', 'Descargar']) {
        await expect(menu(page).getByRole('link', { name: texto, exact: true })).toBeVisible();
    }
    await expect(menu(page).getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await page.locator('main').innerText()).not.toMatch(/\bNaN\b|\bundefined\b|\[object Object\]/);
    expect(errores).toEqual([]);
});

test('cada sección es una página: título, URL canónica y foco en su h1', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    const paginas = [
        ['Aplicación', '/aplicacion', 'Toda la librería cabe en la app'],
        ['Características', '/caracteristicas', 'Comprar un libro, sin vueltas'],
        ['Nosotros', '/nosotros', 'Nosotros'],
        ['Descargar', '/descargar', 'Descarga la app'],
        ['Catálogo', '/catalogo', 'Catálogo'],
    ];
    for (const [enlace, ruta, h1] of paginas) {
        await menu(page).getByRole('link', { name: enlace, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${ruta}$`));
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
        await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://librer-a-zeta.vercel.app${ruta}`);
        await expect(menu(page).getByRole('link', { name: enlace, exact: true })).toHaveAttribute('aria-current', 'page');
    }
});

test('catálogo: solo activos, filtros por categoría y búsqueda sin tildes', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/catalogo');
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
    await page.locator('#buscar-catalogo').fill('garcia');
    await page.locator('#buscar-catalogo').press('Enter');
    await expect(tarjetas).toHaveCount(1);
    await expect(tarjetas.first()).toContainText('Cien años de soledad');
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
    const ios = page.getByRole('article', { name: 'iPhone' });
    await expect(ios).toContainText('En preparación');
    await expect(ios.locator('a')).toHaveCount(0);
});

test('en un iPhone se destaca su tarjeta sin ocultar Android', async ({ browser }) => {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await apiPublica(page);
    await page.goto('/descargar');
    await expect(page.getByRole('article', { name: 'iPhone' })).toHaveAttribute('data-destacada', 'true');
    await expect(page.getByRole('article', { name: 'Android' })).toBeVisible();
    await ctx.close();
});

test('cajón móvil: abre, cierra con Escape devolviendo el foco y navega', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await apiPublica(page);
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeHidden();
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const cajon = page.getByRole('dialog', { name: 'Menú' });
    await expect(cajon).toBeVisible();
    await expect(cajon.getByRole('link', { name: 'Inicio', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(cajon).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeFocused();
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name: 'Características' }).click();
    await expect(page).toHaveURL(/\/caracteristicas$/);
    await expect(page.getByRole('dialog', { name: 'Menú' })).toHaveCount(0);
    await ctx.close();
});

test('selector de entrega: teclado y resultado anunciado', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/caracteristicas');
    const grupo = page.getByRole('radiogroup', { name: /Tipo de entrega/ });
    await grupo.getByRole('radio', { name: /Delivery dentro de Pallasca/ }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(grupo.getByRole('radio', { name: /Recojo en Pallasca/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.selector-entrega__resultado')).toContainText('Pallasca');
});

test('acceso administrativo: solo en el pie, discreto, y lleva al login del panel', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await expect(page.locator('header a[href="/admin/login"], .avisos a[href="/admin/login"]')).toHaveCount(0);
    await page.locator('.pie__admin').click();
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
    await page.route(`${API}/**`, (r) => { cabeceras.push(r.request().headers().authorization || ''); r.fulfill({ json: [] }); });
    const peticion = page.waitForRequest((r) => r.url().startsWith(API));
    await page.goto('/');
    await peticion;
    await expect.poll(() => cabeceras.length).toBeGreaterThan(0);
    expect(cabeceras.every((c) => c === '')).toBe(true);
});

// El navegador, por su cuenta, devuelve la página en la posición en la que se
// estaba al recargar. Aquí se desactiva: recargar siempre vuelve arriba.
test('recarga: vuelve arriba sin cambiar de página', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/nosotros');
    await page.waitForSelector('#precarga', { state: 'detached' });
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

    await page.reload();
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
    await expect(page).toHaveURL(/\/nosotros$/);
});

// El enlace con ancla manda sobre el "volver arriba": si la url trae #seccion,
// recargar tiene que dejarte en esa sección, no al principio de la página.
test('recarga: un enlace con ancla sigue llevando a su sección', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/nosotros#tienda');
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

    await page.reload();
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
});

// Video de anuncios del inicio: video a la izquierda y sus textos a la
// derecha. Todo lo escribe el administrador; sin anuncio activo la sección
// no se monta: es preferible a dejar un hueco vacío en la portada.
test('video del inicio: sin anuncio activo no hay sección, y no rompe la portada', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page);
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    await expect(page.locator('.video-destacado')).toHaveCount(0);
    // La portada sigue completa: el hero no desaparece por falta de video.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(errores).toHaveLength(0);
});

test('video del inicio: el anuncio activo muestra el video y los textos del panel', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page, {
        anuncio: {
            id_anuncio: 7, titulo: 'Lecturas para el verano', video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4',
            etiqueta: 'Novedades de la casa', descripcion: 'Nuevos títulos cada semana.', boton_texto: 'Ver novedades', boton_enlace: '/catalogo?orden=titulo',
        },
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

    // Escritorio: video a la izquierda y texto a la derecha, a la misma altura.
    const caja = await video.boundingBox();
    const texto = await seccion.locator('.video-destacado__texto').boundingBox();
    expect(texto.x).toBeGreaterThan(caja.x + caja.width);
    expect(Math.abs(caja.width / caja.height - 16 / 9)).toBeLessThan(0.02);
    expect(errores).toHaveLength(0);
});

test('video del inicio: sin textos usa los de ejemplo y nunca enlaza fuera de la web', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await apiPublica(page, {
        anuncio: { id_anuncio: 9, titulo: 'Promo', video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4', boton_enlace: '//externo.example' },
    });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    const seccion = page.locator('.video-destacado');
    await expect(seccion.getByText('Descubre nuestra librería')).toBeVisible();
    await expect(seccion.getByRole('link', { name: 'Explorar libros' })).toHaveAttribute('href', '/catalogo');

    // Móvil: el video va arriba y el texto debajo, sin scroll horizontal.
    const caja = await seccion.locator('video').boundingBox();
    const texto = await seccion.locator('.video-destacado__texto').boundingBox();
    expect(texto.y).toBeGreaterThanOrEqual(caja.y + caja.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// El fondo se lo queda la página, no la sección: antes iba ámbar y quedaba
// un bloque suelto que rompía el ritmo de la portada.
test('video del inicio: si el archivo no carga, la sección se retira en vez de quedar rota', async ({ page }) => {
    await apiPublica(page, {
        anuncio: { id_anuncio: 8, titulo: 'Roto', video_url: 'https://res.cloudinary.com/x/video/upload/v1/no-existe.mp4', roto: true },
    });
    await page.route('https://res.cloudinary.com/x/video/upload/v1/no-existe.mp4', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect(page.locator('.video-destacado')).toHaveCount(0);
});

test('video del inicio: usa el fondo de la página, no uno propio', async ({ page }) => {
    await apiPublica(page, {
        anuncio: { id_anuncio: 7, titulo: 'Promo', video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4' },
    });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    const fondos = await page.evaluate(() => {
        const seccion = document.querySelector('.video-destacado');
        const anterior = seccion.previousElementSibling;
        return {
            seccion: getComputedStyle(seccion).backgroundColor,
            cuerpo: getComputedStyle(document.body).backgroundColor,
            transparente: getComputedStyle(seccion).backgroundColor === 'rgba(0, 0, 0, 0)',
            anterior: anterior ? getComputedStyle(anterior).backgroundColor : null,
        };
    });
    console.log('FONDO VIDEO:', JSON.stringify(fondos));
    // Transparente: así se ve el fondo que usa el resto de la página.
    expect(fondos.transparente).toBe(true);
    expect(fondos.seccion).not.toBe('rgb(253, 245, 228)'); // nada de ámbar
});

test('video del inicio: en escritorio el video ocupa cerca del 60 % de la sección, no todo el ancho', async ({ page }) => {
    await apiPublica(page, {
        anuncio: { id_anuncio: 7, titulo: 'Promo', video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4' },
    });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    const video = page.locator('.video-destacado__marco video');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute('src', 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4');

    // Unos tres quintos: el resto es para los textos.
    await page.setViewportSize({ width: 1366, height: 800 });
    const anchos = await page.evaluate(() => {
        const marco = document.querySelector('.video-destacado__marco');
        const contenedor = document.querySelector('.video-destacado .contenedor');
        return { marco: marco.getBoundingClientRect().width, contenedor: contenedor.getBoundingClientRect().width };
    });
    expect(anchos.marco / anchos.contenedor).toBeGreaterThan(0.52);
    expect(anchos.marco / anchos.contenedor).toBeLessThan(0.65);

    // El reproductor se queda aunque el video no se pueda decodificar: el
    // aviso de "llega muy pronto" sería falso, el archivo sí llegó.
    await page.waitForTimeout(1000);
    await expect(video).toHaveCount(1);
});

// ============================================================
// DESCUENTOS
// precio_final, descuento_vigente y descuento_porcentaje_efectivo los
// calcula el backend. La web solo los pinta, así que estas pruebas
// comprueban que no invente cifras ni deje la pastilla cuando la
// promoción ya venció.
// ============================================================

const enOferta = {
    ...LIBROS[0],
    descuento_vigente: 1,
    descuento_porcentaje: 30,
    descuento_porcentaje_efectivo: 30,
    precio_final: '27.93',
};

const promoVencida = {
    ...LIBROS[1],
    descuento_vigente: 0,
    descuento_porcentaje: 30,
    descuento_porcentaje_efectivo: 0,
    precio_final: '39.90',
};

test('catálogo: en oferta muestra porcentaje, precio tachado y precio final', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page, { libros: [enOferta, ...LIBROS.slice(1)] });
    await page.goto('/catalogo');

    const tarjeta = page.locator('.rejilla-libros .tarjeta-libro').first();
    await expect(tarjeta.locator('.oferta__pastilla')).toHaveText('-30%');
    await expect(tarjeta.locator('.oferta__anterior s')).toHaveText('S/ 39.90');
    await expect(tarjeta.locator('.oferta__final')).toHaveText('S/ 27.93');
    // Estilo formal: pastilla roja sobria con texto blanco y precio final en rojo.
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

test('inicio: el carrusel de la portada también aplica el descuento', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page, { libros: [enOferta, ...LIBROS.slice(1)] });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    await expect(page.locator('.libro .oferta__pastilla').first()).toHaveText('-30%');
    await expect(page.locator('.libro .oferta__final').first()).toHaveCSS('color', 'rgb(177, 39, 4)');
    expect(errores).toHaveLength(0);
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
    // Estilo formal: sin fondo de color, texto en tinta oscura.
    expect(estilos.fondo).toBe('rgba(0, 0, 0, 0)');
    expect(estilos.color).toBe('rgb(17, 24, 32)');
});

test('el botón principal es azul marino con texto blanco', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/descargar');
    const boton = page.locator('.descargar .boton, .seccion.crema .boton').first();
    await expect(boton).toBeVisible();
    const estilos = await boton.evaluate((e) => {
        const s = getComputedStyle(e);
        return { fondo: s.backgroundColor, color: s.color };
    });
    expect(estilos.fondo).toBe('rgb(13, 41, 64)');
    expect(estilos.color).toBe('rgb(255, 255, 255)');
});

// El pie va en verde oscuro sobre texto claro. Con este contraste alto
// cualquier cambio de color hay que comprobarlo aparte.
test('el pie mantiene contraste alto', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    const medido = await page.evaluate(() => {
        const brillo = (c) => {
            const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map((v) => {
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
        return {
            pieFondo: pie.fondo,
            h2: ratio(pie.fondo, leer('.pie h2').texto),
            // Los enlaces de las columnas, no el del logo: aquel envuelve un
            // <span> que ya lleva su propio color blanco.
            enlace: ratio(pie.fondo, leer('.pie ul a').texto),
            lema: ratio(pie.fondo, leer('.pie__lema').texto),
            legal: ratio(pie.fondo, leer('.pie__legal').texto),
            marca: ratio(pie.fondo, leer('.pie .marca span').texto),
        };
    });

    expect(medido.pieFondo).toBe('rgb(10, 31, 49)');
    for (const [donde, valor] of Object.entries(medido)) {
        if (donde === 'pieFondo') continue;
        expect(valor, `${donde} = ${valor}:1`).toBeGreaterThanOrEqual(4.5);
    }
});

test('cada variante de botón conserva un texto legible', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    const colores = await page.evaluate(() => {
        const leer = (sel) => {
            const e = document.querySelector(sel);
            if (!e) return null;
            const s = getComputedStyle(e);
            return { fondo: s.backgroundColor, texto: s.color };
        };
        return { marca: leer('.boton--marca') };
    });
    expect(colores.marca.fondo).toBe('rgb(13, 41, 64)');
    expect(colores.marca.texto).toBe('rgb(255, 255, 255)');
    // El inicio ya no usa el botón blanco: se comprueba en Nosotros.
    await page.goto('/nosotros');
    const blanco = await page.locator('.boton--blanco').first().evaluate((e) => {
        const s = getComputedStyle(e);
        return { fondo: s.backgroundColor, texto: s.color };
    });
    expect(blanco.fondo).toBe('rgb(255, 255, 255)');
    expect(blanco.texto).toBe('rgb(13, 41, 64)');
});

// ============================================================
// CATÁLOGO ESTILO TIENDA: etiquetas reales, orden y filtros
// ============================================================
test('catálogo: "Más vendido" solo en los libros que la API marca', async ({ page }) => {
    const libros = LIBROS.map((l, i) => ({ ...l, mas_vendido: i === 2 ? 1 : 0 }));
    await apiPublica(page, { libros });
    await page.goto('/catalogo');
    await expect(page.locator('.etiqueta-top')).toHaveCount(1);
    // En orden "Destacados" el más vendido va primero.
    await expect(page.locator('.rejilla-libros .tarjeta-libro').first()).toContainText('Libro de prueba 3');
    await expect(page.locator('.rejilla-libros .tarjeta-libro').first().locator('.etiqueta-top')).toHaveText('Más vendido');
});

test('catálogo: ordenar por precio y filtrar ofertas y stock', async ({ page }) => {
    const libros = LIBROS.map((l, i) => ({ ...l, precio: String(10 + i),
        ...(i === 5 ? { descuento_vigente: 1, precio_final: '5.00', descuento_porcentaje_efectivo: 67 } : {}) }));
    await apiPublica(page, { libros });
    await page.goto('/catalogo');
    const tarjetas = page.locator('.rejilla-libros .tarjeta-libro');

    await page.getByLabel('Ordenar por').selectOption('precio-asc');
    await expect(page).toHaveURL(/orden=precio-asc/);
    await expect(tarjetas.first()).toContainText('Libro de prueba 6'); // la oferta a S/ 5.00
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

test('catálogo: botón de compra azul marino y stock real en la tarjeta', async ({ page }) => {
    const libros = LIBROS.map((l, i) => ({ ...l, stock: i === 1 ? 2 : l.stock }));
    await apiPublica(page, { libros });
    await page.goto('/catalogo');
    const boton = page.locator('.tarjeta-libro .boton--compra').first();
    await expect(boton).toHaveCSS('background-color', 'rgb(13, 41, 64)');
    await expect(page.locator('.stock--poco')).toHaveCount(1);
    await expect(page.locator('.stock--poco')).toHaveText('Quedan solo 2 en stock');
    await expect(page.locator('.tarjeta-libro--sin-stock .boton--compra')).toContainText('Agotado');
});

test('inicio: explora por categoría y cómo comprar', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    const tarjetas = page.locator('.categoria');
    await expect(tarjetas).toHaveCount(3);
    // Cómo comprar: 4 pasos numerados 01–04, sin tarjetas.
    const pasos = page.locator('.proceso__paso');
    await expect(pasos).toHaveCount(4);
    await expect(pasos.locator('.proceso__numero')).toHaveText(['01', '02', '03', '04']);
    await expect(pasos.nth(2)).toContainText('Paga seguro');
    await tarjetas.first().click();
    await expect(page).toHaveURL(/\/catalogo\?categoria=/);
});

// Franja de beneficios: azul marino, texto marfil e iconos dorados.
test('franja de beneficios: azul marino, texto marfil e iconos dorados', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    const franja = page.locator('.avisos');
    await expect(franja).toHaveCSS('background-color', 'rgb(13, 41, 64)');
    await expect(franja).toHaveCSS('color', 'rgb(255, 249, 239)');
    await expect(page.locator('.avisos .aviso-icono')).toHaveCount(3);
    await expect(page.locator('.avisos .aviso-icono').first()).toHaveCSS('color', 'rgb(213, 164, 71)');
    for (const texto of ['Delivery dentro de Pallasca', 'Recojo sin costo en Pallasca', 'Pago en línea seguro con PayU']) {
        await expect(page.locator('.avisos')).toContainText(texto);
    }
});

test('inicio: vitrina de la app con tarjeta grande y dos apiladas', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await apiPublica(page);
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });
    const vitrina = page.locator('.vitrina');
    await expect(vitrina.locator('.vitrina__principal')).toContainText('Toda la librería cabe en la app');
    await expect(vitrina.locator('.vitrina__telefono img')).toHaveCount(1);
    await expect(vitrina.getByRole('link', { name: /Conoce la app/ })).toHaveAttribute('href', '/aplicacion');
    await expect(vitrina.getByRole('link', { name: /Ver cómo funciona/ })).toHaveAttribute('href', '/caracteristicas');
    await expect(vitrina.getByRole('link', { name: /Descargar la app/ })).toHaveAttribute('href', '/descargar');
    // Escritorio: la grande a la izquierda y las otras dos apiladas a la derecha.
    const grande = await vitrina.locator('.vitrina__principal').boundingBox();
    const tarjetas = vitrina.locator('.vitrina__tarjeta');
    const arriba = await tarjetas.nth(0).boundingBox();
    const abajo = await tarjetas.nth(1).boundingBox();
    expect(arriba.x).toBeGreaterThan(grande.x + grande.width - 1);
    expect(abajo.y).toBeGreaterThan(arriba.y + arriba.height - 1);
});
