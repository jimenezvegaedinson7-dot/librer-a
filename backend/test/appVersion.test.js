// ============================================================
// TESTS DE GET /api/app/version (actualizaciones del APK)
// ============================================================
// Sin BD ni red: valida la configuración y el archivo real
// src/config/app-version.json.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    validarConfiguracion,
    PREFIJO_APK_AUTORIZADO
} = require('../src/controllers/app.controller');

const base = {
    version: '1.0.1',
    versionCode: 2,
    apkUrl: `${PREFIJO_APK_AUTORIZADO}v1.0.1/libreria-1.0.1.apk`,
    sha256: 'a'.repeat(64),
    obligatoria: false,
    notas: 'Mejoras y correcciones'
};

test('una configuración correcta se publica tal cual', () => {
    const { datos, error } = validarConfiguracion(base);
    assert.equal(error, undefined);
    assert.deepEqual(datos, base);
});

test('obligatoria solo es true si viene exactamente true', () => {
    assert.equal(validarConfiguracion({ ...base, obligatoria: 'true' }).datos.obligatoria, false);
    assert.equal(validarConfiguracion({ ...base, obligatoria: true }).datos.obligatoria, true);
});

const invalidas = [
    ['versión sin formato X.Y.Z', { version: '1.0' }],
    ['versionCode 0', { versionCode: 0 }],
    ['versionCode con decimales', { versionCode: 2.5 }],
    ['versionCode como texto', { versionCode: '2' }],
    ['APK por HTTP', { apkUrl: 'http://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/v1/a.apk' }],
    ['APK de otro repositorio', { apkUrl: 'https://github.com/otro/repo/releases/download/v1/a.apk' }],
    ['APK de otro dominio', { apkUrl: 'https://ejemplo.com/libreria.apk' }],
    ['prefijo engañoso', { apkUrl: 'https://github.com.evil.com/jimenezvegaedinson7-dot/librer-a/releases/download/a.apk' }],
    ['ruta con ..', { apkUrl: `${PREFIJO_APK_AUTORIZADO}../../../otro/repo/a.apk` }],
    ['sin sha256', { sha256: '' }],
    ['sha256 corto', { sha256: 'abc' }]
];

for (const [nombre, cambio] of invalidas) {
    test(`rechaza: ${nombre}`, () => {
        const { datos, error } = validarConfiguracion({ ...base, ...cambio });
        assert.equal(datos, undefined);
        assert.ok(error);
    });
}

test('el archivo real app-version.json es válido', () => {
    const config = require('../src/config/app-version.json');
    const { error } = validarConfiguracion(config);
    assert.equal(error, undefined, error);
});
