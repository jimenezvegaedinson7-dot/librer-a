const test = require('node:test');
const assert = require('node:assert/strict');

const {
    extraerEstadoOrdenPayu,
    montoPagoCoincide,
    debeActualizarEstadoPago
} = require('../src/utils/payuStatus');

test('prioriza pago aprobado en transactionResponse', () => {
    const estado = extraerEstadoOrdenPayu({
        transactionResponse: {
            state: 'APPROVED',
            value: 12500,
            transactionId: 'payu-tx-1',
            pendingReason: null
        }
    });

    assert.equal(estado.status, 'APPROVED');
    assert.equal(estado.pagado, true);
    assert.equal(estado.paymentId, 'payu-tx-1');
    assert.equal(estado.amount, 125);
});

test('orden rechazada se reconoce como cancelada', () => {
    const estado = extraerEstadoOrdenPayu({
        transactionResponse: {
            state: 'DECLINED',
            value: 10000
        }
    });

    assert.equal(estado.status, 'DECLINED');
    assert.equal(estado.cancelado, true);
    assert.equal(estado.pagado, false);
});

test('orden pendiente permanece pendiente', () => {
    const estado = extraerEstadoOrdenPayu({
        transactionResponse: {
            state: 'PENDING',
            value: 10000
        }
    });

    assert.equal(estado.status, 'PENDING');
    assert.equal(estado.pagado, false);
    assert.equal(estado.pendiente, true);
});

test('estado desconocido no marca pagado ni cancelado', () => {
    const estado = extraerEstadoOrdenPayu({});

    assert.equal(estado.status, 'UNKNOWN');
    assert.equal(estado.pagado, false);
    assert.equal(estado.cancelado, false);
    assert.equal(estado.pendiente, false);
});

test('extrae monto desde top-level amount en centavos', () => {
    const estado = extraerEstadoOrdenPayu({
        amount: 5000
    });

    assert.equal(estado.amount, 50);
});

test('valida el monto con tolerancia monetaria', () => {
    assert.equal(montoPagoCoincide('100.00', 100), true);
    assert.equal(montoPagoCoincide(100.02, 100), true);
    assert.equal(montoPagoCoincide(100.03, 100), false);
    assert.equal(montoPagoCoincide(null, 0), false);
});

test('un intento tardío no degrada un pago aprobado', () => {
    assert.equal(
        debeActualizarEstadoPago('APPROVED', 'DECLINED'),
        false
    );
    assert.equal(
        debeActualizarEstadoPago('APPROVED', 'PENDING'),
        false
    );
    assert.equal(
        debeActualizarEstadoPago('APPROVED', 'REFUNDED'),
        true
    );
    assert.equal(
        debeActualizarEstadoPago('REFUNDED', 'APPROVED'),
        false
    );
});