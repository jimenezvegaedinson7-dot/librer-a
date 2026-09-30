const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let escrituras = [];
const modelo = {
    obtenerPorLibro: async () => ({ stock: 3 }),
    crear: async (datos) => { escrituras.push(datos); return 1; },
    actualizar: async (_, datos) => { escrituras.push(datos); return 1; },
    actualizarStock: async (_, stock) => { escrituras.push({ stock }); return 1; }
};
for (const [nombre, exports] of Object.entries({
    inventario: modelo, historial: { crear: async () => {} }
})) {
    const id = path.resolve(__dirname, `../src/models/${nombre}.model.js`);
    require.cache[id] = { id, filename: id, loaded: true, exports };
}
const controller = require('../src/controllers/inventario.controller');
const llamar = async (accion, body) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
    await controller[accion]({ params: { id: '1' }, body, usuario: { id_usuario: 1 } }, res);
    return res;
};
test.beforeEach(() => { escrituras = []; });
const invalidos = [-1, 'abc', NaN, Infinity, -Infinity, 1.5, '', '   ', null, true, [], {}, 2147483648];
for (const campo of ['stock', 'stock_minimo']) {
    for (const valor of invalidos) {
        test(`${campo} rechaza ${String(valor)} (${typeof valor}) sin escritura`, async () => {
            const res = await llamar('actualizarInventario', { [campo]: valor });
            assert.equal(res.statusCode, 400);
            assert.equal(escrituras.length, 0);
        });
    }
    for (const valor of [0, 1, '1']) {
        test(`${campo} acepta ${JSON.stringify(valor)} y normaliza explícitamente`, async () => {
            assert.equal((await llamar('actualizarInventario', { [campo]: valor })).statusCode, 200);
            assert.equal(escrituras[0][campo], Number(valor));
        });
    }
}
for (const valor of invalidos.concat(undefined)) {
    test(`actualizarStock rechaza ${String(valor)} (${typeof valor})`, async () => {
        assert.equal((await llamar('actualizarStock', { stock: valor })).statusCode, 400);
        assert.equal(escrituras.length, 0);
    });
}
for (const campo of ['stock', 'stock_minimo']) {
    for (const valor of invalidos) {
        test(`crearInventario rechaza ${campo}=${String(valor)} antes de consultar duplicado`, async () => {
            assert.equal((await llamar('crearInventario', { id_libro: 1, [campo]: valor })).statusCode, 400);
            assert.equal(escrituras.length, 0);
        });
    }
}
