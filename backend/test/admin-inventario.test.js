const test = require('node:test');
const assert = require('node:assert/strict');
const ruta = require.resolve('../src/config/database');
let stock, consultas, eventos;
const connection = {
    beginTransaction: async () => eventos.push('begin'),
    commit: async () => eventos.push('commit'),
    rollback: async () => eventos.push('rollback'),
    release: () => eventos.push('release'),
    query: async (sql, params = []) => {
        consultas.push({ sql, params });
        if (sql.includes('SELECT stock')) return [[{ stock }]];
        return [{ affectedRows: 1, insertId: 1 }];
    },
};
require.cache[ruta] = { id: ruta, filename: ruta, loaded: true, exports: { getConnection: async () => connection } };
const model = require('../src/models/inventario.model');
test.beforeEach(() => { stock = 9; consultas = []; eventos = []; });
test('editar ubicación no escribe stock ni genera una entrada ficticia', async () => {
    await model.actualizar(4, { ubicacion: 'B', id_usuario: 71 });
    const update = consultas.find(c => c.sql.includes('UPDATE inventario'));
    assert.match(update.sql, /SET ubicacion = \?/);
    assert.doesNotMatch(update.sql, /stock\s*=/);
    assert.equal(consultas.some(c => c.sql.includes('movimientos_inventario')), false);
    assert.deepEqual(eventos, ['begin', 'commit', 'release']);
});
test('ajuste con stock obsoleto produce conflicto y rollback antes de escribir', async () => {
    await assert.rejects(model.actualizar(4, { stock: 11, stock_esperado: 10 }), e => e.status === 409);
    assert.equal(consultas.length, 1);
    assert.deepEqual(eventos, ['begin', 'rollback', 'release']);
});
test('ajuste vigente registra delta y administrador en la misma transacción', async () => {
    await model.actualizar(4, { stock: 11, stock_esperado: 9, id_usuario: 71 });
    const movimiento = consultas.find(c => c.sql.includes('INSERT INTO movimientos_inventario'));
    assert.deepEqual(movimiento.params, [4, 71, 'entrada', 'ajuste_manual', 2, 11]);
    assert.ok(eventos.includes('commit'));
});
test('ubicación null es borrado explícito, no COALESCE', async () => {
    await model.actualizar(4, { ubicacion: null });
    const update = consultas.find(c => c.sql.includes('UPDATE inventario'));
    assert.deepEqual(update.params, [null, 4]);
    assert.doesNotMatch(update.sql, /COALESCE/);
});
