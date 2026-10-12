const test = require('node:test');
const assert = require('node:assert/strict');
const { esReembolsoElegible, requiereRevisionPago } = require('../src/utils/devoluciones');

const cobro = { origen: 'app', metodo_pago: 'payu', estado: 'pagada',
    external_reference: 'ref', payu_order_id: '100', payu_payment_id: 'tx', payu_payment_status: 'APPROVED' };

for (const status of ['REFUNDED', 'CHARGED_BACK']) {
    test(`${status}: permite cierre documental del cobro identificado, no de una cancelación sin cobro`, () => {
        const revertida = { ...cobro, payu_payment_status: status };
        assert.equal(esReembolsoElegible(revertida), true);
        assert.equal(esReembolsoElegible({ ...revertida, estado: 'cancelada' }), false);
        assert.equal(esReembolsoElegible({ ...revertida, estado: 'cancelada', pago_revision_motivo: 'aprobacion_tardia' }), true);
        for (const cambio of [{ payu_payment_id: null }, { payu_order_id: '' }, { origen: 'panel' },
            { id_reserva: 1 }, { estado: 'reembolsada' }, { estado_reembolso: 'confirmado' }]) {
            assert.equal(esReembolsoElegible({ ...revertida, ...cambio }), false);
        }
    });

    test(`${status}: bloquea avance aun sin motivo; el cierre documental resuelve la revisión`, () => {
        const revertida = { ...cobro, payu_payment_status: status };
        assert.equal(requiereRevisionPago(revertida), true);
        assert.equal(requiereRevisionPago({ ...revertida, estado: 'reembolsada', estado_reembolso: 'confirmado' }), false);
    });
}

test('la revisión no depende solo del estado PayU ni pierde la aprobación tardía', () => {
    assert.equal(requiereRevisionPago(cobro), false);
    assert.equal(requiereRevisionPago({ ...cobro, pago_revision_motivo: 'aprobacion_tardia' }), true);
    assert.equal(requiereRevisionPago({ ...cobro, pago_revision_motivo: 'reversion_payu' }), true);
});
