// ============================================================
// TESTS DE CIFRADO/DESCIFRADO 2FA
// ============================================================
// Sin BD: solo se prueba la función pura cifrar/descifrar.
// La clave se inyecta como variable temporal de prueba (placeholder
// de 32 caracteres). NO se usa el secreto real de ningún .env.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

// Placeholder de prueba (32 caracteres), no el secreto real.
const CLAVE_PRUEBA = 'clave_de_prueba_para_el_test_2fa_0123456';

test('round-trip: cifrar y descifrar recupera el texto original', () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = CLAVE_PRUEBA;

    const { cifrar, descifrar } = require('../src/utils/crypto');

    const secreto = 'JBSWY3DPEHPK3PXP';

    const cifrado = cifrar(secreto);

    assert.notEqual(cifrado, secreto);
    assert.ok(String(cifrado).includes(':'));

    assert.equal(descifrar(cifrado), secreto);
});

test('lanza error si la clave de cifrado no está configurada', () => {
    delete process.env.TWO_FACTOR_ENCRYPTION_KEY;

    const { cifrar } = require('../src/utils/crypto');

    assert.throws(
        () => cifrar('texto'),
        /TWO_FACTOR_ENCRYPTION_KEY/
    );
});

test('lanza error si el texto cifrado tiene formato inválido', () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = CLAVE_PRUEBA;

    const { descifrar } = require('../src/utils/crypto');

    assert.throws(
        () => descifrar('formato-sin-los-dos-puntos'),
        /Error al descifrar/
    );
});

test('cifrar/descifrar devuelven el mismo valor si no hay texto', () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = CLAVE_PRUEBA;

    const { cifrar, descifrar } = require('../src/utils/crypto');

    assert.equal(cifrar(''), '');
    assert.equal(cifrar(null), null);
    assert.equal(cifrar(undefined), undefined);
    assert.equal(descifrar(null), null);
});