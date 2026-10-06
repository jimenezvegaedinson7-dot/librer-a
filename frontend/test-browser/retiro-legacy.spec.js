import { test, expect } from '@playwright/test';

const admin = { id_usuario: 1, nombre: 'Audit', apellido: 'Admin', rol: 'administrador', estado: 1 };
async function preparar(page) {
    await page.addInitScript(usuario => {
        localStorage.setItem('token', 'audit-token'); localStorage.setItem('usuario', JSON.stringify(usuario));
    }, admin);
    await page.route('http://127.0.0.1:59999/api/**', route => {
        const url = new URL(route.request().url());
        const data = url.pathname.endsWith('/usuarios/perfil') ? admin : [];
        return route.fulfill({ json: { success: true, data } });
    });
}

for (const width of [390, 1440]) {
    test(`Ventas: sin entrega alternativa y devolución en dos fases a ${width}px`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 }); await preparar(page);
        const errores = []; page.on('pageerror', error => errores.push(error.message));
        let venta = { id_venta: 11, origen: 'app', canal_compra: 'web', estado: 'pagada', estado_entrega: 'pendiente',
            tipo_entrega: 'tienda', total: 25, reembolso_elegible: true, nombre_usuario: 'Cliente' };
        const escrituras = [];
        await page.route('**/api/ventas', route => route.fulfill({ json: { success: true, data: [venta] } }));
        await page.route('**/api/ventas/11/reembolso', route => {
            const body = route.request().postDataJSON(); escrituras.push(body);
            venta = { ...venta, motivo_reembolso: body.motivo,
                estado_reembolso: body.accion === 'solicitar' ? 'pendiente_verificacion' : 'confirmado',
                estado: body.accion === 'solicitar' ? 'pagada' : 'reembolsada', reembolso_elegible: body.accion === 'solicitar' };
            return route.fulfill({ json: { success: true, data: { ...venta, dinero_devuelto_por_api: false } } });
        });
        await page.goto('/ventas');
        await expect(page.getByTitle('Confirmar entrega', { exact: true })).toHaveCount(0);
        await page.getByTitle('Solicitar devolución PayU').click();
        await page.getByLabel('Motivo de la devolución').fill('Cliente solicita devolución');
        await page.getByRole('button', { name: 'Registrar solicitud pendiente' }).click();
        await expect(page.getByTitle('Verificar devolución PayU')).toBeVisible();
        expect(escrituras[0].accion).toBe('solicitar');
        await page.getByTitle('Verificar devolución PayU').click();
        const modal = page.getByRole('dialog');
        await expect(modal.getByLabel('Referencia de devolución PayU')).toHaveAttribute('required', '');
        await expect(modal.getByLabel('Evidencia verificable de la devolución')).toHaveAttribute('required', '');
        await page.getByRole('button', { name: 'Confirmar verificación documental' }).click();
        expect(escrituras.length).toBe(1);
        await modal.getByLabel('Referencia de devolución PayU').fill('refund-payu-11');
        await modal.getByLabel('Evidencia verificable de la devolución').fill('Comprobante PayU verificado por el administrador.');
        expect(await modal.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath('devolucion-documental.png') });
        await page.getByRole('button', { name: 'Confirmar verificación documental' }).click();
        await expect(page.getByTitle('Verificar devolución PayU')).toHaveCount(0);
        expect(escrituras[1].accion).toBe('confirmar');
        expect(escrituras[1].referencia_reembolso).toBe('refund-payu-11');
        expect(errores).toEqual([]);
    });
}

test('históricos vinculados no ofrecen entrega, devolución ni cobro; reservas solo cancelación', async ({ page }) => {
    await preparar(page);
    const reserva = { id_reserva: 5, estado: 'confirmada', cantidad: 1, titulo: 'Libro histórico' };
    await page.route('**/api/ventas', route => route.fulfill({ json: { success: true, data: [
        { id_venta: 1, origen: 'reserva', id_reserva: 5, estado: 'pagada', total: 25, reembolso_elegible: true },
        { id_venta: 2, origen: 'panel', estado: 'pagada', total: 25, reembolso_elegible: true }
    ] } }));
    await page.goto('/ventas');
    for (const name of ['Confirmar entrega', 'Solicitar devolución PayU', 'Emitir boleta', 'Emitir factura']) {
        await expect(page.getByTitle(name, { exact: true })).toHaveCount(0);
    }
    await page.route('**/api/reservas', route => route.fulfill({ json: { success: true, data: [reserva] } }));
    await page.route('**/api/reservas/5', route => route.fulfill({ json: { success: true, data: reserva } }));
    await page.goto('/reservas');
    await expect(page.getByRole('button', { name: 'Guardar reserva' })).toHaveCount(0);
    await page.getByTitle('Cambiar estado').click();
    await expect(page.getByRole('dialog').getByRole('combobox').locator('option')).toHaveText([
        'Cancelar y liberar stock'
    ]);
    await expect(page.getByRole('dialog').getByText('Efectivo', { exact: true })).toHaveCount(0);
});

test('devolución rechazada por backend mantiene datos y no muestra confirmación falsa', async ({ page }) => {
    await preparar(page);
    await page.route('**/api/ventas', route => route.fulfill({ json: { success: true, data: [
        { id_venta: 9, origen: 'app', estado: 'pagada', total: 25, reembolso_elegible: true }
    ] } }));
    await page.route('**/api/ventas/9/reembolso', route => route.fulfill({ status: 409,
        json: { success: false, mensaje: 'El pago ya no es elegible; actualiza el listado.' } }));
    await page.goto('/ventas'); await page.getByTitle('Solicitar devolución PayU').click();
    await page.getByLabel('Motivo de la devolución').fill('Devolución solicitada');
    await page.getByRole('button', { name: 'Registrar solicitud pendiente' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Motivo de la devolución')).toHaveValue('Devolución solicitada');
    await expect(page.getByText('El pago ya no es elegible; actualiza el listado.', { exact: true })).toBeVisible();
});

test('pie público no anuncia cobros manuales en tienda', async ({ page }) => {
    await preparar(page); await page.goto('/');
    await expect(page.locator('footer').getByText('Pago en línea con PayU')).toBeVisible();
    await expect(page.locator('footer').getByText('En tienda', { exact: true })).toHaveCount(0);
    await expect(page.locator('footer img[alt="Yape y Plin"]')).toHaveCount(0);
});
