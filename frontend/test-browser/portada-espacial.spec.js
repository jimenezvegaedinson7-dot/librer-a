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

async function api(page) {
    await page.route(`${API}/**`, (r) => {
        const ruta = new URL(r.request().url()).pathname;
        if (ruta === '/api/libros') return r.fulfill({ json: libros });
        return r.fulfill({ json: { success: true, data: [] } });
    });
}

async function abrir(page) {
    await api(page);
    await page.goto('/');
    const carrusel = page.getByRole('region', { name: 'Últimos libros agregados', exact: true });
    await expect(carrusel).toBeVisible({ timeout: 30000 });
    await expect(carrusel.getByRole('link')).toHaveCount(16);
    return carrusel;
}

test('la portada muestra un estante editorial estático sin escena 3D', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (error) => errores.push(error.message));
    const prohibidas = [];
    page.on('request', (peticion) => {
        if (peticion.url().includes('/anuncios/protagonista')) prohibidas.push(peticion.url());
    });
    const carrusel = await abrir(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Libros y anuncios de MATIDANA Libros y Cultura');
    await expect(page.getByText('Últimos libros agregados', { exact: true })).toBeVisible();
    const titulo = page.getByRole('heading', { name: /Las ideas no se quedan quietas/ });
    const tamano = await titulo.evaluate((elemento) => parseFloat(getComputedStyle(elemento).fontSize));
    expect(tamano).toBeGreaterThanOrEqual(24);
    expect(tamano).toBeLessThanOrEqual(44);
    await expect(titulo.locator('em')).toHaveText('Tampoco nuestros libros.');
    const escalera = await page.evaluate(() => [
        '.portada3d__orbite-texto h2',
        '.portada3d__orbite-texto h2 em',
        '.portada3d__orbite-subtitulo'
    ].map((selector) => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)));
    expect(escalera[1]).toBeGreaterThan(escalera[0]);
    expect(escalera[0]).toBeGreaterThan(escalera[2]);
    const adorno = await page.locator('.portada3d__orbite-texto').evaluate((elemento) => getComputedStyle(elemento, '::before').content);
    expect(adorno).toBe('none');
    await expect(page.locator('.portada3d__eyebrow')).toHaveText('Catálogo MATIDANA');
    await expect(page.locator('.portada3d__orbite-descripcion')).toContainText('Portadas reales del catálogo');
    await expect(page.locator('.portada3d__enlace')).toHaveAttribute('href', '/catalogo');
    await expect(page.locator('.portada3d__plataforma')).toHaveCount(0);
    await expect(page.locator('.portada3d canvas')).toHaveCount(0);
    await expect(page.getByText(/libro destacado/i)).toHaveCount(0);
    await expect(carrusel.getByRole('button')).toHaveCount(0);
    await expect(page.getByText(/Arrastra|siempre en movimiento|Una perspectiva distinta/i)).toHaveCount(0);
    const animaciones = await carrusel.evaluate((elemento) => elemento.getAnimations({ subtree: true }).length);
    expect(animaciones).toBe(0);
    expect(prohibidas).toEqual([]);
    expect(errores).toEqual([]);
    const enlaces = await carrusel.getByRole('link').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
    expect(new Set(enlaces)).toEqual(new Set(libros.map((libro) => `/libro/${libro.id_libro}`)));
});

test('el bloque de texto no choca con el estante', async ({ page }) => {
    await abrir(page);
    const resultado = await page.evaluate(() => {
        const texto = document.querySelector('.portada3d__orbite-texto').getBoundingClientRect();
        const pista = document.querySelector('.portada3d__carrusel-pista').getBoundingClientRect();
        const enlaces = [...document.querySelectorAll('.portada3d__carrusel-link')].map((elemento) => elemento.getBoundingClientRect());
        return {
            choca: enlaces.some((caja) => caja.left < texto.right && caja.right > texto.left && caja.top < texto.bottom && caja.bottom > texto.top),
            separacion: pista.left - texto.right,
            pistaArriba: pista.top,
            textoArriba: texto.top
        };
    });
    expect(resultado.choca).toBe(false);
    expect(resultado.separacion).toBeGreaterThan(0);
    expect(resultado.pistaArriba).toBeLessThan(resultado.textoArriba + 80);
    const relleno = await page.locator('.portada3d__orbite').evaluate((elemento) => {
        const estilo = getComputedStyle(elemento);
        return { superior: parseFloat(estilo.paddingTop), inferior: parseFloat(estilo.paddingBottom) };
    });
    expect(relleno.superior).toBeLessThanOrEqual(72);
    expect(relleno.inferior).toBeLessThanOrEqual(56);
});

test('el estante se desplaza de forma horizontal sin rotaciones', async ({ page }) => {
    const carrusel = await abrir(page);
    const pista = carrusel.locator('.portada3d__carrusel-pista');
    await expect(pista).toHaveCSS('animation-name', 'none');
    await expect(carrusel.locator('.portada3d__carrusel-item').first()).toHaveCSS('animation-name', 'none');
    expect(await pista.evaluate((elemento) => getComputedStyle(elemento).gridAutoFlow)).toBe('column');
    const desplazamiento = await pista.evaluate((elemento) => {
        const maximo = elemento.scrollWidth - elemento.clientWidth;
        elemento.scrollLeft = 160;
        return { maximo, actual: elemento.scrollLeft };
    });
    expect(desplazamiento.maximo).toBeGreaterThan(160);
    expect(desplazamiento.actual).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('las portadas no se cortan dentro del estante', async ({ page }) => {
    const carrusel = await abrir(page);
    const recortes = await carrusel.locator('.portada3d__carrusel-item').evaluateAll((items) => {
        const pista = items[0].parentElement.getBoundingClientRect();
        return items.map((item) => {
            const caja = item.getBoundingClientRect();
            return { arriba: caja.top - pista.top, abajo: caja.bottom - pista.top, alto: pista.height };
        });
    });
    expect(recortes.every(({ arriba, abajo, alto }) => arriba >= -4 && abajo <= alto + 4)).toBe(true);
    const estilos = await carrusel.evaluate((elemento) => {
        const pista = elemento.querySelector('.portada3d__carrusel-pista');
        return {
            pista: getComputedStyle(pista).overflow,
            carrusel: getComputedStyle(elemento).overflow,
            imagen: getComputedStyle(elemento.querySelector('.portada3d__apilar-tapa img')).objectFit
        };
    });
    expect(estilos.pista).toContain('auto');
    expect(estilos.carrusel).toBe('visible');
    expect(estilos.imagen).toBe('contain');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [width, height] of [[320, 667], [390, 844], [1440, 1000]]) {
    test(`estante editorial responsive a ${width}px sin desbordes`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        const carrusel = await abrir(page);
        await expect(carrusel.locator('.portada3d__carrusel-pista')).toBeVisible();
        expect(await carrusel.locator('.portada3d__carrusel-item').first().evaluate((elemento) => getComputedStyle(elemento).animationName)).toBe('none');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
}

test('con movimiento reducido el estante queda quieto y accesible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const carrusel = await abrir(page);
    await expect(carrusel.locator('.portada3d__carrusel-item').first()).toHaveCSS('animation-name', 'none');
    await expect(carrusel.locator('.portada3d__carrusel-link')).toHaveCount(16);
});
