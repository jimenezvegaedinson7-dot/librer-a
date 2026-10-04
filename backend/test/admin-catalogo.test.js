const test = require('node:test');
const assert = require('node:assert/strict');
const ruta = require.resolve('../src/config/database');
let consultas = [];
require.cache[ruta] = { id: ruta, filename: ruta, loaded: true, exports: { query: async (sql, params) => {
    consultas.push({ sql, params }); return [sql.includes('SELECT') ? [] : { affectedRows: 1 }];
} } };
const usuario = require('../src/models/usuario.model');
const autor = require('../src/models/autor.model');
const categoria = require('../src/models/categoria.model');
test.beforeEach(() => { consultas = []; });
test('correo legacy y duplicados se buscan sin distinción de mayúsculas', async () => {
    await usuario.buscarPorEmail(' ADMIN@EXAMPLE.INVALID ');
    await usuario.existeEmail(' ADMIN@EXAMPLE.INVALID ', 71);
    for (const q of consultas) { assert.match(q.sql, /LOWER\(email\) = LOWER\(\?\)/); assert.equal(q.params[0], 'admin@example.invalid'); }
});
test('perfil normaliza correo, borra teléfono y no pisa campos omitidos', async () => {
    await usuario.actualizarPerfil(71, { email: ' ADMIN@EXAMPLE.INVALID ', telefono: null });
    assert.deepEqual(consultas[0].params, ['admin@example.invalid', null, 71]);
    assert.doesNotMatch(consultas[0].sql, /COALESCE|nombre\s*=/);
});
test('borrar biografía no reenvía nacionalidad ni nombre', async () => {
    await autor.actualizar(4, { biografia: null });
    assert.deepEqual(consultas[0].params, [null, 4]);
    assert.match(consultas[0].sql, /SET biografia = \?/);
    assert.doesNotMatch(consultas[0].sql, /COALESCE|nacionalidad\s*=/);
});
test('descripción de categoría se puede borrar explícitamente', async () => {
    await categoria.actualizar(4, { descripcion: null });
    assert.deepEqual(consultas[0].params, [null, 4]);
    assert.doesNotMatch(consultas[0].sql, /COALESCE|nombre\s*=/);
});
test('estadísticas de cuentas solo unen ventas efectivamente cobradas', async () => {
    await usuario.listarConCompras();
    assert.match(consultas[0].sql, /AND v.estado IN \('pagada', 'entregada'\)/);
});
