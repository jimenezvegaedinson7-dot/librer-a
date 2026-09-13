// ============================================================
// TESTS DE VALIDACIÓN DE FECHA DE VENCIMIENTO DE RESERVA
// ============================================================
// Sin BD: usa la función pura exportada por reserva.model.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    validarFechaVencimiento
} = require('../src/models/reserva.model');

// ========================================
// HELPERS PARA CONSTRUIR FECHAS DE PRUEBA
// ========================================
const enDias = (dias) => {
    const hoy = new Date();
    const fecha = new Date(Date.UTC(
        hoy.getUTCFullYear(),
        hoy.getUTCMonth(),
        hoy.getUTCDate()
    ));
    fecha.setUTCDate(fecha.getUTCDate() + dias);

    const mes = String(
        fecha.getUTCMonth() + 1
    ).padStart(2, '0');
    const dia = String(
        fecha.getUTCDate()
    ).padStart(2, '0');

    return `${fecha.getUTCFullYear()}-${mes}-${dia}`;
};

const pasada = () => enDias(-1);

test('fecha de vencimiento en 3 días es válida', () => {
    const resultado =
        validarFechaVencimiento(enDias(3));

    assert.equal(resultado.valida, true);
    assert.equal(resultado.fecha, enDias(3));
});

test('fecha de vencimiento mañana (hoy+1) es válida (borde)', () => {
    const resultado =
        validarFechaVencimiento(enDias(1));

    assert.equal(resultado.valida, true);
});

test('fecha de vencimiento en 14 días es válida (borde superior)', () => {
    const resultado =
        validarFechaVencimiento(enDias(14));

    assert.equal(resultado.valida, true);
});

test('fecha de vencimiento en 15 días es rechazada', () => {
    const resultado =
        validarFechaVencimiento(enDias(15));

    assert.equal(resultado.valida, false);
    assert.match(
        resultado.mensaje,
        /entre 1 y 14 días/
    );
});

test('fecha de vencimiento pasada es rechazada', () => {
    const resultado =
        validarFechaVencimiento(pasada());

    assert.equal(resultado.valida, false);
    assert.match(
        resultado.mensaje,
        /entre 1 y 14 días/
    );
});

test('formato inválido es rechazado (no YYYY-MM-DD)', () => {
    const casos = [
        '2026-13-45',
        '2026/01/01',
        '01-01-2026',
        'texto',
        '2026-1-1'
    ];

    for (const caso of casos) {
        const resultado =
            validarFechaVencimiento(caso);

        assert.equal(
            resultado.valida,
            false,
            `debería rechazar "${caso}"`
        );
    }
});

test('fecha inexistente (31 de febrero) es rechazada', () => {
    const resultado =
        validarFechaVencimiento('2026-02-31');

    assert.equal(resultado.valida, false);
});

test('sin fecha se usa el default existente (null)', () => {
    assert.deepEqual(
        validarFechaVencimiento(undefined),
        { valida: true, fecha: null }
    );
    assert.deepEqual(
        validarFechaVencimiento(null),
        { valida: true, fecha: null }
    );
    assert.deepEqual(
        validarFechaVencimiento(''),
        { valida: true, fecha: null }
    );
});