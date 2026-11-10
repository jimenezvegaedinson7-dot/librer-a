import { test, expect } from '@playwright/test';

const cliente = { id_usuario: 2, nombre: 'Cliente privado', apellido: 'Prueba', email: 'privado@example.test', rol: 'cliente', estado: 1 };
const portada = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const libro = (id, titulo, extra = {}) => ({
    id_libro: id,
    titulo,
    autor: 'Autor público',
    categoria: 'Novela',
    id_autor: 1,
    id_categoria: 1,
    precio: 40,
    precio_final: 30,
    descuento_vigente: 1,
    descuento_porcentaje_efectivo: 25,
    stock: 5,
    estado: 1,
    portada,
    ...extra
});
const libros = [
    libro(1, 'Libro comprado'),
    libro(2, 'Otra lectura del autor'),
    libro(3, 'Una novela por descubrir'),
    libro(4, 'Agotado de prueba', { stock: 0 }),
    libro(5, 'Libro retirado', { estado: 0 })
];
const eventos = (page) => page.evaluate(() => (window.dataLayer || []).map((x) => Array.from(x)).filter((x) => x[0] === 'event'));

test.beforeEach(async ({ baseURL }, info) => {
    test.skip(!info.config.metadata.ga4 || !baseURL, 'Se ejecuta con playwright.analytics.config.js y una etiqueta de prueba interceptada.');
});

async function preparar(page, { intento = true, pagadaInicial = false, errorInicial = false } = {}) {
    let pagada = pagadaInicial;
    let fallar = errorInicial;
    const solicitudes = [];
    const venta = () => ({
        id_venta: 10,
        id_usuario: 2,
        estado: pagada ? 'pagada' : 'pendiente',
        estado_entrega: 'pendiente',
        tipo_entrega: 'tienda',
        canal_compra: 'web',
        external_reference: 'orden-10',
        total: 30,
        costo_envio: 0,
        direccion: 'Dirección privada',
        cliente_documento: '12345678',
        detalle: [{ id_libro: 1, titulo: 'Libro comprado', cantidad: 1, precio_unitario: 30, subtotal: 30 }]
    });
    await page.addInitScript(
        ({ cliente, intento }) => {
            if (!sessionStorage.getItem('ga4-prueba-iniciada')) {
                localStorage.setItem('libreria-web-cliente-v1', JSON.stringify({ usuario: cliente, token: 'cliente-token', generacion: 'ga4-prueba' }));
                localStorage.setItem('libreria-web-carrito-2', JSON.stringify({ items: [{ id_libro: 1, cantidad: 1, linea: 'linea-original', retiradas: 0 }], confirmadas: [] }));
                if (intento)
                    localStorage.setItem(
                        'libreria-web-intento-2',
                        JSON.stringify({
                            id_usuario: 2,
                            cuerpo: { items: [{ id_libro: 1, cantidad: 1 }], idempotencia_clave: 'ga4-prueba' },
                            items: [{ id_libro: 1, cantidad: 1 }],
                            carrito: [{ id_libro: 1, cantidad: 1, linea: 'linea-original', retiradas: 0 }],
                            orden: { id_venta: 10 }
                        })
                    );
                sessionStorage.setItem('ga4-prueba-iniciada', 'si');
            }
        },
        { cliente, intento }
    );
    await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === 'www.googletagmanager.com') return route.fulfill({ contentType: 'application/javascript', body: '' });
        if (url.pathname.startsWith('/api/')) {
            const responder = (data) => route.fulfill({ json: { success: true, data, anuncio: null } });
            if (url.pathname === '/api/libros') return responder(libros);
            if (/^\/api\/libros\/\d+$/.test(url.pathname)) return responder(libros.find((l) => String(l.id_libro) === url.pathname.split('/').at(-1)));
            if (url.pathname === '/api/usuarios/perfil') return responder(cliente);
            if (url.pathname === '/api/pagos/capacidades') return responder({ compras_web: true, moneda: 'PEN' });
            if (url.pathname === '/api/ventas/mis-ventas') return responder([venta()]);
            if (url.pathname === '/api/ventas/10') return responder(venta());
            if (url.pathname === '/api/libros/recomendados') {
                solicitudes.push(route.request().headers().authorization);
                if (fallar) {
                    return route.fulfill({ status: 503, json: { success: false, mensaje: 'Temporalmente no disponible.' } });
                }
                return responder(libros.map((l) => ({ ...l, motivo_recomendacion: 'autor_categoria' })));
            }
            return responder([]);
        }
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
        return route.continue();
    });
    return {
        aprobar: () => {
            pagada = true;
        },
        recuperar: () => {
            fallar = false;
        },
        solicitudes
    };
}

for (const ancho of [390, 1440]) {
    test(`compra confirmada y sugerencias personales ${ancho}px`, async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: 1000 });
        const errores = [];
        page.on('pageerror', (error) => errores.push(error.message));
        const control = await preparar(page);
        await page.goto('/mis-compras?orden=privado-no-exportar');
        await expect(page.getByText('Pendiente de pago', { exact: true })).toBeVisible();
        expect((await eventos(page)).filter((x) => x[1] === 'purchase')).toHaveLength(0);
        await expect(page.getByRole('heading', { name: 'Otros libros que podrían gustarte' })).toHaveCount(0);
        control.aprobar();
        await page.getByRole('button', { name: 'Actualizar compras', exact: true }).click();
        const seccion = page.getByRole('region', { name: 'Otros libros que podrían gustarte' });
        await expect(seccion.getByRole('heading', { name: 'Otra lectura del autor' })).toBeVisible();
        await expect(seccion.locator('.tarjeta-libro')).toHaveCount(2);
        expect(control.solicitudes).toEqual(['Bearer cliente-token']);
        await expect.poll(async () => (await eventos(page)).filter((x) => x[1] === 'purchase').length).toBe(1);
        const compra = (await eventos(page)).find((x) => x[1] === 'purchase')[2];
        expect(compra).toMatchObject({ transaction_id: 'MATIDANA-10', value: 30, shipping: 0, currency: 'PEN' });
        const serializado = JSON.stringify(await eventos(page));
        for (const privado of ['privado-no-exportar', cliente.email, cliente.nombre, '12345678', 'Dirección privada', 'cliente-token']) expect(serializado).not.toContain(privado);
        await seccion.scrollIntoViewIfNeeded();
        await expect.poll(async () => (await eventos(page)).filter((x) => x[1] === 'view_item_list').length).toBe(1);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await expect(page.getByRole('heading', { level: 1, name: 'Mis compras' })).toBeInViewport();
        await page.screenshot({ path: test.info().outputPath(`recomendaciones-${ancho}.png`), fullPage: true });
        await seccion.getByRole('button', { name: 'Agregar Otra lectura del autor al carrito', exact: true }).click();
        await expect.poll(async () => (await eventos(page)).filter((x) => x[1] === 'add_to_cart').length).toBe(1);
        await seccion.getByRole('link', { name: 'Ver detalle de Otra lectura del autor', exact: true }).click();
        await expect(page).toHaveURL(/\/libro\/2$/);
        await expect.poll(async () => (await eventos(page)).filter((x) => x[1] === 'select_item').length).toBe(1);
        await expect(page.getByRole('heading', { level: 1, name: 'Otra lectura del autor' })).toBeVisible();
        await page.getByRole('button', { name: 'Comprar ahora', exact: true }).click();
        await expect(page).toHaveURL(/\/checkout$/);
        await expect.poll(async () => (await eventos(page)).filter((x) => x[1] === 'begin_checkout').length).toBe(1);
        const checkout = (await eventos(page)).find((x) => x[1] === 'begin_checkout')[2];
        expect(checkout.items[0]).toMatchObject({ item_id: '2', quantity: 2, price: 30 });
        await page.goto('/mis-compras');
        await expect(page.getByRole('heading', { name: 'Otros libros que podrían gustarte' })).toBeVisible();
        expect((await eventos(page)).filter((x) => x[1] === 'purchase')).toHaveLength(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(errores).toEqual([]);
    });
}

test('consultar compras antiguas no crea compras nuevas en Google Analytics', async ({ page }) => {
    await preparar(page, { intento: false, pagadaInicial: true });
    await page.goto('/mis-compras');
    await expect(page.getByRole('heading', { name: 'Otra lectura del autor' })).toBeVisible();
    await page.getByRole('button', { name: 'Actualizar compras', exact: true }).click();
    await expect(page.getByText('Pagada', { exact: true })).toBeVisible();
    expect((await eventos(page)).filter((x) => x[1] === 'purchase')).toHaveLength(0);
});

test('la recuperación de sugerencias mantiene visible la compra y permite reintentar', async ({ page }) => {
    const control = await preparar(page, { intento: false, pagadaInicial: true, errorInicial: true });
    await page.goto('/mis-compras');
    await expect(page.getByText('Pagada', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar sugerencias', exact: true })).toBeVisible();
    control.recuperar();
    await page.getByRole('button', { name: 'Reintentar sugerencias', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Otra lectura del autor' })).toBeVisible();
});

test('GA4 registra una ficha y su categoría sin enviar la consulta privada', async ({ page }) => {
    await preparar(page, { intento: false });
    await page.goto('/libro/2?token=privado-no-exportar');
    await expect(page.getByRole('heading', { level: 1, name: 'Otra lectura del autor' })).toBeVisible();
    await expect.poll(async () => (await eventos(page)).filter((x) => x[1] === 'view_item').length).toBe(1);
    const datos = (await eventos(page)).find((x) => x[1] === 'view_item')[2];
    expect(datos.items[0]).toMatchObject({ item_id: '2', item_category: 'Novela', autor_libro: 'Autor público', price: 30 });
    expect(datos.page_location).toMatch(/\/libro\/2$/);
    expect(JSON.stringify(datos)).not.toContain('privado-no-exportar');
});
