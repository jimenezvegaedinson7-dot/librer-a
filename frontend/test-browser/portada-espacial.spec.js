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

function animacionesCarrusel(pista, propiedad) {
    return pista.evaluate((elemento, nombre) => elemento.getAnimations({ subtree: true })
        .filter((animacion) => animacion.animationName === 'p3-carrusel-orbita' || animacion.animationName === 'p3-carrusel-endereza')
        .map((animacion) => animacion[nombre]), propiedad);
}

test('la portada muestra el carrusel ORBIT sin libro protagonista ni escena 3D', async ({ page }) => {
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
    expect(tamano).toBeGreaterThanOrEqual(40);
    expect(tamano).toBeLessThanOrEqual(60);
    await expect(titulo.locator('em')).toHaveText('Tampoco nuestros libros.');
    const escalera = await page.evaluate(() => [
        '.portada3d__orbite-texto h2',
        '.portada3d__orbite-texto h2 em',
        '.portada3d__orbite-subtitulo'
    ].map((selector) => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)));
    expect(escalera[1]).toBeGreaterThan(escalera[0]);
    expect(escalera[0]).toBeGreaterThan(escalera[2]);
    const adorno = await page.locator('.portada3d__orbite-texto').evaluate((elemento) => {
        const estilo = getComputedStyle(elemento, '::before');
        return { contenido: estilo.content, tamano: parseFloat(estilo.fontSize) };
    });
    expect(adorno.contenido).toContain('“');
    expect(adorno.tamano).toBeGreaterThan(80);
    await expect(page.locator('.portada3d__orbite-lema')).toHaveCount(0);
    await expect(page.locator('.portada3d__boton')).toHaveCount(0);
    await expect(page.locator('.portada3d__plataforma')).toBeVisible();
    const plataforma = await page.locator('.portada3d__plataforma').evaluate((elemento) => {
        const estilo = getComputedStyle(elemento);
        const caja = elemento.getBoundingClientRect();
        return { fondo: estilo.backgroundImage, eventos: estilo.pointerEvents, ancho: caja.width, alto: caja.height, opacidad: parseFloat(estilo.opacity), desenfoque: estilo.filter };
    });
    expect(plataforma.fondo).toContain('radial-gradient');
    expect(plataforma.eventos).toBe('none');
    expect(plataforma.ancho).toBeGreaterThan(120);
    expect(plataforma.alto).toBeGreaterThan(14);
    expect(plataforma.opacidad).toBeLessThan(1);
    expect(plataforma.desenfoque).toContain('blur');
    await expect(page.locator('.portada3d canvas')).toHaveCount(0);
    await expect(page.getByText(/libro destacado/i)).toHaveCount(0);
    await expect(carrusel.getByRole('button')).toHaveCount(0);
    await expect(page.getByText('Arrastra o usa las flechas · siempre en movimiento')).toHaveCount(0);
    await expect(page.getByText('Una perspectiva distinta')).toHaveCount(0);
    await expect(page.locator('.portada3d__eyebrow')).toHaveCount(0);
    expect(prohibidas).toEqual([]);
    expect(errores).toEqual([]);
    const enlaces = await carrusel.getByRole('link').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
    expect(new Set(enlaces)).toEqual(new Set(libros.map((libro) => `/libro/${libro.id_libro}`)));
});

test('el bloque de texto no choca con el carrusel circular', async ({ page }) => {
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

test('carrusel ORBIT: arrastre y rotación continua al pasar el cursor', async ({ page }) => {
    const carrusel = await abrir(page);
    const giro = () => carrusel.evaluate((elemento) => getComputedStyle(elemento).getPropertyValue('--giro-manual').trim());
    const item = carrusel.locator('.portada3d__carrusel-item').first();
    const enlace = item.locator('.portada3d__carrusel-link');
    const pista = carrusel.locator('.portada3d__carrusel-pista');
    const transformPista = () => pista.evaluate((elemento) => getComputedStyle(elemento).transform);
    await expect(item).toHaveCSS('animation-name', 'p3-carrusel-orbita');
    await expect(item).toHaveCSS('animation-duration', '42s');
    await expect(enlace).toHaveCSS('animation-name', 'p3-carrusel-endereza');
    expect(await giro()).toBe('0deg');

    const transformInicial = await transformPista();
    const caja = await pista.boundingBox();
    const centro = { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };
    await page.mouse.move(centro.x, centro.y);
    await page.mouse.down();
    await expect.poll(async () => (await animacionesCarrusel(pista, 'playState')).every((estado) => estado === 'paused')).toBe(true);
    const tiemposPausados = await animacionesCarrusel(pista, 'currentTime');
    const antes = await item.evaluate((elemento) => getComputedStyle(elemento).transform);
    await page.mouse.move(centro.x + 80, centro.y, { steps: 6 });
    expect(await item.evaluate((elemento) => getComputedStyle(elemento).transform)).not.toBe(antes);
    const desplazamientoEsperado = (80 * 0.35 / 360) * 42000;
    await expect.poll(async () => {
        const tiemposDurante = await animacionesCarrusel(pista, 'currentTime');
        return tiemposDurante.every((tiempo, i) => Math.abs(tiempo - tiemposPausados[i] - desplazamientoEsperado) < 200);
    }).toBe(true);
    await page.mouse.up();
    const giroDerecha = parseFloat(await giro());
    expect(giroDerecha).toBeGreaterThan(0);
    await expect.poll(async () => (await animacionesCarrusel(pista, 'playState')).every((estado) => estado === 'running')).toBe(true);
    expect(await transformPista()).toBe(transformInicial);

    await page.mouse.down();
    const antesRetroceso = await item.evaluate((elemento) => getComputedStyle(elemento).transform);
    await page.mouse.move(centro.x, centro.y, { steps: 6 });
    expect(await item.evaluate((elemento) => getComputedStyle(elemento).transform)).not.toBe(antesRetroceso);
    await page.mouse.up();
    expect(parseFloat(await giro())).toBeLessThan(giroDerecha);

    await item.hover({ force: true });
    const despues = await item.evaluate((elemento) => getComputedStyle(elemento).transform);
    await page.waitForTimeout(500);
    expect(await item.evaluate((elemento) => getComputedStyle(elemento).transform)).not.toBe(despues);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mantener presionada una portada pausa y al soltar continúa', async ({ page }) => {
    const carrusel = await abrir(page);
    const pista = carrusel.locator('.portada3d__carrusel-pista');
    await expect.poll(async () => (await animacionesCarrusel(pista, 'playState')).every((estado) => estado === 'running')).toBe(true);

    await page.evaluate(() => {
        document.querySelector('.portada3d__carrusel-link').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0 }));
    });
    await expect.poll(async () => (await animacionesCarrusel(pista, 'playState')).every((estado) => estado === 'paused')).toBe(true);

    await page.evaluate(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', clientX: 0, clientY: 0 }));
    });
    await expect.poll(async () => (await animacionesCarrusel(pista, 'playState')).every((estado) => estado === 'running')).toBe(true);
});

test('las portadas no se cortan dentro de la pista circular', async ({ page }) => {
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
    expect(estilos).toEqual({ pista: 'visible', carrusel: 'visible', imagen: 'contain' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [width, height] of [[320, 667], [390, 844], [1440, 1000]]) {
    test(`carrusel ORBIT responsive a ${width}px sin desbordes`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        const carrusel = await abrir(page);
        await expect(carrusel.locator('.portada3d__carrusel-pista')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
}

test('con movimiento reducido el carrusel queda quieto y accesible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const carrusel = await abrir(page);
    await expect(carrusel.locator('.portada3d__carrusel-item').first()).toHaveCSS('animation-name', 'none');
    await expect(carrusel.locator('.portada3d__carrusel-link')).toHaveCount(16);
});
