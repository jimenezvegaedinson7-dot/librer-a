import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const cliente = { id_usuario: 2, nombre: 'Cliente', apellido: 'Web', email: 'cliente@example.test', rol: 'cliente', estado: 1 };
const libro = {
    id_libro: 1,
    titulo: 'Libro de prueba web',
    autor: 'Autor de prueba',
    categoria: 'Novela',
    precio: 100,
    precio_final: 75,
    descuento_vigente: 1,
    descuento_porcentaje_efectivo: 25,
    stock: 5,
    estado: 1,
    portada: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    sinopsis: 'Descripción del libro de prueba.'
};
const PORTADA = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

async function api(page, { rol = 'cliente', fallarPrimera = false, tarifa = 5 } = {}) {
    let tarifaVigente = tarifa;
    const ordenes = [],
        favoritosQuitados = [];
    let pagada = false,
        cancelada = false,
        favoritos = [{ ...libro, portada: PORTADA }];
    await page.addInitScript(() => {
        localStorage.setItem('token', 'token-administrador');
        localStorage.setItem('usuario', JSON.stringify({ id_usuario: 1, nombre: 'Administrador', rol: 'administrador' }));
    });
    await page.route(`${API}/**`, async (route) => {
        const req = route.request(),
            ruta = new URL(req.url()).pathname;
        if (ruta === '/api/libros') return route.fulfill({ json: { success: true, data: [{ ...libro, portada: PORTADA }] } });
        if (ruta === '/api/libros/1') return route.fulfill({ json: { success: true, data: libro } });
        if (ruta === '/api/auth/login') return route.fulfill({ json: { success: true, token: 'token-cliente', data: { ...cliente, rol } } });
        if (ruta === '/api/auth/registro')
            return route.fulfill({ status: 201, json: { success: true, requiere_verificacion_email: true, mensaje: 'Revisa tu correo para verificar tu cuenta.' } });
        if (ruta === '/api/auth/verificar-email') return route.fulfill({ json: { success: true, mensaje: 'Cuenta verificada correctamente.' } });
        if (ruta === '/api/usuarios/perfil') return route.fulfill({ json: { success: true, data: cliente } });
        if (ruta === '/api/zonas-delivery')
            return route.fulfill({ json: { success: true, data: [{ id_zona: 1, nombre: 'Ciudad de Pallasca', tarifa: tarifaVigente, estado: 1 }] } });
        if (ruta === '/api/pagos/capacidades') return route.fulfill({ json: { success: true, data: { compras_web: true, moneda: 'PEN', cobertura: 'pallasca' } } });
        if (ruta === '/api/pagos/crear-orden') {
            ordenes.push({ body: req.postDataJSON(), token: req.headers().authorization });
            if (fallarPrimera && ordenes.length === 1) return route.abort('failed');
            const envio = req.postDataJSON().tipo_entrega === 'domicilio' ? tarifaVigente : 0;
            return route.fulfill({
                status: 201,
                json: { success: true, data: { id_venta: 10, order_id: 'orden_web_10', total: 75 + envio, costo_envio: envio, checkout_url: `${API}/pagos/checkout/orden_web_10` } }
            });
        }
        if (ruta === '/api/ventas/mis-ventas')
            return route.fulfill({
                json: {
                    success: true,
                    data: [
                        {
                            id_venta: 10,
                            canal_compra: 'web',
                            origen: 'app',
                            cobertura_entrega: 'pallasca',
                            tipo_entrega: 'tienda',
                            estado: cancelada ? 'cancelada' : pagada ? 'pagada' : 'pendiente',
                            estado_entrega: 'pendiente',
                            total: 75,
                            costo_envio: 0,
                            external_reference: 'orden_web_10',
                            detalle: [{ id_libro: 1, titulo: libro.titulo, cantidad: 1, precio_unitario: 75, subtotal: 75 }]
                        }
                    ]
                }
            });
        if (ruta === '/api/pagos/orden_web_10') {
            pagada = true;
            return route.fulfill({ json: { success: true, data: { status: 'APPROVED' } } });
        }
        if (ruta === '/api/favoritos') return route.fulfill({ json: { success: true, data: favoritos } });
        if (ruta === '/api/favoritos/1' && req.method() === 'DELETE') {
            favoritosQuitados.push(req.headers().authorization);
            favoritos = [];
            return route.fulfill({ json: { success: true } });
        }
        if (ruta === '/api/anuncios') return route.fulfill({ json: { success: true, anuncio: null } });
        if (ruta === '/api/app/version')
            return route.fulfill({
                json: {
                    version: '1.0.4',
                    versionCode: 5,
                    sha256: 'a'.repeat(64),
                    apkUrl: 'https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/v1.0.4/libreria-1.0.4.apk'
                }
            });
        return route.fulfill({ json: { success: true, data: [] } });
    });
    return {
        ordenes,
        favoritosQuitados,
        cancelar: () => {
            cancelada = true;
        },
        cambiarTarifa: (n) => {
            tarifaVigente = n;
        }
    };
}

async function login(page) {
    await page.getByLabel('Correo electrónico', { exact: true }).fill(cliente.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('Compra-Web-123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function hastaCheckout(page) {
    await page.goto('/catalogo');
    await page.getByRole('button', { name: `Agregar ${libro.titulo} al carrito`, exact: true }).click();
    await page.locator('.cabecera .compra-carrito').click();
    await expect(page.getByText('S/ 75.00 por unidad', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Continuar con la compra', exact: true }).click();
    await page.getByRole('link', { name: 'Ingresar para comprar', exact: true }).click();
    await login(page);
    await expect(page.getByLabel('Número de documento', { exact: true })).toBeVisible();
}

for (const ancho of [1024, 1440]) {
    test(`cabecera ${ancho}px: carrito legible en hover y sin hamburguesa de escritorio`, async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: 900 });
        await api(page);
        await page.goto('/cuenta');
        await login(page);
        const carrito = page.locator('.cabecera .compra-carrito');
        const texto = carrito.locator('span');
        const contraste = () => carrito.evaluate(el => {
            const luminancia = color => {
                const c = color.match(/[\d.]+/g).slice(0, 3).map(v => {
                    const x = Number(v) / 255;
                    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
                });
                return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
            };
            let fondo = el;
            while (fondo.parentElement && getComputedStyle(fondo).backgroundColor === 'rgba(0, 0, 0, 0)') fondo = fondo.parentElement;
            const a = luminancia(getComputedStyle(el.querySelector('span')).color);
            const b = luminancia(getComputedStyle(fondo).backgroundColor);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
        for (const cantidad of [0, 1]) {
            if (cantidad) {
                await page.goto('/catalogo');
                await page.getByRole('button', { name: `Agregar ${libro.titulo} al carrito`, exact: true }).click();
            }
            await expect(texto).toHaveText(cantidad ? 'Carrito (1)' : 'Carrito');
            await expect(carrito).not.toHaveAttribute('data-cantidad');
            expect(await carrito.evaluate((el) => getComputedStyle(el, '::after').content)).toBe('none');
            await carrito.hover();
            await expect(texto).toBeVisible();
            await page.locator('.cabecera').screenshot({ path: test.info().outputPath(`carrito-hover-${ancho}-${cantidad}.png`) });
            expect(await contraste()).toBeGreaterThanOrEqual(4.5);
            const iconoCarrito = await carrito.locator('svg').boundingBox();
            const iconoCuenta = await page.locator('.cabecera .compra-cuenta svg').boundingBox();
            const etiquetaCarrito = await texto.boundingBox();
            const etiquetaCuenta = await page.locator('.cabecera .compra-cuenta__texto').boundingBox();
            expect(Math.abs(iconoCarrito.y + iconoCarrito.height / 2 - iconoCuenta.y - iconoCuenta.height / 2)).toBeLessThan(1);
            expect(Math.abs(etiquetaCarrito.y + etiquetaCarrito.height / 2 - etiquetaCuenta.y - etiquetaCuenta.height / 2)).toBeLessThan(1);
            await page.mouse.move(0, 0);
            await carrito.focus();
            expect(await contraste()).toBeGreaterThanOrEqual(4.5);
            await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toBeHidden();
            await expect(page.getByRole('navigation', { name: 'Principal', exact: true })).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
        await carrito.click();
        await expect(page).toHaveURL(/\/carrito$/);
        await expect(page.getByText('S/ 75.00 por unidad', { exact: true })).toBeVisible();
    });
}

for (const ancho of [390, 1440]) {
    test(`compra web ${ancho}px: carrito, sesión separada, recojo, PayU y confirmación`, async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: 1000 });
        const errores = [];
        page.on('pageerror', (e) => errores.push(e.message));
        const peticiones = [];
        page.on('request', (r) => {
            if (r.url().includes('/api/libros') && new URL(r.url()).pathname !== '/api/libros/recomendados') peticiones.push(r.headers().authorization);
        });
        const control = await api(page);
        await hastaCheckout(page);
        await page.getByLabel('Número de documento', { exact: true }).fill('12345678');
        await expect(page.getByRole('group', { name: 'Cómo recibir tus libros' }).getByText('Plaza de Armas, Jr. Marañón 161, Pallasca 02835', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Dirección', { exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Crear pedido y continuar al pago', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Tu pedido está creado', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Pagar con PayU', exact: true })).toHaveAttribute('href', `${API}/pagos/checkout/orden_web_10`);
        expect(control.ordenes).toHaveLength(1);
        expect(control.ordenes[0].token).toBe('Bearer token-cliente');
        expect(control.ordenes[0].body).toMatchObject({ canal_compra: 'web', tipo_entrega: 'tienda', items: [{ id_libro: 1, cantidad: 1 }] });
        expect(control.ordenes[0].body).not.toHaveProperty('costo_envio');
        expect(control.ordenes[0].body.items[0]).not.toHaveProperty('precio');
        expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('token-administrador');
        await page.screenshot({ path: test.info().outputPath(`checkout-web-${ancho}.png`), fullPage: true });
        await page.getByRole('link', { name: 'Consultar mis compras', exact: true }).click();
        await expect(page.getByText('Pendiente de pago', { exact: true })).toBeVisible();
        await expect(page.locator('.cabecera .compra-carrito')).toHaveText('Carrito (1)');
        await page.getByRole('button', { name: 'Verificar pago de compra #10', exact: true }).click();
        await expect(page.getByText('Pagada', { exact: true })).toBeVisible();
        await expect(page.locator('.cabecera .compra-carrito')).toHaveText('Carrito');
        expect(peticiones.every((t) => !t)).toBe(true);
        expect(errores).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
}
for (const width of [390, 1440])
    test(`compra web ${width}px: delivery S/5 sin selector y reintento conserva la clave`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const control = await api(page, { fallarPrimera: true });
        await hastaCheckout(page);
        await page.getByLabel('Delivery en la ciudad de Pallasca — S/ 5.00 por pedido', { exact: true }).check();
        await expect(page.getByLabel('Zona de delivery', { exact: true })).toHaveCount(0);
        await page.getByLabel('Dirección', { exact: true }).fill('Dirección de prueba Pallasca');
        await page.getByLabel('Referencia de dirección (opcional)', { exact: true }).fill('Referencia de prueba');
        await page.getByLabel('Número de documento', { exact: true }).fill('12345678');
        await expect(page.locator('.compra-resumen')).toContainText('S/ 5.00');
        await expect(page.locator('.compra-resumen')).toContainText('S/ 80.00');
        await page.screenshot({ path: test.info().outputPath('checkout-delivery-fijo.png'), fullPage: true });
        await page.getByRole('button', { name: 'Crear pedido y continuar al pago', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Recuperar mi pedido', exact: true })).toBeVisible();
        await page.reload();
        await page.getByRole('button', { name: 'Recuperar mi pedido', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Tu pedido está creado', exact: true })).toBeVisible();
        expect(control.ordenes).toHaveLength(2);
        expect(control.ordenes[1].body).toEqual(control.ordenes[0].body);
        expect(control.ordenes[1].body).toMatchObject({ tipo_entrega: 'domicilio', id_zona_delivery: 1, referencia: 'Referencia de prueba' });
        await expect(page.getByText('S/ 80.00', { exact: true })).toBeVisible();
    });
test('checkout acepta tarifa S/7.50 y revalida un cambio posterior antes de crear la compra', async ({ page }) => {
    const control = await api(page, { tarifa: 7.5 });
    await hastaCheckout(page);
    await page.getByLabel('Delivery en la ciudad de Pallasca — S/ 7.50 por pedido', { exact: true }).check();
    await page.getByLabel('Dirección', { exact: true }).fill('Jr. Comercio 123, Pallasca');
    await page.getByLabel('Número de documento', { exact: true }).fill('12345678');
    await expect(page.locator('.compra-resumen')).toContainText('S/ 82.50');
    control.cambiarTarifa(8);
    await page.getByRole('button', { name: 'Crear pedido y continuar al pago', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('La tarifa de delivery cambió');
    expect(control.ordenes).toEqual([]);
    await expect(page.locator('.compra-resumen')).toContainText('S/ 83.00');
    await page.getByRole('button', { name: 'Crear pedido y continuar al pago', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tu pedido está creado', exact: true })).toBeVisible();
    expect(control.ordenes).toHaveLength(1);
    await expect(page.getByText('S/ 83.00', { exact: true })).toBeVisible();
});
test('cuenta web: registro, verificación de correo y bloqueo del rol administrador', async ({ page }) => {
    await api(page, { rol: 'administrador' });
    await page.goto('/cuenta');
    await page.getByRole('button', { name: 'Crear una cuenta', exact: true }).click();
    await page.getByLabel('Nombre', { exact: true }).fill('Cliente');
    await page.getByLabel('Apellido', { exact: true }).fill('Web');
    await page.getByLabel('Correo electrónico', { exact: true }).fill(cliente.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('Compra-Web-123!');
    await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Compra-Web-123!');
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Verifica tu correo', exact: true })).toBeVisible();
    await page.getByLabel('Código de seis dígitos', { exact: true }).fill('123456');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await login(page);
    await expect(page.getByRole('alert')).toContainText('cuenta de cliente');
    expect(await page.evaluate(() => localStorage.getItem('libreria-web-cliente-v1'))).toBeNull();
});

test('pago cancelado conserva el carrito y libera el intento para una nueva compra', async ({ page }) => {
    const control = await api(page);
    await hastaCheckout(page);
    await page.getByLabel('Número de documento', { exact: true }).fill('12345678');
    await page.getByRole('button', { name: 'Crear pedido y continuar al pago', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tu pedido está creado', exact: true })).toBeVisible();
    control.cancelar();
    await page.getByRole('link', { name: 'Consultar mis compras', exact: true }).click();
    await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
    await expect(page.locator('.cabecera .compra-carrito')).toHaveText('Carrito (1)');
    expect(await page.evaluate(() => localStorage.getItem('libreria-web-intento-2'))).toBeNull();
    await page.locator('.cabecera .compra-carrito').click();
    await page.getByRole('link', { name: 'Continuar con la compra', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Crear pedido y continuar al pago', exact: true })).toBeVisible();
});

test('mis compras muestra la portada del catálogo y favoritos se abre desde Mi cuenta', async ({ page }) => {
    const control = await api(page);
    await page.goto('/cuenta');
    await login(page);
    await expect(page.getByRole('heading', { name: 'Mi cuenta', exact: true })).toHaveCount(1);
    await page.goto('/mis-compras');
    const compra = page.locator('.compra-registro').first();
    await expect(compra.getByAltText(`Portada de ${libro.titulo}`)).toBeVisible();
    await expect(compra.getByRole('link', { name: `Ver ${libro.titulo}`, exact: true })).toHaveAttribute('href', '/libro/1');

    await expect(page.locator('header').getByRole('link', { name: /favoritos/i })).toHaveCount(0);
    await page.goto('/cuenta');
    await page.getByText('Mis actividades', { exact: true }).click();
    await page
        .getByRole('navigation', { name: 'Accesos de mi cuenta' })
        .getByRole('link', { name: 'Mis favoritos' })
        .click();
    await expect(page.getByRole('heading', { name: 'Mis favoritos', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: libro.titulo, level: 2 })).toBeVisible();
    await expect(page.getByAltText(`Portada de ${libro.titulo}`)).toBeVisible();
    await page.getByRole('button', { name: `Quitar ${libro.titulo} de favoritos`, exact: true }).click();
    await expect(page.getByText('Todavía no tienes favoritos')).toBeVisible();
    expect(control.favoritosQuitados).toEqual(['Bearer token-cliente']);
});
test('favoritos sin sesión pide ingresar', async ({ page }) => {
    await api(page);
    await page.goto('/favoritos');
    await expect(page.getByText('Inicia sesión para ver tus libros favoritos.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ingresar', exact: true })).toHaveAttribute('href', '/cuenta?continuar=/favoritos');
});
test('mi cuenta muestra mis datos una sola vez y accesos reales', async ({ page }) => {
    await api(page);
    const datos = {
        ...cliente,
        nombre: 'Lucía',
        apellido: 'Ramos',
        email: 'lucia@example.test',
        telefono: '987654321',
        fecha_registro: '2026-08-14T10:00:00Z',
        email_verified_at: '2026-08-14T10:05:00Z'
    };
    await page.route('**/api/usuarios/perfil', (r) => r.fulfill({ json: { success: true, data: datos } }));
    await page.route('**/api/auth/login', (r) => r.fulfill({ json: { success: true, token: 'token-cliente', data: datos } }));

    await page.goto('/cuenta');
    await login(page);
    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(page.getByRole('heading', { name: 'Mi cuenta', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Actualizar foto de perfil', exact: true })).toBeVisible();
    await expect(page.getByText('Foto de perfil', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver foto de perfil completa' })).toBeVisible();
    await expect(page.getByLabel('Actualizar foto de perfil')).toBeHidden();
    await expect(page.locator('.pf-sidebar__pie').getByRole('button', { name: 'Cerrar sesión de cliente' })).toBeVisible();
    await expect(page.locator('.pf-sidebar')).not.toContainText('Verificado');
    for (const titulo of ['Mis actividades', 'Información de cuenta', 'Otras opciones']) {
        await expect(page.getByText(titulo, { exact: true })).toBeVisible();
        await expect(page.locator('.pf-grupo').filter({ hasText: titulo })).not.toHaveAttribute('open');
    }
    await expect(page.getByRole('button', { name: 'Personalización', exact: true })).toHaveCount(0);
    await expect(page.locator('.pf-tarjeta-acceso')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar datos', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '¡Bienvenido, Lucía!', exact: true })).toHaveCount(0);
    const estilo = await page.evaluate(() => ({
        fondo: getComputedStyle(document.querySelector('main')).backgroundColor,
        heroTipo: getComputedStyle(document.querySelector('.pf-hero__salir')).fontFamily,
        heroFondo: getComputedStyle(document.querySelector('.pf-hero')).backgroundColor,
        heroBorde: getComputedStyle(document.querySelector('.pf-hero')).borderTopWidth,
        heroBackdrop: getComputedStyle(document.querySelector('.pf-hero')).backdropFilter,
        columnas: getComputedStyle(document.querySelector('.pf-shell')).gridTemplateColumns.split(' ').length
    }));
    expect(estilo.fondo).toBe('rgb(247, 247, 247)');
    expect(estilo.heroFondo).toBe('rgba(0, 0, 0, 0)');
    expect(estilo.heroBorde).toBe('0px');
    expect(estilo.heroBackdrop).toBe('none');
    expect(estilo.heroTipo).toContain('Work Sans');
    expect(estilo.heroTipo).not.toContain('Source Serif');
    expect(estilo.columnas).toBe(2);
    const misDatos = page.getByRole('region', { name: 'Mis datos' });
    for (const valor of ['Lucía', 'Ramos', 'lucia@example.test', '987654321', 'Verificado']) await expect(misDatos).toContainText(valor);
    await expect(page.locator('.pf-sidebar')).not.toContainText('987654321');
    await page.getByText('Mis actividades', { exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Accesos de mi cuenta' }).getByRole('link', { name: /Mis compras/ })).toHaveAttribute('href', '/mis-compras');
    await page.getByRole('button', { name: 'Cerrar sesión de cliente', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible();
});
test('mi cuenta edita sus datos sin Volver a un panel', async ({ page }) => {
    await api(page);
    const actualizado = { ...cliente, nombre: 'Lucía', apellido: 'Ramos', telefono: '987654321' };
    await page.route('**/api/usuarios/perfil', (r) =>
        r.fulfill({ json: { success: true, data: r.request().method() === 'PUT' ? actualizado : cliente } })
    );
    await page.goto('/cuenta');
    await login(page);
    await page.getByText('Información de cuenta', { exact: true }).click();
    await page.getByRole('button', { name: 'Editar datos personales', exact: true }).click();
    await page.getByLabel('Nombre', { exact: true }).fill('Lucía');
    await page.getByLabel('Apellidos completos', { exact: true }).fill('Ramos');
    await page.getByLabel('Teléfono', { exact: true }).fill('987654321');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Tus datos se guardaron correctamente.');
    const misDatos = page.getByRole('region', { name: 'Mis datos' });
    await expect(misDatos).toContainText('Lucía');
    await expect(misDatos).toContainText('Ramos');
    await expect(misDatos).toContainText('987654321');
});
test('mi cuenta se adapta a móvil, tablet y escritorio sin desbordes', async ({ page }) => {
    test.setTimeout(120000);
    await api(page);
    await page.goto('/cuenta');
    await login(page);
    await expect(page.getByRole('heading', { name: 'Mi cuenta', exact: true })).toHaveCount(1);

    for (const ancho of [320, 360, 390, 430, 760, 768, 1024, 1440]) {
        await page.setViewportSize({ width: ancho, height: 844 });
        const movil = ancho <= 760;
        const menu = page.getByRole('navigation', { name: 'Accesos de mi cuenta' });
        const hamburguesa = page.getByRole('button', { name: 'Menú', exact: true });
        if (movil) {
            await expect(hamburguesa).toBeVisible();
            await expect(menu).toBeHidden();
        } else {
            await expect(hamburguesa).toBeHidden();
            await expect(menu).toBeVisible();
        }
        await expect(page.getByRole('button', { name: 'Actualizar foto de perfil', exact: true })).toBeVisible();
        await expect(page.locator('.pf-sidebar__pie').getByRole('button', { name: 'Cerrar sesión de cliente' })).toBeVisible();

        const columnas = await page.evaluate(() => getComputedStyle(document.querySelector('.pf-shell')).gridTemplateColumns.split(' ').length);
        expect(columnas, `columnas a ${ancho}px`).toBe(movil ? 1 : 2);

        const revisarDesbordes = async () => {
            const resultado = await page.evaluate(() => ({
                horizontal: document.documentElement.scrollWidth <= innerWidth,
                fuera: [...document.querySelectorAll('.pf-hero__cambiar, .pf-menu-toggle, .pf-hero__salir, .pf-grupo summary, .pf-nav-item')]
                    .filter((el) => el.getClientRects().length)
                    .filter((el) => {
                        const caja = el.getBoundingClientRect();
                        return caja.left < -1 || caja.right > innerWidth + 1;
                    })
                    .map((el) => el.className)
            }));
            expect(resultado.horizontal, `sin scroll horizontal a ${ancho}px`).toBe(true);
            expect(resultado.fuera, `controles dentro del viewport a ${ancho}px`).toEqual([]);
        };
        await revisarDesbordes();

        if (movil) {
            await hamburguesa.click();
            await expect(menu).toBeVisible();
            await page.getByText('Mis actividades', { exact: true }).click();
            await expect(menu.getByRole('link', { name: 'Mis compras' })).toBeVisible();
            await revisarDesbordes();
            await menu.getByRole('link', { name: 'Mis compras' }).click();
            await expect(page).toHaveURL(/\/mis-compras$/);
            await page.goto('/cuenta');
            await expect(page).toHaveURL(/\/cuenta$/);
            await page.waitForSelector('.pf-shell');
        }

        const selectores = movil
            ? '.pf-hero__salir, .pf-hero__cambiar, .pf-hero__camara, .pf-grupo summary, .pf-menu-toggle'
            : '.pf-hero__salir, .pf-hero__cambiar, .pf-boton, .pf-nav-item, .pf-menu-toggle';
        const alturas = await page.evaluate((selectores) =>
            [...document.querySelectorAll(selectores)]
                .filter((el) => el.getClientRects().length)
                .map((el) => ({ selector: el.className, alto: Math.round(el.getBoundingClientRect().height) })), selectores);
        expect(alturas.length, `controles medibles a ${ancho}px`).toBeGreaterThan(0);
        expect(alturas.filter((x) => x.alto < 44), `objetivos táctiles a ${ancho}px`).toEqual([]);
    }
});
