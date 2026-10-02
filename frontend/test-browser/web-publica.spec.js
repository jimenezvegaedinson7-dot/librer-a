import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

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
    // El video lo sube el administrador, así que por defecto no hay ninguno
    // activo. Las pruebas del video pasan uno explícito.
    await page.route(`${API}/anuncios`, (r) => r.fulfill({ json: { success: true, anuncio } }));
    // El archivo del anuncio se sirve con un WebM real y diminuto: la portada
    // retira la sección si el video no carga, así que una URL inventada no basta.
    if (anuncio?.video_url && !anuncio.roto) {
        await page.route(anuncio.video_url, (r) => r.fulfill({ body: VIDEO_PRUEBA, contentType: 'video/webm' }));
    }
}

const menu = (page) => page.getByRole('navigation', { name: 'Principal' });

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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Una librería de verdad,\s*ahora en tu teléfono\./);
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
    await expect(android).toHaveAttribute('href', /github\.com\/jimenezvegaedinson7-dot\/librer-a\/releases\/download\/v1\.0\.0\/libreria-1\.0\.1\.apk$/);
    await expect(page.locator('main')).toContainText('56.8 MB');
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
    await grupo.getByRole('radio', { name: /A domicilio/ }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(grupo.getByRole('radio', { name: /Recoger en tienda/ })).toHaveAttribute('aria-checked', 'true');
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

// Video de anuncios del inicio. Es solo el video: sin título, sin texto propio
// y sin botón. Lo sube el administrador, así que sin anuncio activo la sección
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

test('video del inicio: el anuncio activo se reproduce solo, sin título ni botón', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await apiPublica(page, {
        anuncio: { id_anuncio: 7, titulo: 'Promo', video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4' },
    });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    const seccion = page.locator('.video-destacado');
    await expect(seccion).toHaveCount(1);

    const video = seccion.locator('video');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute('src', /anuncio\.mp4$/);
    await expect(video).toHaveAttribute('controls', '');

    // Ni una palabra de texto propio: ni encabezado, ni párrafo, ni enlace.
    await expect(seccion.locator('h1, h2, h3, p, a, button')).toHaveCount(0);
    const texto = await seccion.innerText();
    for (const palabra of ['autor', 'firma', 'catálogo', 'Novedades', 'Anuncios', 'Promo']) {
        expect(texto.toLowerCase()).not.toContain(palabra.toLowerCase());
    }
    expect(errores).toHaveLength(0);
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

test('video del inicio: ocupa todo el ancho el anuncio que llega de la API', async ({ page }) => {
    await apiPublica(page, {
        anuncio: { id_anuncio: 7, titulo: 'Promo', video_url: 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4' },
    });
    await page.goto('/');
    await page.waitForSelector('#precarga', { state: 'detached' });

    const video = page.locator('.video-destacado__marco video');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute('src', 'https://res.cloudinary.com/x/video/upload/v1/anuncio.mp4');

    // A todo el ancho: el video mide lo mismo que el contenedor de la sección.
    const anchos = await page.evaluate(() => {
        const marco = document.querySelector('.video-destacado__marco');
        const contenedor = document.querySelector('.video-destacado .contenedor');
        return { marco: marco.getBoundingClientRect().width, contenedor: contenedor.getBoundingClientRect().width };
    });
    expect(Math.abs(anchos.marco - anchos.contenedor)).toBeLessThan(2);

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
    expect(errores).toHaveLength(0);
});

test('catálogo: el precio se resalta en pastilla verde clara', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/catalogo');
    const precio = page.locator('.tarjeta-libro__precio').first();
    await expect(precio).toBeVisible();
    const estilos = await precio.evaluate((e) => {
        const s = getComputedStyle(e);
        return { fondo: s.backgroundColor, color: s.color, radio: s.borderRadius };
    });
    // Verde claro de fondo con texto verde oscuro: resalta y mantiene contraste.
    expect(estilos.fondo).toBe('rgb(220, 236, 231)');
    expect(estilos.color).toBe('rgb(1, 58, 51)');
    expect(estilos.radio).toBe('999px');
});

test('el botón principal es amarillo', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/descargar');
    const boton = page.locator('.descargar .boton, .seccion.crema .boton').first();
    await expect(boton).toBeVisible();
    const estilos = await boton.evaluate((e) => {
        const s = getComputedStyle(e);
        return { fondo: s.backgroundColor, color: s.color };
    });
    expect(estilos.fondo).toBe('rgb(235, 170, 32)');
    expect(estilos.color).toBe('rgb(17, 17, 17)');
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

    expect(medido.pieFondo).toBe('rgb(1, 58, 51)');
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
        return { marca: leer('.boton--marca'), blanco: leer('.boton--blanco') };
    });
    expect(colores.marca.fondo).toBe('rgb(0, 77, 67)');
    expect(colores.marca.texto).toBe('rgb(255, 255, 255)');
    expect(colores.blanco.fondo).toBe('rgb(255, 255, 255)');
    expect(colores.blanco.texto).toBe('rgb(0, 77, 67)');
});
