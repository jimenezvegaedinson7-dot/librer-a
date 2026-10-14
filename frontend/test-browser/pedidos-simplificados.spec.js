import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const admin = { id_usuario: 1, nombre: 'Admin', rol: 'administrador', estado: 1 };
const base = { id_usuario: 7, origen: 'app', canal_compra: 'web', external_reference: 'ref',
    estado: 'pagada', tipo_entrega: 'tienda', total: 25, payu_payment_status: 'CAPTURED' };
async function preparar(page, pedidos, manejar) {
    await page.addInitScript(u => { localStorage.setItem('token', 'token-local'); localStorage.setItem('usuario', JSON.stringify(u)); }, admin);
    await page.route(`${API}/**`, async r => {
        const p = new URL(r.request().url()).pathname;
        if (p === '/api/usuarios/perfil') return r.fulfill({ json: { success: true, data: admin } });
        if (manejar && await manejar(r, p)) return;
        if (p === '/api/pedidos') return r.fulfill({ json: { success: true, data: pedidos } });
        if (p.startsWith('/api/pedidos/')) return r.fulfill({ json: { success: true, data: pedidos.find(v => v.id_venta === Number(p.split('/')[3])) } });
        return r.fulfill({ json: { success: true, data: [] } });
    });
}
const auditados = () => [
    { ...base, id_venta: 31, estado: 'reembolsada', estado_entrega: 'entregado', estado_reembolso: 'confirmado' },
    { ...base, id_venta: 32, estado: 'cancelada', estado_entrega: 'cancelado' },
    { ...base, id_venta: 33, estado: 'cancelada', estado_entrega: 'cancelado' },
    { ...base, id_venta: 34, estado: 'entregada', estado_entrega: 'entregado' },
    { ...base, id_venta: 35, tipo_entrega: 'domicilio', estado_entrega: 'pendiente', payu_payment_status: 'APPROVED' },
];
for (const width of [390, 1440]) test(`Pedidos ${width}px: cuatro tarjetas con base real 2, 50/0/0/50 y filtro sin inflar`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await preparar(page, auditados());
    await page.goto('/pedidos');
    const resumen = page.getByRole('region', { name: 'Indicadores de pedidos' });
    await expect(resumen.locator('.indicador-tarjeta.joya')).toHaveCount(4);
    await expect(resumen.locator('.kpi-destello')).toHaveCount(4);
    await expect(resumen.locator('.pedido-indicador__valor')).toHaveText(['1', '0', '0', '1']);
    await expect(resumen.locator('.pedido-indicador__proporcion')).toHaveText(['50% del total', '0% del total', '0% del total', '50% del total']);
    await expect(resumen.getByRole('meter')).toHaveCount(4);
    for (const meter of await resumen.getByRole('meter').all()) await expect(meter).toHaveAttribute('aria-valuemax', '2');
    await expect(page.locator('.pedido-resumen-nota')).toContainText('Base del resumen: 2 pedidos pagados y vigentes');
    await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(5);
    await page.getByLabel('Filtrar pedidos').selectOption('pendiente');
    await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(1);
    await expect(resumen.locator('.pedido-indicador__valor')).toHaveText(['1', '0', '0', '1']);
    await page.getByLabel('Filtrar pedidos').selectOption('cancelado');
    await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(2);
    await expect(resumen.locator('.pedido-indicador__proporcion')).toHaveText(['50% del total', '0% del total', '0% del total', '50% del total']);
    await page.getByLabel('Filtrar pedidos').selectOption('todos');
    await expect(page.locator('.data-table-shell tbody tr').last()).toHaveCSS('opacity', '1');
    await page.screenshot({ path: info.outputPath('pedidos-resumen.png'), fullPage: true });
    // Tres pasos propios; comercial legacy entregada no crea pasos nuevos.
    await page.locator('.data-table-shell tbody tr').filter({ hasText: '#34' }).getByRole('button', { name: 'Ver detalle', exact: true }).click();
    const detalle = page.getByRole('dialog');
    await expect(detalle.getByRole('listitem')).toHaveText(['Por preparar', 'Listo para recoger', 'Entregado']);
    await expect(detalle.getByRole('button', { name: 'Confirmar entrega', exact: true })).toHaveCount(0);
    await expect(detalle).not.toContainText('En camino');
    expect(await detalle.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('pedidos-detalle.png'), fullPage: true });
});
test('Pedidos: error, respuesta inválida y base vacía no fabrican ceros ni porcentajes', async ({ page }) => {
    let modo = 'error';
    await preparar(page, [], async (r, p) => {
        if (p !== '/api/pedidos') return false;
        await r.fulfill({ status: modo === 'error' ? 503 : 200, json: modo === 'invalido' ? { success: true } : { success: modo !== 'error', data: [], mensaje: 'Temporalmente no disponible' } });
        return true;
    });
    await page.goto('/pedidos');
    const valores = page.locator('.pedido-indicador__valor');
    await expect(valores).toHaveText(['—', '—', '—', '—']);
    await expect(page.locator('.pedido-indicador__proporcion')).toHaveCount(0);
    await expect(page.getByRole('meter')).toHaveCount(0);
    modo = 'invalido';
    await page.getByRole('button', { name: 'Actualizar pedidos', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('No se pudieron cargar los pedidos');
    await expect(valores).toHaveText(['—', '—', '—', '—']);
    modo = 'vacio';
    await page.getByRole('button', { name: 'Actualizar pedidos', exact: true }).click();
    await expect(valores).toHaveText(['0', '0', '0', '0']);
    await expect(page.locator('.pedido-indicador__proporcion')).toHaveText(Array(4).fill('Sin base para calcular porcentaje'));
    await expect(page.getByRole('meter')).toHaveCount(0);
});
test('Pedidos: los anillos conservan la base común y el reparto corregido a una décima', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await preparar(page, [
        { ...base, id_venta: 1, estado_entrega: 'pendiente' },
        { ...base, id_venta: 2, estado_entrega: 'listo_recojo' },
        { ...base, id_venta: 3, estado_entrega: 'entregado' },
    ]);
    await page.goto('/pedidos');
    const resumen = page.getByRole('region', { name: 'Indicadores de pedidos' });
    await expect(resumen.locator('.kpi-anillo-cifra')).toHaveText(['33.4%', '33.3%', '0%', '33.3%']);
    await expect(resumen.locator('.pedido-indicador__valor')).toHaveText(['1', '1', '0', '1']);
    for (const meter of await resumen.getByRole('meter').all()) await expect(meter).toHaveAttribute('aria-valuemax', '3');
    await expect(resumen.getByRole('meter').first()).toHaveAttribute('aria-valuetext', '33.4% del total (1 de 3 pedidos)');
});
test('Delivery: confirmar salida envía el estado real; rechazo no adelanta los pasos', async ({ page }) => {
    const pedido = { ...base, id_venta: 8, tipo_entrega: 'domicilio', estado_entrega: 'pendiente', direccion: 'Pallasca' };
    const cambios = [];
    await preparar(page, [pedido], async (r, p) => {
        if (p !== '/api/pedidos/8/estado') return false;
        cambios.push(r.request().postDataJSON());
        await r.fulfill({ status: 409, json: { success: false, mensaje: 'El pedido cambió. Actualiza antes de confirmar.' } });
        return true;
    });
    await page.goto('/pedidos');
    await page.getByRole('button', { name: 'Despachar pedido', exact: true }).click();
    const confirmacion = page.getByRole('dialog');
    await expect(confirmacion).toContainText('Solo confirma cuando esté realmente en ruta');
    expect(cambios).toEqual([]);
    await confirmacion.getByRole('button', { name: 'Sí, salió el repartidor', exact: true }).click();
    await expect(page.getByText('El pedido cambió. Actualiza antes de confirmar.', { exact: true })).toBeVisible();
    expect(cambios).toEqual([{ estado: 'en_camino', confirmado: true, estado_anterior: 'pendiente' }]);
    await expect(page.locator('.pedido-indicador__valor')).toHaveText(['1', '0', '0', '0']);
});
