// ============================================================
// TESTS DE POLÍTICA DE CONTRASEÑAS (reseteo)
// ============================================================
// Sin BD: solo se prueba la función pura validarPassword usada
// por el registro y por el restablecimiento de contraseña.
// Requerir el controlador no abre conexiones (el pool de pg se
// crea de forma perezosa y no conecta en el import).
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const { validarPassword } = require('../src/controllers/auth.controller');

test('acepta contraseñas válidas (al menos 8, con letra y número)', () => {
    assert.equal(validarPassword('clave1234'), true);
    assert.equal(validarPassword('ClaveSegura2026'), true);
    assert.equal(validarPassword('a1b2c3d4'), true);
});

test('rechaza contraseñas demasiado cortas', () => {
    assert.equal(
        validarPassword('clave12'),
        'La contraseña debe tener al menos 8 caracteres'
    );
    assert.equal(
        validarPassword(''),
        'La contraseña debe tener al menos 8 caracteres'
    );
    assert.equal(
        validarPassword(null),
        'La contraseña debe tener al menos 8 caracteres'
    );
});

test('rechaza contraseñas sin números', () => {
    const resultado = validarPassword('sololetras');
    assert.notEqual(resultado, true);
    assert.match(resultado, /número/);
});

test('rechaza contraseñas sin letras', () => {
    const resultado = validarPassword('12345678');
    assert.notEqual(resultado, true);
    assert.match(resultado, /letra/);
});

test('rechaza contraseñas sin número y sin letra al mismo tiempo', () => {
    const resultado = validarPassword('########');
    assert.notEqual(resultado, true);
});