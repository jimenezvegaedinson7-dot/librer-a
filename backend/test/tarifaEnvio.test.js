// ============================================================
// TESTS DE PUT /api/ubicaciones/distritos/:id (TARIFA DE ENVÍO)
// ============================================================
// Sin BD: se reemplazan los modelos por dobles en memoria y se
// llama directamente al controlador y al middleware de rol.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ----------------------------------------
// DOBLES DE LOS MODELOS (antes de cargar el controlador)
// ----------------------------------------
const DISTRITOS = {
    21: { id_distrito: 21, nombre: 'Miraflores', id_provincia: 1, tarifa_envio: '6.00', provincia: 'Lima' },
    99: { id_distrito: 99, nombre: 'San Vicente de Cañete', id_provincia: 5, tarifa_envio: '15.00', provincia: 'Cañete' }
};

const llamadas = { actualizar: [], historial: [] };

const modeloReal = require('../src/models/ubicacion.model');
const rutaModelo = path.resolve(__dirname, '../src/models/ubicacion.model.js');
require.cache[rutaModelo].exports = {
    ...modeloReal,
    existeDistrito: async (id) => DISTRITOS[id] || null,
    actualizarTarifaDistrito: async (id, tarifa) => {
        llamadas.actualizar.push({ id, tarifa });
        return { id_distrito: id, nombre: DISTRITOS[id].nombre, tarifa_envio: tarifa.toFixed(2) };
    }
};

const rutaHistorial = path.resolve(__dirname, '../src/models/historial.model.js');
require.cache[rutaHistorial] = {
    id: rutaHistorial,
    filename: rutaHistorial,
    loaded: true,
    exports: { crear: async (datos) => { llamadas.historial.push(datos); } }
};

const { actualizarTarifaDistrito } = require('../src/controllers/ubicacion.controller');
const verificarRol = require('../src/middlewares/rol.middleware');

// ----------------------------------------
// UTILIDADES
// ----------------------------------------
const respuesta = () => {
    const res = { statusCode: 200, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
};

const llamar = async (id, body) => {
    const res = respuesta();
    await actualizarTarifaDistrito(
        { params: { id: String(id) }, body, usuario: { id_usuario: 1, rol: 'administrador' } },
        res
    );
    return res;
};

test.beforeEach(() => {
    llamadas.actualizar.length = 0;
    llamadas.historial.length = 0;
});

// ----------------------------------------
// PERMISOS
// ----------------------------------------
test('un cliente recibe 403 al intentar modificar tarifas', () => {
    const res = respuesta();
    let siguio = false;
    verificarRol('administrador')({ usuario: { rol: 'cliente' } }, res, () => { siguio = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(siguio, false);
});

test('un administrador pasa el control de rol', () => {
    let siguio = false;
    verificarRol('administrador')({ usuario: { rol: 'administrador' } }, respuesta(), () => { siguio = true; });
    assert.equal(siguio, true);
});

// ----------------------------------------
// ACTUALIZACIÓN CORRECTA
// ----------------------------------------
test('actualiza la tarifa de un distrito de Lima', async () => {
    const res = await llamar(21, { tarifa_envio: 7.5 });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.mensaje, 'Tarifa de envío actualizada correctamente');
    assert.deepEqual(res.body.data, { id_distrito: 21, nombre: 'Miraflores', tarifa_envio: 7.5 });
    assert.deepEqual(llamadas.actualizar, [{ id: 21, tarifa: 7.5 }]);
    assert.equal(llamadas.historial.length, 1);
});

test('acepta la tarifa como texto numérico y la redondea a 2 decimales', async () => {
    const res = await llamar(21, { tarifa_envio: '8.456' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(llamadas.actualizar, [{ id: 21, tarifa: 8.46 }]);
});

test('acepta tarifa 0 (envío gratuito)', async () => {
    const res = await llamar(21, { tarifa_envio: 0 });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(llamadas.actualizar, [{ id: 21, tarifa: 0 }]);
});

// ----------------------------------------
// VALIDACIONES (nunca llegan a actualizar)
// ----------------------------------------
const casosInvalidos = [
    ['id no válido', 'abc', { tarifa_envio: 5 }, 400],
    ['tarifa negativa', 21, { tarifa_envio: -1 }, 400],
    ['tarifa no numérica', 21, { tarifa_envio: 'diez' }, 400],
    ['tarifa vacía', 21, { tarifa_envio: '' }, 400],
    ['sin tarifa', 21, {}, 400],
    ['tarifa booleana', 21, { tarifa_envio: true }, 400],
    ['intenta cambiar el nombre', 21, { tarifa_envio: 5, nombre: 'Otro' }, 400],
    ['intenta cambiar la provincia', 21, { tarifa_envio: 5, id_provincia: 5 }, 400],
    ['distrito inexistente', 12345, { tarifa_envio: 5 }, 404],
    ['distrito fuera de Lima', 99, { tarifa_envio: 5 }, 400]
];

for (const [nombre, id, body, estado] of casosInvalidos) {
    test(`rechaza: ${nombre} (${estado})`, async () => {
        const res = await llamar(id, body);
        assert.equal(res.statusCode, estado);
        assert.equal(res.body.success, false);
        assert.equal(llamadas.actualizar.length, 0);
        assert.equal(llamadas.historial.length, 0);
    });
}

// ----------------------------------------
// ¿DISTRITO DE LIMA?
// ----------------------------------------
test('esDistritoDeLima solo acepta la provincia de Lima', () => {
    const { esDistritoDeLima } = modeloReal;
    assert.equal(esDistritoDeLima({ provincia: 'Lima' }), true);
    assert.equal(esDistritoDeLima({ provincia: ' LIMA ' }), true);
    assert.equal(esDistritoDeLima({ provincia: 'Cañete' }), false);
    assert.equal(esDistritoDeLima({ provincia: 'Huarochirí' }), false);
    assert.equal(esDistritoDeLima(null), false);
});
