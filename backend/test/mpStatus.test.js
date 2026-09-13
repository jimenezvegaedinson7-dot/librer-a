const test = require('node:test');
const assert = require('node:assert/strict');

const {
    extraerEstadoOrdenMP,
    montoPagoCoincide,
    debeActualizarEstadoPago
} = require('../src/utils/mpStatus');

test('prioriza pago aprobado anidado sobre orden processed', () => {
    const estado = extraerEstadoOrdenMP({
        status: 'processed',
        transactions: {
            payments: [
                {
                    id: 'pago-1',
                    status: 'approved',
                    status_detail: 'accredited'
                }
            ]
        }
    });

    assert.equal(estado.status, 'approved');
    assert.equal(estado.pagado, true);
    assert.equal(estado.paymentId, 'pago-1');
});

test('usa payment_status cuando no hay payments anidados', () => {
    const estado = extraerEstadoOrdenMP({
        status: 'processed',
        payment_status: 'approved'
    });

    assert.equal(estado.status, 'approved');
    assert.equal(estado.pagado, true);
});

test('orden created sin pago permanece pendiente', () => {
    const estado = extraerEstadoOrdenMP({ status: 'created' });

    assert.equal(estado.status, 'created');
    assert.equal(estado.pagado, false);
    assert.equal(estado.cancelado, false);
});

test('pago rechazado se reconoce como cancelado', () => {
    const estado = extraerEstadoOrdenMP({
        status: 'processed',
        transactions: {
            payments: [{ status: 'rejected' }]
        }
    });

    assert.equal(estado.status, 'rejected');
    assert.equal(estado.cancelado, true);
});

test('pago anidado pendiente impide tratar la orden como abandonada', () => {
    const estado = extraerEstadoOrdenMP({
        status: 'processed',
        transactions: {
            payments: [{ status: 'pending' }]
        }
    });

    assert.equal(estado.status, 'pending');
    assert.equal(estado.pagado, false);
    assert.equal(estado.pendiente, true);
});

test('pago pendiente domina un intento rechazado anterior', () => {
    const estado = extraerEstadoOrdenMP({
        status: 'processed',
        transactions: {
            payments: [
                { status: 'rejected' },
                { status: 'pending' }
            ]
        }
    });

    assert.equal(estado.status, 'pending');
    assert.equal(estado.cancelado, false);
    assert.equal(estado.pendiente, true);
});

test('valida el monto con tolerancia monetaria', () => {
    assert.equal(montoPagoCoincide('100.00', 100), true);
    assert.equal(montoPagoCoincide(100.02, 100), true);
    assert.equal(montoPagoCoincide(100.03, 100), false);
    assert.equal(montoPagoCoincide(null, 0), false);
});

test('un intento tardío no degrada un pago aprobado', () => {
    assert.equal(
        debeActualizarEstadoPago('approved', 'rejected'),
        false
    );
    assert.equal(
        debeActualizarEstadoPago('approved', 'pending'),
        false
    );
    assert.equal(
        debeActualizarEstadoPago('approved', 'refunded'),
        true
    );
    assert.equal(
        debeActualizarEstadoPago('refunded', 'approved'),
        false
    );
});
