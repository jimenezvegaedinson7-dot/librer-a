// ============================================================
// TESTS DE DETECCIÓN DE ARCHIVOS (magic bytes)
// ============================================================
// Sin dependencia de la BD ni de archivos reales: solo buffers
// construidos en memoria con los magic bytes de JPEG, PNG, WebP,
// MP4, MOV y WebM.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    detectarImagen,
    detectarVideo
} = require('../src/utils/fileType');

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

// ============================================================
// VIDEOS DE LOS ANUNCIOS
// ============================================================

// Un MP4/QuickTime empieza con un box "ftyp" en los bytes 4-8.
const conFtyp = (marca) => Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from('ftyp'),
    Buffer.from(marca),
    Buffer.from([0x00, 0x00, 0x02, 0x00])
]);

test('detecta MP4 por su box ftyp', () => {
    assert.deepEqual(
        detectarVideo(conFtyp('isom')),
        { tipo: 'video/mp4', extension: '.mp4' }
    );
});

test('detecta las marcas de 4 bytes con espacio final (M4V de iTunes)', () => {
    assert.deepEqual(
        detectarVideo(conFtyp('M4V ')),
        { tipo: 'video/mp4', extension: '.mp4' }
    );
});

test('no acepta audio con caja ftyp (M4A) como video', () => {
    assert.equal(detectarVideo(conFtyp('M4A ')), null);
});

test('detecta MOV por su box ftyp', () => {
    assert.deepEqual(
        detectarVideo(conFtyp('qt  ')),
        { tipo: 'video/quicktime', extension: '.mov' }
    );
});

test('detecta WebM por su cabecera EBML', () => {
    const buffer = Buffer.concat([
        Buffer.from([0x1A, 0x45, 0xDF, 0xA3]),
        Buffer.from([0x01, 0x00, 0x00, 0x00])
    ]);

    assert.deepEqual(
        detectarVideo(buffer),
        { tipo: 'video/webm', extension: '.webm' }
    );
});

test('un archivo renombrado a .mp4 no pasa por ser video', () => {
    // El caso que motiva mirar los magic bytes: un .txt o una imagen
    // con extension de video se rechazan igual.
    assert.equal(
        detectarVideo(Buffer.from('esto es un texto', 'utf8')),
        null
    );
    assert.equal(
        detectarVideo(
            Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0,
                0x00, 0x10, 0x4A, 0x46
            ])
        ),
        null
    );
});

test('detectarVideo devuelve null para entradas inválidas', () => {
    assert.equal(detectarVideo(null), null);
    assert.equal(detectarVideo(undefined), null);
    assert.equal(detectarVideo(Buffer.alloc(0)), null);
    assert.equal(detectarVideo('no soy un buffer'), null);
});