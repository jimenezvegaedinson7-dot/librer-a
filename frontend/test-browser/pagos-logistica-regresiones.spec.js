import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

// Contrato real y puro del backend: estos helpers no abren conexiones ni usan DB.
const { esReembolsoElegible, requiereRevisionPago } = createRequire(import.meta.url)('../../backend/src/utils/devoluciones.js');

const admin = { id_usuario: 1, nombre: 'Admin', apellido: 'Prueba', rol: 'administrador', estado: 1 };
const base = { id_venta: 51, id_usuario: 7, nombre_usuario: 'Cliente', origen: 'app', canal_compra: 'web', external_reference: 'ref-51',
    estado: 'pagada', estado_entrega: 'preparando', tipo_entrega: 'domicilio', total: 25, costo_envio: 0, metodo_pago: 'payu',
    payu_payment_status: 'APPROVED', fecha_pago: '2026-10-12T12:00:00.000Z', direccion: 'Pallasca, calle de prueba', reembolso_elegible: true };
async function preparar(context, manejar) {
    await context.addInitScript(u => {
        localStorage.setItem('token', 'admin-local'); localStorage.setItem('usuario', JSON.stringify(u));
    }, admin);
    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) {
            if (await manejar(route, url.pathname)) return;
            return route.fulfill({ json: { success: true, data: url.pathname === '/api/usuarios/perfil' ? admin : [] } });
        }
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
        return route.continue();
    });
}

for (const width of [390, 1440]) {
    test(`Pedidos ${width}px: revisión/reversión detiene avances sin impedir cancelación logística`, async ({ page, context }) => {
        await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
        const pedidos = [
            { ...base, pago_revision_motivo: 'reversion_payu' },
            { ...base, id_venta: 52, payu_payment_status: 'REFUNDED' },
            { ...base, id_venta: 53, payu_payment_status: 'CHARGED_BACK' },
            { ...base, id_venta: 54 },
            { ...base, id_venta: 55, requiere_revision: true },
        ];
        const cambios = [];
        await preparar(context, async (r, p) => {
            if (p === '/api/pedidos') { await r.fulfill({ json: { success: true, data: pedidos } }); return true; }
            if (!p.startsWith('/api/pedidos/')) return false;
            const pedido = pedidos.find(v => v.id_venta === Number(p.split('/')[3]));
            if (r.request().method() === 'PUT') { cambios.push(r.request().postDataJSON()); pedido.estado_entrega = 'cancelado'; }
            await r.fulfill({ json: { success: true, data: pedido } }); return true;
        });
        await page.goto('/pedidos');
        const fila = id => page.locator('.data-table-shell tbody tr').filter({ hasText: `#${id}` });
        for (const id of [51, 52, 53, 55]) {
            await expect(fila(id)).toContainText('Pago en revisión');
            await expect(fila(id)).not.toContainText('Confirmado · PayU');
            await expect(fila(id)).not.toContainText('Pago recibido');
            await expect(fila(id).getByRole('button', { name: 'Despachar pedido', exact: true })).toHaveCount(0);
            await expect(fila(id).getByRole('button', { name: 'Cancelar pedido', exact: true })).toBeEnabled();
        }
        await expect(fila(54)).toContainText('Confirmado · PayU');
        await expect(fila(54).getByRole('button', { name: 'Despachar pedido', exact: true })).toBeEnabled();
        await fila(51).getByRole('button', { name: 'Ver detalle', exact: true }).click();
        const detalle = page.getByRole('dialog', { name: 'Pedido #51', exact: true });
        await expect(detalle).toContainText('Entrega detenida');
        await expect(detalle).toContainText('El pago requiere revisión');
        await expect(detalle.getByRole('button', { name: 'Despachar pedido', exact: true })).toHaveCount(0);
        expect(await detalle.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
        await detalle.getByRole('button', { name: 'Cancelar pedido', exact: true }).click();
        const confirmacion = page.getByRole('dialog', { name: 'Cancelar pedido', exact: true });
        await expect(confirmacion).toContainText('no devuelve dinero ni libera existencias');
        await confirmacion.getByRole('button', { name: 'Sí, cancelar', exact: true }).click();
        await expect(fila(51)).toContainText('Pedido cancelado');
        expect(cambios).toEqual([{ estado: 'cancelado', estado_anterior: 'preparando' }]);
        await expect(page.locator('.admin-shell')).toHaveAttribute('data-theme', 'light');
    });
}

test('Pedidos: una confirmación abierta antes de la revisión no envía el avance', async ({ page, context }) => {
    let revisado = false; const cambios = [];
    await preparar(context, async (r, p) => {
        if (p === '/api/pedidos') {
            await r.fulfill({ json: { success: true, data: [{ ...base, pago_revision_motivo: revisado ? 'reversion_payu' : null }] } }); return true;
        }
        if (r.request().method() === 'PUT') { cambios.push(r.request().postDataJSON()); await r.fulfill({ json: { success: true } }); return true; }
        return false;
    });
    await page.goto('/pedidos'); await page.getByRole('button', { name: 'Despachar pedido', exact: true }).click();
    revisado = true; await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.locator('.data-table-shell tbody tr')).toContainText('Pago en revisión');
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, salió el repartidor', exact: true }).click();
    await expect(page.getByText('El pago está en revisión. Actualiza el pedido antes de avanzar la entrega.', { exact: true })).toBeVisible();
    expect(cambios).toEqual([]);
});

test('Contrato: revisión coincide con backend, respeta el cierre y acepta requiere_revision explícito', async ({ page, context }) => {
    await preparar(context, () => false);
    await page.goto('/pedidos');
    const filas = [];
    for (const payu_payment_status of ['APPROVED', 'CAPTURED', 'REFUNDED', 'CHARGED_BACK']) {
        for (const estado of ['pagada', 'entregada', 'cancelada', 'reembolsada']) {
            for (const estado_reembolso of [null, 'pendiente_verificacion', 'confirmado']) {
                for (const pago_revision_motivo of [null, 'reversion_payu']) {
                    filas.push({ payu_payment_status, estado, estado_reembolso, pago_revision_motivo, requiere_revision: false });
                }
            }
        }
    }
    const resultado = await page.evaluate(async filas => {
        const { pagoEnRevision } = await import('/src/features/pedidos/estadosPedido.js');
        return filas.map(pagoEnRevision);
    }, filas);
    expect(resultado).toEqual(filas.map(requiereRevisionPago));
    const explicitos = await page.evaluate(async () => {
        const { pagoEnRevision } = await import('/src/features/pedidos/estadosPedido.js');
        return [
            pagoEnRevision({ estado: 'pagada', payu_payment_status: 'APPROVED', requiere_revision: true }),
            pagoEnRevision({ estado: 'pagada', payu_payment_status: 'APPROVED', requiere_revision: false }),
            pagoEnRevision({ estado: 'reembolsada', payu_payment_status: 'REFUNDED' }),
            pagoEnRevision({ estado: 'pagada', estado_reembolso: 'confirmado', payu_payment_status: 'CHARGED_BACK' }),
        ];
    });
    expect(explicitos).toEqual([true, false, false, false]);
});

test('Pedidos: devoluciones REFUNDED/CHARGED_BACK cerradas no muestran revisión ni acciones', async ({ page, context }) => {
    const pedidos = ['REFUNDED', 'CHARGED_BACK'].map((status, i) => ({ ...base, id_venta: 51 + i,
        estado: 'reembolsada', estado_entrega: 'cancelado', estado_reembolso: 'confirmado',
        payu_payment_status: status, pago_revision_motivo: null, requiere_revision: false }));
    await preparar(context, async (r, p) => {
        if (p === '/api/pedidos') { await r.fulfill({ json: { success: true, data: pedidos } }); return true; }
        if (!p.startsWith('/api/pedidos/')) return false;
        await r.fulfill({ json: { success: true, data: pedidos.find(v => v.id_venta === Number(p.split('/')[3])) } }); return true;
    });
    await page.goto('/pedidos');
    for (const pedido of pedidos) {
        const fila = page.locator('.data-table-shell tbody tr').filter({ hasText: `#${pedido.id_venta}` });
        await expect(fila).toContainText('Reembolsada');
        await expect(fila).not.toContainText('Pago en revisión');
        await expect(fila).not.toContainText('Confirmado · PayU');
        await expect(fila.getByRole('button', { name: /Despachar pedido|Cancelar pedido/ })).toHaveCount(0);
        await fila.getByRole('button', { name: 'Ver detalle', exact: true }).click();
        const detalle = page.getByRole('dialog');
        await expect(detalle).not.toContainText('Pago en revisión');
        await expect(detalle).toContainText('Pedido cancelado. La entrega se detuvo.');
        await detalle.getByRole('button', { name: 'Cerrar', exact: true }).click();
    }
});

test('Ventas: contracargo identificado permite registrar y cerrar devolución sin aceptar identificadores del formulario', async ({ page, context }) => {
    let venta = { ...base, payu_order_id: 'orden-propia-51', payu_payment_id: 'transaccion-propia-51',
        payu_payment_status: 'CHARGED_BACK', pago_revision_motivo: 'reversion_payu', estado_entrega: 'cancelado' };
    const escrituras = [];
    await preparar(context, async (r, p) => {
        if (p === '/api/ventas') {
            await r.fulfill({ json: { success: true, data: [{ ...venta, reembolso_elegible: esReembolsoElegible(venta) }] } }); return true;
        }
        if (p !== '/api/ventas/51/reembolso') return false;
        expect(esReembolsoElegible(venta)).toBe(true);
        const body = r.request().postDataJSON(); escrituras.push(body);
        venta = { ...venta, motivo_reembolso: body.motivo,
            estado_reembolso: body.accion === 'solicitar' ? 'pendiente_verificacion' : 'confirmado',
            estado: body.accion === 'solicitar' ? 'pagada' : 'reembolsada',
            pago_revision_motivo: body.accion === 'solicitar' ? 'reversion_payu' : null };
        await r.fulfill({ json: { success: true, data: { estado: venta.estado, stock_devuelto: false } } }); return true;
    });
    await page.goto('/ventas'); await page.getByTitle('Solicitar devolución PayU').click();
    await page.getByLabel('Motivo de la devolución').fill('Registrar contracargo identificado en PayU');
    await page.getByRole('button', { name: 'Registrar solicitud pendiente' }).click();
    await expect(page.getByTitle('Verificar devolución PayU')).toBeVisible();
    await page.getByTitle('Verificar devolución PayU').click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Referencia de devolución PayU').fill('contracargo-verificado-51');
    await modal.getByLabel('Evidencia verificable de la devolución').fill('Contracargo de la transacción propia verificado documentalmente.');
    await expect(modal.getByRole('checkbox')).not.toBeChecked();
    await modal.getByRole('button', { name: 'Confirmar verificación documental' }).click();
    await expect(page.getByTitle('Verificar devolución PayU')).toHaveCount(0);
    await expect(page.locator('.data-table-shell tbody tr')).toContainText('Reembolsada');
    expect(escrituras.map(e => e.accion)).toEqual(['solicitar', 'confirmar']);
    for (const body of escrituras) {
        expect(Object.keys(body).sort()).toEqual(['accion', 'devolver_stock', 'evidencia_reembolso', 'motivo', 'referencia_reembolso']);
        expect(body.devolver_stock).toBe(false);
    }
});

test('Ventas: API no elegible por pago sin identificar, histórico o cierre no ofrece devolución de contracargo', async ({ page, context }) => {
    const identificada = { ...base, payu_order_id: 'orden-propia', payu_payment_id: 'transaccion-propia', payu_payment_status: 'CHARGED_BACK' };
    const ventas = [
        { ...identificada, id_venta: 51, payu_order_id: null },
        { ...identificada, id_venta: 52, payu_payment_id: ' ' },
        { ...identificada, id_venta: 53, external_reference: '' },
        { ...identificada, id_venta: 54, origen: 'panel' },
        { ...identificada, id_venta: 55, id_reserva: 9 },
        { ...identificada, id_venta: 56, estado: 'reembolsada', estado_reembolso: 'confirmado' },
    ];
    expect(ventas.map(esReembolsoElegible)).toEqual(ventas.map(() => false));
    await preparar(context, async (r, p) => {
        if (p !== '/api/ventas') return false;
        await r.fulfill({ json: { success: true, data: ventas.map(v => ({ ...v, reembolso_elegible: esReembolsoElegible(v) })) } }); return true;
    });
    await page.goto('/ventas');
    await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(ventas.length);
    await expect(page.getByTitle('Solicitar devolución PayU')).toHaveCount(0);
    await expect(page.getByTitle('Verificar devolución PayU')).toHaveCount(0);
});

for (const devolver of [false, true]) {
    test(`Reembolso: delivery pagado cancelado repone stock solo con confirmación física (${devolver})`, async ({ page, context }) => {
        const venta = { ...base, estado_entrega: 'cancelado', estado_reembolso: 'pendiente_verificacion', motivo_reembolso: 'Devolución solicitada' };
        const escrituras = [];
        await preparar(context, async (r, p) => {
            if (p === '/api/ventas') { await r.fulfill({ json: { success: true, data: [venta] } }); return true; }
            if (p !== '/api/ventas/51/reembolso') return false;
            escrituras.push(r.request().postDataJSON());
            await r.fulfill({ json: { success: true, data: { stock_devuelto: devolver, estado: 'reembolsada' } } }); return true;
        });
        await page.goto('/ventas'); await page.getByTitle('Verificar devolución PayU').click();
        const modal = page.getByRole('dialog');
        const checkbox = modal.getByRole('checkbox', { name: 'El cliente devolvió los libros y están disponibles para vender.' });
        await expect(checkbox).not.toBeChecked();
        await expect(modal).toContainText('Solo se repondrá stock si confirmas su devolución física');
        await expect(modal).not.toContainText('se liberará el stock de los libros que no salieron');
        await modal.getByLabel('Referencia de devolución PayU').fill('refund-local-51');
        await modal.getByLabel('Evidencia verificable de la devolución').fill('Comprobante externo revisado por el administrador.');
        if (devolver) await checkbox.check();
        await modal.getByRole('button', { name: 'Confirmar verificación documental' }).click();
        await expect.poll(() => escrituras.length).toBe(1);
        expect(escrituras[0].devolver_stock).toBe(devolver);
    });
}

test('Reembolso: compra cancelada con cobro tardío/reversión no ofrece un segundo reingreso', async ({ page, context }) => {
    await preparar(context, async (r, p) => {
        if (p !== '/api/ventas') return false;
        await r.fulfill({ json: { success: true, data: [{ ...base, estado: 'cancelada', estado_entrega: 'cancelado',
            payu_payment_status: 'REFUNDED', pago_revision_motivo: 'reversion_payu', estado_reembolso: 'pendiente_verificacion' }] } });
        return true;
    });
    await page.goto('/ventas'); await page.getByTitle('Verificar devolución PayU').click();
    await expect(page.getByRole('dialog')).toContainText('El stock ya se liberó al cancelar; no se ingresará nuevamente');
    await expect(page.getByRole('dialog').getByRole('checkbox')).toHaveCount(0);
});
