// ============================================================
// TESTS DE DETECCIÓN DE IMÁGENES (magic bytes)
// ============================================================
// Sin dependencia de la BD ni de archivos reales: solo buffers
// construidos en memoria con los magic bytes de JPEG, PNG y WebP.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const { detectarImagen } = require('../src/utils/fileType');

test('detecta JPEG por sus magic bytes (FF D8 FF)', () => {
    const buffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0,
        0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01
    ]);

    assert.deepEqual(
        detectarImagen(buffer),
        { tipo: 'image/jpeg', extension: '.jpg' }
    );
});

test('detecta PNG por sus magic bytes (89 50 4E 47 ...)', () => {
    const buffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47,
        0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D
    ]);

    assert.deepEqual(
        detectarImagen(buffer),
        { tipo: 'image/png', extension: '.png' }
    );
});

test('detecta WebP por su cabecera RIFF....WEBP', () => {
    const buffer = Buffer.concat([
        Buffer.from('RIFF'),
        Buffer.from([0x24, 0x00, 0x00, 0x00]),
        Buffer.from('WEBP')
    ]);

    assert.deepEqual(
        detectarImagen(buffer),
        { tipo: 'image/webp', extension: '.webp' }
    );
});

test('devuelve null para datos basura que no son imagen', () => {
    const buffer = Buffer.from(
        'contenido que no es una imagen de verdad',
        'utf8'
    );

    assert.equal(detectarImagen(buffer), null);
});

test('devuelve null para buffers vacíos o inválidos', () => {
    assert.equal(detectarImagen(null), null);
    assert.equal(detectarImagen(undefined), null);
    assert.equal(detectarImagen(Buffer.alloc(0)), null);
    assert.equal(detectarImagen('no soy un buffer'), null);
});