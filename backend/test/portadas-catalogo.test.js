const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { conPortadaCatalogo } = require('../src/utils/portadasCatalogo');
const indice = require('../src/config/portadasCatalogo.json');

test('backend empaqueta el mismo índice y referencias que la tienda', () => {
    const tienda = path.resolve(__dirname, '../../frontend/src/public-site/tienda');
    assert.deepEqual(indice.portadas, JSON.parse(readFileSync(path.join(tienda, 'portadasCatalogo.json'), 'utf8')));
    assert.deepEqual(indice.referencias, JSON.parse(readFileSync(path.join(tienda, 'portadasReferencia.json'), 'utf8')));
});
test('portada real por ISBN sale como URL absoluta sin mutar datos comerciales', () => {
    const original = Object.freeze({ id_libro: 65, titulo: 'Persuasión', isbn: '978-9580412342', portada: null, precio: '45.00', stock: 7 });
    const salida = conPortadaCatalogo(original);
    assert.equal(salida.portada, 'https://librer-a-zeta.vercel.app/portadas/9789580412342.jpg');
    assert.equal(salida.portada_registrada, null);
    assert.equal(salida.portada_es_referencia, false);
    assert.equal(original.portada, null);
    for (const campo of ['id_libro', 'titulo', 'isbn', 'precio', 'stock']) assert.equal(salida[campo], original[campo]);
});
test('las cinco referencias separan el ISBN del registro y el de la imagen', () => {
    for (const [isbn, referencia] of Object.entries(indice.referencias)) {
        const l = conPortadaCatalogo({ isbn, portada: null });
        assert.equal(l.isbn, isbn);
        assert.equal(l.portada_es_referencia, true);
        assert.equal(l.portada_edicion_referencia.isbn, referencia.isbnEdicion);
        assert.notEqual(l.portada_edicion_referencia.isbn, l.isbn);
    }
});
test('portada subida manualmente conserva prioridad y no hereda la etiqueta de referencia', () => {
    for (const portada of ['https://res.cloudinary.com/prueba/image/upload/manual.jpg', '/uploads/portadas/manual.jpg']) {
        const l = conPortadaCatalogo({ isbn: '9789700508900', portada });
        assert.equal(l.portada, portada);
        assert.equal(l.portada_registrada, portada);
        assert.equal(l.portada_es_referencia, false);
        assert.equal(l.portada_edicion_referencia, null);
        assert.match(l.portada_respaldo, /9789700508900-referencia\.jpg$/);
    }
});
test('ISBN desconocido, nulo o nombre de propiedad no inventa una portada', () => {
    for (const isbn of [null, '', '9780000000055', '__proto__', 'constructor']) {
        assert.equal(conPortadaCatalogo({ isbn, portada: null }).portada, null);
    }
    assert.equal(conPortadaCatalogo(null), null);
});
