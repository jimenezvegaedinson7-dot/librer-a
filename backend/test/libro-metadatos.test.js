const test = require('node:test');
const assert = require('node:assert/strict');

const rutaDatabase = require.resolve('../src/config/database');
let consultas = [];
require.cache[rutaDatabase] = {
    id: rutaDatabase,
    filename: rutaDatabase,
    loaded: true,
    exports: {
        query: async (sql, params) => {
            consultas.push({ sql, params });
            return sql.includes('SELECT') ? [[], []] : [{ affectedRows: 1, insertId: 1 }, []];
        }
    }
};

const libroModel = require('../src/models/libro.model');
const { normalizarMetadatosBibliograficos } = require('../src/controllers/libro.controller');

const CAMPOS = ['editorial', 'idioma', 'numero_paginas', 'anio_publicacion', 'formato', 'numero_volumen', 'dimensiones'];

test.beforeEach(() => {
    consultas = [];
});

test('normalizar metadatos bibliográficos conserva valores válidos y permite borrar explícitamente', () => {
    assert.deepEqual(
        normalizarMetadatosBibliograficos({
            editorial: ' Planeta ',
            idioma: 'Español',
            numero_paginas: '272',
            anio_publicacion: 1994,
            formato: 'Tapa blanda',
            numero_volumen: '2',
            dimensiones: '21 x 14 cm'
        }),
        {
            valores: {
                editorial: 'Planeta',
                idioma: 'Español',
                numero_paginas: 272,
                anio_publicacion: 1994,
                formato: 'Tapa blanda',
                numero_volumen: '2',
                dimensiones: '21 x 14 cm'
            }
        }
    );
    assert.deepEqual(normalizarMetadatosBibliograficos({ editorial: null, numero_paginas: '' }), { valores: { editorial: null, numero_paginas: null } });
});

test('normalizar metadatos bibliográficos rechaza textos largos y números inválidos', () => {
    for (const body of [{ editorial: 'x'.repeat(201) }, { numero_paginas: 'abc' }, { anio_publicacion: 989 }, { anio_publicacion: 2200 }]) {
        assert.equal(normalizarMetadatosBibliograficos(body).mensaje, 'Metadatos bibliográficos inválidos');
    }
});

test('el catálogo selecciona los campos bibliográficos en la ficha y en las recomendaciones', async () => {
    await libroModel.obtenerTodos();
    await libroModel.obtenerPorId(1);
    await libroModel.obtenerRecomendados(1);

    assert.equal(consultas.length, 3);
    for (const consulta of consultas) {
        assert.match(consulta.sql, /l\.editorial, l\.idioma, l\.numero_paginas, l\.anio_publicacion, l\.formato, l\.numero_volumen, l\.dimensiones/);
    }
});

test('crear y actualizar libros guardan y pueden borrar metadatos bibliográficos', async () => {
    await libroModel.crear({
        titulo: 'Libro de prueba',
        editorial: 'Planeta',
        idioma: 'Español',
        numero_paginas: 272,
        anio_publicacion: 1994,
        formato: 'Tapa blanda',
        numero_volumen: '2',
        dimensiones: '21 x 14 cm',
        precio: 40,
        id_autor: 1,
        id_categoria: 1
    });

    assert.match(consultas[0].sql, /INSERT INTO libros \(titulo, isbn, descripcion, editorial, idioma, numero_paginas, anio_publicacion, formato, numero_volumen, dimensiones,/);
    assert.deepEqual(consultas[0].params.slice(0, 10), ['Libro de prueba', null, null, 'Planeta', 'Español', 272, 1994, 'Tapa blanda', '2', '21 x 14 cm']);

    await libroModel.actualizar(7, Object.fromEntries(CAMPOS.map((campo) => [campo, null])));
    for (const campo of CAMPOS) {
        assert.match(consultas[1].sql, new RegExp(`${campo} = \\?`));
    }
    assert.deepEqual(consultas[1].params.slice(7, 14), [null, null, null, null, null, null, null]);
});
