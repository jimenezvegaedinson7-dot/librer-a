const test = require('node:test');
const assert = require('node:assert/strict');

const RUTA_MODELO = require.resolve('../src/models/usuario.model');
const doble = { usuario: null, escrituras: [] };

require.cache[RUTA_MODELO] = {
    id: RUTA_MODELO,
    filename: RUTA_MODELO,
    loaded: true,
    exports: {
        buscarPorId: async () => doble.usuario,
        actualizarEstadoRol: async (id, cambios) => {
            doble.escrituras.push({ id, cambios });
            return doble.usuario;
        }
    }
};

const { adminUpdateUsuario } = require('../src/controllers/usuario.controller');

const respuestaFalsa = () => ({
    statusCode: null,
    cuerpo: null,
    status(codigo) {
        this.statusCode = codigo;
        return this;
    },
    json(cuerpo) {
        this.cuerpo = cuerpo;
        return this;
    }
});

const ejecutar = async (body) => {
    doble.escrituras = [];

    const req = { params: { id: '7' }, body, usuario: { id_usuario: 1, rol: 'administrador' } };

    const res = respuestaFalsa();

    await adminUpdateUsuario(req, res, () => {});

    return res;
};

const cuentaEliminada = () => {
    doble.usuario = {
        id_usuario: 7,
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@example.com',
        rol: 'cliente',
        estado: 0,
        fecha_registro: '2024-01-01 00:00:00',
        fecha_eliminacion: '2025-03-04 10:00:00'
    };
};

const cuentaActiva = () => {
    doble.usuario = {
        id_usuario: 7,
        nombre: 'Luis',
        apellido: 'Soto',
        email: 'luis@example.com',
        rol: 'cliente',
        estado: 1,
        fecha_registro: '2024-01-01 00:00:00',
        fecha_eliminacion: null
    };
};

test('una cuenta eliminada no se reactiva cambiando su estado', async () => {
    cuentaEliminada();

    const res = await ejecutar({ estado: 1 });

    assert.equal(res.statusCode, 403);
    assert.equal(res.cuerpo.success, false);
    assert.match(res.cuerpo.mensaje, /no se puede reactivar/i);
    assert.deepEqual(doble.escrituras, []);
});

test('una cuenta eliminada no puede convertirse en cajero', async () => {
    cuentaEliminada();

    const res = await ejecutar({ rol: 'cajero' });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(doble.escrituras, []);
});

test('una cuenta eliminada no puede convertirse en administrador', async () => {
    cuentaEliminada();

    const res = await ejecutar({ rol: 'administrador' });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(doble.escrituras, []);
});

test('una cuenta eliminada tampoco puede volver a cliente ni a ningún otro rol', async () => {
    cuentaEliminada();

    for (const rol of ['cliente', 'cajero', 'administrador', 'vendedor']) {
        const res = await ejecutar({ rol });

        assert.equal(res.statusCode, 403, `no debería aceptar el rol ${rol}`);
        assert.deepEqual(doble.escrituras, []);
    }
});

test('una cuenta eliminada no se reactiva aunque mande estado y rol juntos', async () => {
    cuentaEliminada();

    const res = await ejecutar({ estado: 1, rol: 'administrador' });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(doble.escrituras, []);
});

test('el bloqueo es por cuenta eliminada, no por el rol pedido', async () => {
    cuentaActiva();

    const res = await ejecutar({ rol: 'administrador' });

    assert.equal(res.statusCode, null);
    assert.equal(res.cuerpo.success, true);
    assert.equal(doble.escrituras.length, 1);
    assert.equal(doble.escrituras[0].cambios.rol, 'administrador');
});

test('una cuenta viva sí puede desactivarse', async () => {
    cuentaActiva();

    const res = await ejecutar({ estado: 0 });

    assert.equal(res.cuerpo.success, true);
    assert.equal(doble.escrituras[0].cambios.estado, 0);
});

test('el mensaje de bloqueo explica el motivo', async () => {
    cuentaEliminada();

    const res = await ejecutar({ rol: 'cajero' });

    assert.equal(res.cuerpo.mensaje, 'Esta cuenta fue eliminada por su titular: no se puede reactivar ni cambiar de rol');
});
