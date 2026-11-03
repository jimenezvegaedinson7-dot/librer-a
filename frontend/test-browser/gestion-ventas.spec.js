import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const admin = { id_usuario: 1, nombre: 'Admin', rol: 'administrador', estado: 1 };
const base = {
    id_usuario: 7,
    nombre_usuario: 'Ana',
    apellido_usuario: 'Lectora',
    correo_usuario: 'ana@example.invalid',
    origen: 'app',
    canal_compra: 'web',
    tipo_entrega: 'tienda',
    estado_entrega: 'pendiente',
    fecha_venta: '2026-11-01T12:00:00Z',
    detalles: [{ id_detalle: 1, titulo: 'Libro de prueba', cantidad: 1, precio_unitario: 100, subtotal: 100 }]
};
const ventas = [
    {
        ...base,
        id_venta: 51,
        total: 100,
        estado: 'pagada',
        payu_payment_status: 'APPROVED',
        external_reference: 'ref-51',
        payu_order_id: 'orden-51',
        payu_payment_id: 'transaccion-51',
        tiene_comprobante: 1
    },
    { ...base, id_venta: 52, total: 20, estado: 'pendiente', payu_payment_status: 'PENDING', external_reference: 'ref-52', tiene_comprobante: 0 },
    { ...base, id_venta: 53, total: 30, estado: 'cancelada', payu_payment_status: 'DECLINED', external_reference: 'ref-53', tiene_comprobante: 0 }
];
const comprobantes = [
    { id_comprobante: 111, id_venta: 51, tipo: 'boleta', serie: 'B001', numero: 1, estado: 'emitido', cliente_nombre: 'Ana Lectora', total: 100 },
    { id_comprobante: 222, id_venta: 99, tipo: 'boleta', serie: 'B001', numero: 2, estado: 'emitido', cliente_nombre: 'Otra persona', total: 60 }
];

async function preparar(page, usuario = admin) {
    const control = { lecturas: [], escrituras: [], falloVentas: false, apiAntigua: false, errores: [] };
    page.on('pageerror', (e) => control.errores.push(e.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((u) => {
        localStorage.setItem('token', 'token-prueba');
        localStorage.setItem('usuario', JSON.stringify(u));
    }, usuario);
    await page.route(`${API}/**`, (route) => {
        const req = route.request(),
            url = new URL(req.url()),
            ruta = url.pathname;
        if (req.method() !== 'GET') {
            control.escrituras.push(ruta);
            return route.abort();
        }
        control.lecturas.push(ruta + url.search);
        if (ruta.endsWith('/usuarios/perfil')) return route.fulfill({ json: { success: true, data: usuario } });
        if (ruta === '/api/ventas')
            return route.fulfill(control.falloVentas ? { status: 503, json: { mensaje: 'No se pudieron consultar las compras' } } : { json: { success: true, data: ventas } });
        if (/^\/api\/ventas\/\d+$/.test(ruta)) return route.fulfill({ json: { success: true, data: ventas.find((v) => v.id_venta === Number(ruta.split('/').at(-1))) } });
        if (ruta === '/api/pedidos') return route.fulfill({ json: { success: true, data: ventas } });
        if (/^\/api\/pedidos\/\d+$/.test(ruta)) return route.fulfill({ json: { success: true, data: ventas.find((v) => v.id_venta === Number(ruta.split('/').at(-1))) } });
        if (ruta === '/api/comprobantes/resumen') return route.fulfill({ json: { success: true, boletas: 2, facturas: 0, ingresos: 160 } });
        if (ruta === '/api/comprobantes') {
            const idVenta = url.searchParams.get('id_venta');
            const lista =
                url.searchParams.get('envio') === 'pendiente' ? [] : idVenta && !control.apiAntigua ? comprobantes.filter((c) => String(c.id_venta) === idVenta) : comprobantes;
            return route.fulfill({
                json: { success: true, comprobantes: lista, total: lista.length, paginas: 1, ...(control.apiAntigua ? {} : { filtro_venta: idVenta ? Number(idVenta) : null }) }
            });
        }
        if (/^\/api\/comprobantes\/\d+$/.test(ruta))
            return route.fulfill({ json: { success: true, comprobante: comprobantes.find((c) => c.id_comprobante === Number(ruta.split('/').at(-1))) } });
        if (ruta === '/api/pagos') return route.fulfill({ json: { success: true, pagos: [], total: 0, paginas: 1 } });
        return route.fulfill({ json: { success: true, data: [] } });
    });
    return control;
}

for (const width of [390, 1440])
    test(`Gestión de ventas ${width}px: una sección, tres vistas y carga bajo demanda`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 });
        const control = await preparar(page);
        await page.goto('/ventas');
        await expect(page.getByRole('heading', { name: 'Gestión de ventas', exact: true })).toBeVisible();
        const vistas = page.getByRole('tablist', { name: 'Vistas de gestión de ventas' });
        await expect(vistas.getByRole('tab')).toHaveCount(3);
        await expect(vistas.getByRole('tab', { name: /Ventas y pagos/ })).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(3);
        expect(control.lecturas.some((r) => r.startsWith('/api/pedidos') || r.startsWith('/api/comprobantes'))).toBe(false);
        expect(control.lecturas).not.toContain('/api/pagos/resumen');
        const menu = page.getByRole('complementary', { name: 'Navegación principal' });
        await expect(menu.getByRole('link', { name: 'Gestión de ventas', exact: true })).toHaveCount(1);
        await expect(menu.locator('a[href="/pedidos"], a[href="/pagos"], a[href="/comprobantes"]')).toHaveCount(0);
        await page.screenshot({ path: info.outputPath(`ventas-${width}.png`), fullPage: true });
        await vistas.getByRole('tab', { name: /Pedidos/ }).click();
        await expect(page).toHaveURL(/\/ventas\/pedidos$/);
        await expect(page.getByRole('button', { name: 'Actualizar pedidos', exact: true })).toBeVisible();
        await expect(page.locator('.pedido-indicador__valor')).toHaveText(['1', '0', '0', '0']);
        await expect(menu.getByRole('link', { name: 'Gestión de ventas', exact: true })).toHaveAttribute('aria-current', 'page');
        await page.screenshot({ path: info.outputPath(`pedidos-${width}.png`), fullPage: true });
        await vistas.getByRole('tab', { name: /Comprobantes/ }).click();
        await expect(page).toHaveURL(/\/ventas\/comprobantes$/);
        await expect(page.getByRole('button', { name: 'Ver comprobante', exact: true })).toHaveCount(2);
        await expect(page.locator('main h1')).toHaveCount(1);
        await page.screenshot({ path: info.outputPath(`comprobantes-${width}.png`), fullPage: true });
        await page.goBack();
        await expect(vistas.getByRole('tab', { name: /Pedidos/ })).toHaveAttribute('aria-selected', 'true');
        const pedidos = vistas.getByRole('tab', { name: /Pedidos/ });
        await pedidos.focus();
        await pedidos.press('Home');
        await expect(page).toHaveURL(/\/ventas$/);
        await expect(vistas.getByRole('tab', { name: /Ventas y pagos/ })).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(control.escrituras).toEqual([]);
        expect(control.errores).toEqual([]);
    });

test('Ventas y pagos: filtros PayU, referencias y detalle completo desde una sola lista', async ({ page }) => {
    const control = await preparar(page);
    await page.goto('/ventas');
    await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(3);
    await expect(page.getByRole('region', { name: 'Indicadores de ventas' }).locator('.kpi-valor')).toHaveText(['S/ 100.00', '3', '1', 'S/ 100.00']);
    await page.getByLabel('Filtrar por estado de pago').selectOption('declined');
    await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(1);
    await expect(page.locator('.data-table-shell tbody tr')).toContainText('#53');
    await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
    await page.getByLabel('Buscar ventas y pagos').fill('transaccion-51');
    await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'Ver venta', exact: true }).click();
    const detalle = page.getByRole('dialog', { name: 'Detalle de la venta' });
    await expect(detalle).toContainText('Libro de prueba');
    await expect(detalle).toContainText('transaccion-51');
    await expect(detalle).toContainText('orden-51');
    await expect(detalle).toContainText('Aprobado');
    await expect(detalle).toContainText('Por preparar');
    expect(control.lecturas).not.toContain('/api/pagos/resumen');
    expect(control.escrituras).toEqual([]);
});

test('enlace antiguo de pago abre su venta y conserva parámetros y hash', async ({ page }) => {
    await preparar(page);
    await page.goto('/pagos?ver=ref-51&origen=notificacion#detalle');
    await expect(page).toHaveURL(/\/ventas\?ver=ref-51&origen=notificacion#detalle$/);
    await expect(page.getByRole('dialog')).toContainText('transaccion-51');
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).last().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('origen')).toBe('notificacion');
    expect(new URL(page.url()).searchParams.has('ver')).toBe(false);
    await page.goto('/pedidos?canal=web#lista');
    await expect(page).toHaveURL(/\/ventas\/pedidos\?canal=web#lista$/);
    await page.goto('/comprobantes?origen=guardado');
    await expect(page).toHaveURL(/\/ventas\/comprobantes\?origen=guardado$/);
});

test('venta → comprobantes aplica filtro exacto y permite regresar al listado general', async ({ page }) => {
    const control = await preparar(page);
    await page.goto('/ventas');
    await page.getByRole('link', { name: 'Ver comprobante de la venta 51', exact: true }).click();
    await expect(page).toHaveURL(/\/ventas\/comprobantes\?venta=51$/);
    await expect(page.getByText('Comprobantes de la venta')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver comprobante', exact: true })).toHaveCount(1);
    await expect(page.locator('.data-table-shell tbody')).not.toContainText('Otra persona');
    expect(control.lecturas.some((r) => r.startsWith('/api/comprobantes?') && r.includes('id_venta=51'))).toBe(true);
    await page.getByRole('button', { name: 'Ver todos los comprobantes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ver comprobante', exact: true })).toHaveCount(2);
    expect(control.escrituras).toEqual([]);
});

test('una API antigua no muestra comprobantes ajenos como si pertenecieran a la venta', async ({ page }) => {
    const control = await preparar(page);
    control.apiAntigua = true;
    await page.goto('/ventas/comprobantes?venta=51');
    await expect(page.getByRole('alert')).toContainText('La API debe actualizarse');
    await expect(page.getByRole('button', { name: 'Ver comprobante', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Ver todos los comprobantes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ver comprobante', exact: true })).toHaveCount(2);
});

test('fallo de ventas mantiene cifras no disponibles y Actualizar recupera la lista', async ({ page }) => {
    const control = await preparar(page);
    control.falloVentas = true;
    await page.goto('/ventas');
    const resumen = page.getByRole('region', { name: 'Indicadores de ventas' });
    await expect(resumen.locator('.kpi-valor')).toHaveText(['—', '—', '—', '—']);
    await expect(page.getByRole('alert')).toContainText('No se pudieron consultar las compras');
    control.falloVentas = false;
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(3);
    await expect(resumen.locator('.kpi-valor').first()).toHaveText('S/ 100.00');
});

test('las nuevas URLs de operaciones siguen restringidas al administrador', async ({ page }) => {
    await preparar(page, { ...admin, rol: 'cliente' });
    for (const ruta of ['/ventas', '/ventas/pedidos', '/ventas/comprobantes', '/pagos?ver=ref-51']) {
        await page.goto(ruta);
        await expect(page).toHaveURL(/\/admin\/login$/);
        await expect(page.getByRole('tablist', { name: 'Vistas de gestión de ventas' })).toHaveCount(0);
    }
});

test('el detalle de un pedido lleva a la misma venta con su información PayU', async ({ page }) => {
    await preparar(page);
    await page.goto('/ventas/pedidos');
    await page.locator('.data-table-shell tbody tr').filter({ hasText: '#51' }).getByRole('button', { name: 'Ver detalle', exact: true }).click();
    const pedido = page.getByRole('dialog', { name: 'Pedido #51', exact: true });
    await expect(pedido).toContainText('S/ 100.00');
    await pedido.getByRole('link', { name: 'Ver venta y pago de este pedido', exact: true }).click();
    await expect(page).toHaveURL(/\/ventas\?ver=51$/);
    await expect(page.getByRole('dialog', { name: 'Detalle de la venta' })).toContainText('transaccion-51');
});

test('volver a todos los comprobantes descarta una respuesta tardía del filtro por venta', async ({ page }) => {
    await preparar(page);
    let soltar;
    const espera = new Promise((resolve) => {
        soltar = resolve;
    });
    await page.route(`${API}/comprobantes?id_venta=51*`, async (route) => {
        await espera;
        await route.fulfill({ json: { success: true, comprobantes: [comprobantes[0]], total: 1, paginas: 1, filtro_venta: 51 } });
    });
    await page.goto('/ventas/comprobantes?venta=51');
    await page.getByRole('button', { name: 'Ver todos los comprobantes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ver comprobante', exact: true })).toHaveCount(2);
    const respuesta = page.waitForResponse((r) => r.url().includes('/comprobantes?id_venta=51'));
    soltar();
    await respuesta;
    await expect(page.getByRole('button', { name: 'Ver comprobante', exact: true })).toHaveCount(2);
    await expect(page.locator('.data-table-shell tbody')).toContainText('Otra persona');
});
