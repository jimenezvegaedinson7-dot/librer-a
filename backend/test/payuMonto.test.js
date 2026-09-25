// ============================================================
// TESTS DEL MONTO ENVIADO A PAYU WEBCHECKOUT
// ============================================================
// El campo `amount` va en SOLES con 2 decimales. Si se envía en
// céntimos ("4000"), PayU cobra 100 veces el total (S/ 4000 por un
// libro de S/ 40). Sin red: solo arma el formulario firmado.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Credenciales FICTICIAS solo para firmar en la prueba.
process.env.PAYU_ACCOUNT_ID = '512323';
process.env.PAYU_MERCHANT_ID = '508029';
process.env.PAYU_API_LOGIN = 'login-de-prueba';
process.env.PAYU_API_KEY = 'clave-de-prueba';
process.env.PAYU_TEST = 'true';

const { construirFormularioCheckout } = require('../src/services/payu.service');

const formulario = (total) =>
    construirFormularioCheckout({
        externalReference: 'orden_1_abc',
        total,
        buyerEmail: 'cliente@ejemplo.com'
    }).campos;

const firma = (amount) =>
    crypto
        .createHash('md5')
        .update(`clave-de-prueba~508029~orden_1_abc~${amount}~PEN`)
        .digest('hex');

for (const [total, esperado] of [
    [40, '40.00'],
    ['40.00', '40.00'],
    [56, '56.00'],
    [36.5, '36.50'],
    [124.85, '124.85'],
    [0.1 + 0.2, '0.30']
]) {
    test(`total ${total} se envía como "${esperado}" (no en céntimos)`, () => {
        const campos = formulario(total);
        assert.equal(campos.amount, esperado);
        assert.equal(campos.currency, 'PEN');
        assert.equal(campos.signature, firma(esperado));
    });
}

test('un libro de S/ 40 nunca se envía como 4000', () => {
    assert.notEqual(formulario(40).amount, '4000');
});

test('rechaza totales inválidos', () => {
    for (const total of [0, -5, 'abc', NaN]) {
        assert.throws(() => formulario(total), /total de la venta no es válido/);
    }
});
