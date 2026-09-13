// ============================================================
// TESTS DE TRANSICIONES DE ESTADO (VENTA Y RESERVA)
// ============================================================
// Sin BD: solo lógica pura de la máquina de estados unificada
// (src/utils/transiciones.js).
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    VENTA,
    RESERVA,
    permitirTransicion,
    estadosValidos
} = require('../src/utils/transiciones');

// ----------------------------------------
// VENTA
// ----------------------------------------
test('venta: pendiente -> pagada es permitido', () => {
    assert.equal(
        permitirTransicion(VENTA, 'pendiente', 'pagada'),
        true
    );
});

test('venta: pendiente -> cancelada es permitido', () => {
    assert.equal(
        permitirTransicion(VENTA, 'pendiente', 'cancelada'),
        true
    );
});

test('venta: pagada -> entregada es permitido', () => {
    assert.equal(
        permitirTransicion(VENTA, 'pagada', 'entregada'),
        true
    );
});

test('venta: entregada -> cancelada es FALSO (FASE 5)', () => {
    assert.equal(
        permitirTransicion(VENTA, 'entregada', 'cancelada'),
        false
    );
});

test('venta: entregada no tiene transiciones salientes', () => {
    assert.equal(
        estadosValidos(VENTA).includes('entregada'),
        true
    );
    assert.deepEqual(VENTA.entregada, []);
});

test('venta: cancelada es estado final y no regresa', () => {
    assert.equal(
        permitirTransicion(VENTA, 'cancelada', 'pendiente'),
        false
    );
    assert.equal(
        permitirTransicion(VENTA, 'cancelada', 'pagada'),
        false
    );
});

test('venta: pendiente -> entregada salta etapa y es FALSO', () => {
    assert.equal(
        permitirTransicion(VENTA, 'pendiente', 'entregada'),
        false
    );
});

// ----------------------------------------
// RESERVA
// ----------------------------------------
test('reserva: pendiente -> confirmada es permitido', () => {
    assert.equal(
        permitirTransicion(RESERVA, 'pendiente', 'confirmada'),
        true
    );
});

test('reserva: confirmada -> completada es permitido', () => {
    assert.equal(
        permitirTransicion(RESERVA, 'confirmada', 'completada'),
        true
    );
});

test('reserva: completada ya no se puede cancelar', () => {
    assert.equal(
        permitirTransicion(RESERVA, 'completada', 'cancelada'),
        false
    );
});

test('reserva: cancelada es estado final', () => {
    assert.equal(
        permitirTransicion(RESERVA, 'cancelada', 'confirmada'),
        false
    );
    assert.deepEqual(RESERVA.cancelada, []);
});