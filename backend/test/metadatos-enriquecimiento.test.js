const test = require('node:test');
const assert = require('node:assert/strict');
const { CAMPOS, combinar, extraerDeBulk, extraerDeBusqueda, extraerDeIndividual, idioma, formato } = require('../scripts/enriquecerMetadatosLibros');

test('extrae metadatos verificados de las respuestas de Open Library', () => {
    assert.deepEqual(
        extraerDeBulk({ publishers: [{ name: 'Planeta' }], number_of_pages: 272, publish_date: '2015 November' }),
        { editorial: 'Planeta', anio_publicacion: 2015, numero_paginas: 272 }
    );
    assert.deepEqual(
        extraerDeIndividual({
            publishers: ['Vintage Contemporaries'],
            languages: ['/languages/spa'],
            number_of_pages: 335,
            publish_date: '2005',
            physical_format: 'Paperback',
            physical_dimensions: '8.1 x 5.5 x 1.1 inches'
        }),
        {
            editorial: 'Vintage Contemporaries',
            idioma: 'Español',
            numero_paginas: 335,
            anio_publicacion: 2005,
            formato: 'Tapa blanda',
            dimensiones: '8.1 x 5.5 x 1.1 inches'
        }
    );
    assert.deepEqual(extraerDeBusqueda({ language: ['spa'] }), { idioma: 'Español' });
    assert.deepEqual(extraerDeBusqueda({ language: ['spa', 'eng'] }), { idioma: null });
    assert.equal(idioma('/languages/eng'), 'Inglés');
    assert.equal(formato('hardcover'), 'Tapa dura');
});

test('la combinación prioriza datos existentes y no inventa campos sin fuente', () => {
    const resultado = combinar(
        { isbn: '9780000000001', titulo: 'Prueba', editorial: 'Editorial propia', fuentes: ['semilla-local'] },
        { anio_publicacion: 1991, numero_paginas: 240 },
        extraerDeIndividual({ physical_format: 'Paperback' }),
        'Español'
    );
    assert.equal(resultado.editorial, 'Editorial propia');
    assert.equal(resultado.anio_publicacion, 1991);
    assert.equal(resultado.numero_paginas, 240);
    assert.equal(resultado.formato, 'Tapa blanda');
    assert.equal(resultado.idioma, 'Español');
    assert.equal(resultado.numero_volumen, null);
    assert.equal(resultado.dimensiones, null);
    assert.deepEqual(resultado.fuentes_campo.editorial, 'semilla');
    assert.deepEqual(resultado.fuentes_campo.idioma, 'openlibrary_obra');
    assert.ok(CAMPOS.every((campo) => campo in resultado));
});
