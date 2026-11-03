const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/database');
const modelo = require('../src/models/comprobante.model');
const controlador = require('../src/controllers/comprobante.controller');

function respuesta() {
    return {
        codigo: 200,
        cuerpo: null,
        status(codigo) {
            this.codigo = codigo;
            return this;
        },
        json(cuerpo) {
            this.cuerpo = cuerpo;
            return this;
        }
    };
}

test('listado por venta aplica el mismo filtro parametrizado a conteo y filas', async (t) => {
    const consultas = [];
    t.mock.method(pool, 'query', async (sql, parametros) => {
        consultas.push({ sql, parametros });
        return sql.includes('COUNT(*)') ? [[{ total: 1 }]] : [[{ id_comprobante: 7, id_venta: 51, total: 100 }]];
    });
    const resultado = await modelo.listarComprobantes({ idVenta: 51, tipo: 'boleta', porPagina: 10 });
    assert.equal(resultado.total, 1);
    assert.equal(resultado.comprobantes[0].id_venta, 51);
    assert.equal(consultas.length, 2);
    for (const consulta of consultas) {
        assert.match(consulta.sql, /c\.id_venta = \?/);
        assert.deepEqual(consulta.parametros.slice(0, 2), [51, 'boleta']);
    }
});

test('el controlador confirma qué venta filtró sin alterar el listado general', async (t) => {
    const filtros = [];
    t.mock.method(modelo, 'listarComprobantes', async (opciones) => {
        filtros.push(opciones);
        return { comprobantes: [], total: 0, paginas: 0 };
    });
    const filtrada = respuesta();
    await controlador.listarComprobantes({ query: { id_venta: '51' } }, filtrada);
    assert.equal(filtrada.codigo, 200);
    assert.equal(filtrada.cuerpo.filtro_venta, 51);
    assert.equal(filtros[0].idVenta, 51);
    const general = respuesta();
    await controlador.listarComprobantes({ query: {} }, general);
    assert.equal(general.cuerpo.filtro_venta, null);
    assert.equal(filtros[1].idVenta, undefined);
});

test('un filtro inválido no se convierte en listado de todos los comprobantes', async (t) => {
    const consulta = t.mock.method(modelo, 'listarComprobantes', async () => {
        throw new Error('No debe consultar');
    });
    for (const valor of ['0', '-1', '51x', '51 OR 1=1', ['51', '52'], {}]) {
        const res = respuesta();
        await controlador.listarComprobantes({ query: { id_venta: valor } }, res);
        assert.equal(res.codigo, 400);
        assert.equal(res.cuerpo.mensaje, 'ID de venta inválido');
    }
    assert.equal(consulta.mock.callCount(), 0);
});
