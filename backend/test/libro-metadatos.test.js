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
const {
    construirActualizacionesDragonBallZ,
    backfillMetadatosDragonBallZ,
    construirActualizacionesReales,
    backfillMetadatosRealesTodos
} = require('../src/config/backfills');

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

test('el backfill de Dragon Ball Z aplica solo los datos verificados con COALESCE', async () => {
    const esperado = [
        {
            isbn: '9788416308057',
            editorial: 'Planeta',
            idioma: 'Español',
            numero_paginas: 176,
            anio_publicacion: 2015,
            formato: 'Tapa blanda',
            numero_volumen: '1',
            dimensiones: '11.1 x 17.7 cm'
        },
        {
            isbn: '9788416308071',
            editorial: 'Planeta',
            idioma: 'Español',
            numero_paginas: 176,
            anio_publicacion: 2015,
            formato: 'Tapa blanda',
            numero_volumen: '2',
            dimensiones: '11.1 x 17.7 cm'
        },
        {
            isbn: '9788416308972',
            editorial: 'Planeta',
            idioma: 'Español',
            numero_paginas: 176,
            anio_publicacion: 2015,
            formato: 'Tapa blanda',
            numero_volumen: '3',
            dimensiones: '11.1 x 17.7 cm'
        }
    ];
    assert.deepEqual(construirActualizacionesDragonBallZ(), esperado);

    const sentencias = [];
    const conexion = {
        pgQuery: async (sql, params) => {
            sentencias.push({ sql, params });
            return { rowCount: 1 };
        }
    };

    const resultado = await backfillMetadatosDragonBallZ.ejecutar(conexion);
    assert.equal(backfillMetadatosDragonBallZ.nombre, '047_backfill_dragon_ball_z.js');
    assert.deepEqual(resultado, { rowCount: 3 });
    assert.equal(sentencias.length, 3);
    for (const sentencia of sentencias) {
        assert.match(sentencia.sql, /^UPDATE libros SET .+ WHERE isbn = \$1$/);
        assert.match(sentencia.sql, /COALESCE\(/);
        assert.equal(sentencia.params.length, 8);
    }
    assert.deepEqual(sentencias.map((sentencia) => sentencia.params[0]), esperado.map((libro) => libro.isbn));
});

test('el backfill global aplica solo metadatos verificados y nunca sobrescribe', async () => {
    const actualizaciones = construirActualizacionesReales();
    assert.ok(actualizaciones.length > 2000);

    const porIsbn = new Map(actualizaciones.map((libro) => [libro.isbn, libro]));
    assert.deepEqual(porIsbn.get('9781400077915'), {
        isbn: '9781400077915',
        editorial: 'Vintage',
        idioma: 'Inglés',
        numero_paginas: 352,
        anio_publicacion: 2005,
        formato: 'Tapa blanda',
        numero_volumen: null,
        dimensiones: '5-3/16 x 8 in'
    });
    assert.equal(porIsbn.get('9798711770145').editorial, 'Independently Published');
    assert.equal(porIsbn.get('9788413341385').idioma, 'Español');
    assert.ok(!porIsbn.has('9786124000010'));
    assert.ok(!porIsbn.has('9786124000249'));

    const sentencias = [];
    const conexion = {
        pgQuery: async (sql, params) => {
            sentencias.push({ sql, params });
            return { rowCount: 1 };
        }
    };

    const resultado = await backfillMetadatosRealesTodos.ejecutar(conexion);
    assert.equal(backfillMetadatosRealesTodos.nombre, '048_backfill_metadatos_reales_todos.js');
    assert.deepEqual(resultado, { rowCount: actualizaciones.length });
    assert.equal(sentencias.length, actualizaciones.length);
    for (const sentencia of sentencias) {
        assert.match(sentencia.sql, /^UPDATE libros SET .+ WHERE isbn = \$1$/);
        assert.match(sentencia.sql, /COALESCE\(/);
        assert.ok(sentencia.params.length >= 2 && sentencia.params.length <= 8);
    }
    assert.deepEqual(sentencias.map((sentencia) => sentencia.params[0]), actualizaciones.map((libro) => libro.isbn));
});
