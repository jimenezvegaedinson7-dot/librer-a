// ============================================================
// TESTS DE VALIDACIÓN DE DNI/RUC DEL CLIENTE EN FACTURAS
// ============================================================
// Sin BD: usa las funciones puras exportadas por comprobante.model.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    esClienteDniRucValido,
    normalizarTipoDocumentoCliente,
    validarDatosClienteFactura
} = require('../src/models/comprobante.model');

// ----------------------------------------
// DNI/RUC VÁLIDO (>= 8 caracteres, alfanumérico)
// ----------------------------------------
test('DNI de 8 dígitos es válido', () => {
    assert.equal(
        esClienteDniRucValido('12345678'),
        true
    );
});

test('RUC de 11 dígitos es válido', () => {
    assert.equal(
        esClienteDniRucValido('10447545387'),
        true
    );
});

test('carné de extranjería alfanumérico (8+) es válido', () => {
    assert.equal(
        esClienteDniRucValido('ABC12345'),
        true
    );
});

// ----------------------------------------
// DNI/RUC INVÁLIDO
// ----------------------------------------
test('7 caracteres o menos es rechazado', () => {
    assert.equal(
        esClienteDniRucValido('1234567'),
        false
    );
});

test('caracteres no alfanuméricos son rechazados', () => {
    assert.equal(
        esClienteDniRucValido('1234567!'),
        false
    );
});

test('valor ausente es rechazado', () => {
    assert.equal(
        esClienteDniRucValido(undefined),
        false
    );
    assert.equal(esClienteDniRucValido(null), false);
    assert.equal(esClienteDniRucValido(''), false);
});

// ----------------------------------------
// REGLA FACTURA-SIN-DNI
// ----------------------------------------
test('factura sin DNI/RUC da error 400 (mensaje en español)', () => {
    const resultado =
        validarDatosClienteFactura('factura', '');

    assert.equal(resultado.ok, false);
    assert.match(
        resultado.mensaje,
        /La factura requiere el RUC o DNI del cliente/
    );
});

test('factura con DNI/RUC válido pasa la validación', () => {
    const resultado =
        validarDatosClienteFactura('factura', '10447545387');

    assert.equal(resultado.ok, true);
});

test('boleta no exige DNI/RUC', () => {
    const resultado =
        validarDatosClienteFactura('boleta', '');

    assert.equal(resultado.ok, true);
});

// ----------------------------------------
// TIPO DE DOCUMENTO
// ----------------------------------------
test('factura usa default RUC si no llega tipo de documento', () => {
    assert.equal(
        normalizarTipoDocumentoCliente(
            'factura',
            undefined
        ),
        'RUC'
    );
    assert.equal(
        normalizarTipoDocumentoCliente(
            'factura',
            ''
        ),
        'RUC'
    );
});

test('factura normaliza tipo a mayúsculas y acepta los válidos', () => {
    assert.equal(
        normalizarTipoDocumentoCliente(
            'factura',
            'dni'
        ),
        'DNI'
    );
    assert.equal(
        normalizarTipoDocumentoCliente(
            'factura',
            'CE'
        ),
        'CE'
    );
    assert.equal(
        normalizarTipoDocumentoCliente(
            'factura',
            'PASAPORTE'
        ),
        'PASAPORTE'
    );
});

test('factura con tipo inválido vuelve a default RUC', () => {
    assert.equal(
        normalizarTipoDocumentoCliente(
            'factura',
            'TARJETA'
        ),
        'RUC'
    );
});

test('boleta no guarda tipo de documento (null)', () => {
    assert.equal(
        normalizarTipoDocumentoCliente(
            'boleta',
            'DNI'
        ),
        null
    );
});