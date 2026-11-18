const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/database');
const libroModel = require('../src/models/libro.model');
const inventarioModel = require('../src/models/inventario.model');
const { eliminarConInventario } = require('../src/services/libro.service');

function preparar(t, { ventas = false, fallo = false } = {}) {
    const pasos = [];
    t.mock.method(libroModel, 'tieneVentasRelacionadas', async () => ventas);
    t.mock.method(pool, 'getConnection', async () => {
        pasos.push('conexion');
        return {
            beginTransaction: async () => pasos.push('begin'),
            commit: async () => pasos.push('commit'),
            rollback: async () => pasos.push('rollback'),
            release: () => pasos.push('release')
        };
    });
    t.mock.method(inventarioModel, 'eliminarMovimientosPorLibro', async () => pasos.push('movimientos'));
    t.mock.method(inventarioModel, 'eliminarPorLibro', async () => pasos.push('inventario'));
    t.mock.method(libroModel, 'eliminar', async () => {
        pasos.push('libro');
        if (fallo) throw new Error('Restricción de base de datos');
        return 1;
    });
    return pasos;
}

test('la eliminación confirma todas las operaciones juntas y libera la conexión', async (t) => {
    const pasos = preparar(t);
    assert.equal(await eliminarConInventario(1), 1);
    assert.deepEqual(pasos, ['conexion', 'begin', 'movimientos', 'inventario', 'libro', 'commit', 'release']);
});

test('un fallo deshace la eliminación de inventario y libera la conexión', async (t) => {
    const pasos = preparar(t, { fallo: true });
    await assert.rejects(eliminarConInventario(1), /Restricción de base de datos/);
    assert.deepEqual(pasos, ['conexion', 'begin', 'movimientos', 'inventario', 'libro', 'rollback', 'release']);
});

test('un libro con ventas se rechaza sin iniciar una transacción', async (t) => {
    const pasos = preparar(t, { ventas: true });
    await assert.rejects(eliminarConInventario(1), { status: 409 });
    assert.deepEqual(pasos, []);
});
