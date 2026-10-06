const test = require('node:test');
const assert = require('node:assert/strict');
const ventas = require('../src/models/venta.model');
const reservas = require('../src/models/reserva.model');
const { esReembolsoElegible } = require('../src/utils/devoluciones');
const { esVentaHistorica } = require('../src/utils/transiciones');
const { validarCobroTienda } = require('../src/utils/metodosPago');

for (const metodo of ['efectivo', 'yape', 'plin', 'transferencia', 'tarjeta']) {
    test(`modelo: ${metodo} no crea ventas ni admite cobro`, async () => {
        assert.equal(validarCobroTienda(metodo).ok, false);
        await assert.rejects(ventas.crear({ metodo_pago: metodo }), e => e.status === 409);
    });
}
for (const origen of ['panel', 'reserva']) {
    test(`modelo: origen ${origen} bloqueado incluso con vínculo a reserva`, async () => {
        assert.equal(esVentaHistorica({ origen, id_reserva: 1 }), true);
        await assert.rejects(ventas.crear({ origen, id_reserva: 1 }), e => e.status === 409);
    });
}
test('modelo: reservas no se crean ni se completan', async () => {
    await assert.rejects(reservas.crear({}), e => e.status === 405);
    await assert.rejects(reservas.actualizarEstado(1, 'completada', { alCompletar: () => assert.fail('No se invoca el cobro') }), e => e.status === 409);
});
test('modelo: estado pagada no se crea ni se confirma manualmente', async () => {
    await assert.rejects(ventas.crear({ estado: 'pagada' }), e => e.status === 409);
    await assert.rejects(ventas.actualizarEstado(1, 'pagada'), e => e.status === 409);
});
test('modelo: referencia manual no se acepta como operación nueva', async () => {
    await assert.rejects(ventas.crear({ referencia_pago: 'operacion-manual' }), e => e.status === 409);
});
test('modelo: entrega no se confirma desde Ventas', async () => {
    await assert.rejects(ventas.actualizarEstado(1, 'entregada'), e => e.status === 409);
});
test('PayU: elegibilidad exige origen, método, referencias y estado válidos', () => {
    const venta = { origen: 'app', estado: 'pagada', metodo_pago: 'payu', external_reference: 'ref',
        payu_order_id: 'order', payu_payment_id: 'tx', payu_payment_status: 'APPROVED' };
    assert.equal(esReembolsoElegible(venta), true);
    for (const extra of [{ origen: 'reserva', id_reserva: 1 }, { origen: 'panel' }, { metodo_pago: 'efectivo' },
        { payu_payment_id: null }, { external_reference: null }, { payu_order_id: null },
        { payu_payment_status: 'DECLINED' }, { estado: 'reembolsada' }]) {
        assert.equal(esReembolsoElegible({ ...venta, ...extra }), false);
    }
});
