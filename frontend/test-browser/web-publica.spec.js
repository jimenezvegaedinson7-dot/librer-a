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

async function apiPublica(page, { falla = false, vacia = false } = {}) {
    await page.route(`${API}/libros`, (r) => (falla ? r.fulfill({ status: 503, json: {} }) : r.fulfill({ json: vacia ? [] : LIBROS })));
    await page.route(`${API}/empresa`, (r) => r.fulfill({ json: { success: true, empresa: { razon_social: 'FLORES SALINAS SARA', nombre_comercial: 'MATIDANA', ruc: '10447545387' } } }));
}

const menu = (page) => page.getByRole('navigation', { name: 'Principal' });

test.use({ reducedMotion: 'reduce' });

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

test('acceso administrativo lleva al login del panel, que no se indexa', async ({ page }) => {
    await apiPublica(page);
    await page.goto('/');
    await page.locator('.franja__admin').click();
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
