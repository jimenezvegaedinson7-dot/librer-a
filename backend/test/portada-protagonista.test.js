// ============================================================
// LIBRO PROTAGONISTA DE LA PORTADA (sin BD)
// Reglas de prioridad, validaciones del guardado y permisos de las rutas.
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function cargar({ config = { id_libro_protagonista: null }, libros = {}, ultimo = null }) {
    const guardados = [];
    const rutaModelo = require.resolve('../src/models/portada.model');
    const rutaCtrl = require.resolve('../src/controllers/portada.controller');
    delete require.cache[rutaModelo];
    delete require.cache[rutaCtrl];
    const pool = {
        query: async (sql, params) => {
            if (sql.includes('FROM portada_config')) return [[config]];
            if (sql.includes('INSERT INTO portada_config')) { guardados.push(params); return [[]]; }
            if (sql.includes('FROM libros')) return [ultimo ? [{ id_libro: ultimo }] : []];
            throw new Error('consulta inesperada');
        },
    };
    const libroModel = { obtenerPorId: async (id) => libros[id] || null };
    const original = Module._load;
    Module._load = function (pedido, padre, ...resto) {
        if (pedido === '../config/database') return pool;
        if (pedido === './libro.model' || pedido === '../models/libro.model') return libroModel;
        if (pedido === '../utils/auditoria') return { registrarAuditoria: async () => {} };
        return original.call(this, pedido, padre, ...resto);
    };
    try {
        return { modelo: require(rutaModelo), ctrl: require(rutaCtrl), guardados };
    } finally { Module._load = original; }
}

const libro = (id, extra = {}) => ({ id_libro: id, titulo: `Libro ${id}`, estado: 1, portada: `/portadas/${id}.webp`, precio: '30.00', precio_final: '30.00', ...extra });

function respuesta() {
    const r = { estado: 200, cuerpo: null };
    r.status = (s) => { r.estado = s; return r; };
    r.json = (c) => { r.cuerpo = c; return r; };
    return r;
}

test('el libro manual válido tiene prioridad', async () => {
    const { modelo } = cargar({ config: { id_libro_protagonista: 3 }, libros: { 3: libro(3), 9: libro(9) }, ultimo: 9 });
    const r = await modelo.resolverProtagonista();
    assert.equal(r.modo, 'manual');
    assert.equal(r.libro.id_libro, 3);
});

test('si el manual quedó inactivo o sin portada, se usa el último agregado', async () => {
    for (const malo of [libro(3, { estado: 0 }), libro(3, { portada: '' }), null]) {
        const { modelo } = cargar({ config: { id_libro_protagonista: 3 }, libros: { 3: malo, 9: libro(9) }, ultimo: 9 });
        const r = await modelo.resolverProtagonista();
        assert.equal(r.modo, 'automatico');
        assert.equal(r.libro.id_libro, 9);
    }
});

test('sin libros elegibles no se inventa ninguno', async () => {
    const { modelo } = cargar({ ultimo: null });
    const r = await modelo.resolverProtagonista();
    assert.equal(r.modo, 'ninguno');
    assert.equal(r.libro, null);
});

test('automático sin portada o con datos incompletos no fabrica un protagonista', async () => {
    for (const extra of [{ portada: '' }, { portada: 'javascript:alert(1)' }, { precio: 0 }, { titulo: ' ' }]) {
        const { modelo } = cargar({ ultimo: 9, libros: { 9: libro(9, extra) } });
        assert.equal((await modelo.resolverProtagonista()).libro, null);
    }
});

test('panel manual incluye el candidato automático real antes de guardar el cambio de modo', async () => {
    const { ctrl } = cargar({ config: { id_libro_protagonista: 3 }, libros: { 3: libro(3), 9: libro(9) }, ultimo: 9 });
    const res = respuesta(); await ctrl.obtenerPanel({}, res);
    assert.equal(res.cuerpo.data.libro.id_libro, 3);
    assert.equal(res.cuerpo.data.libro_automatico.id_libro, 9);
});

test('la respuesta pública solo trae datos reales del libro', async () => {
    const { ctrl } = cargar({ libros: { 9: libro(9, { isbn: '123', id_autor: 4 }) }, ultimo: 9 });
    const res = respuesta();
    await ctrl.obtenerPublico({}, res);
    assert.equal(res.cuerpo.data.modo, 'automatico');
    assert.equal(res.cuerpo.data.libro.titulo, 'Libro 9');
    assert.equal(res.cuerpo.data.libro.isbn, undefined);
});

test('guardar valida el cuerpo y el libro', async () => {
    const { ctrl, guardados } = cargar({ libros: { 5: libro(5, { estado: 0 }), 6: libro(6, { portada: null }), 7: libro(7) }, ultimo: 7 });
    const req = (body) => ({ body, usuario: { id_usuario: 1 } });
    for (const [body, estado] of [[{}, 400], [{ id_libro: 'x' }, 400], [{ id_libro: 1, otro: 1 }, 400], [{ id_libro: 99 }, 404], [{ id_libro: 5 }, 400], [{ id_libro: 6 }, 400]]) {
        const res = respuesta(); await ctrl.guardar(req(body), res);
        assert.equal(res.estado, estado, JSON.stringify(body));
    }
    assert.equal(guardados.length, 0);
    let res = respuesta(); await ctrl.guardar(req({ id_libro: 7 }), res);
    assert.equal(res.estado, 200);
    res = respuesta(); await ctrl.guardar(req({ id_libro: null }), res);
    assert.equal(res.estado, 200);
    assert.deepEqual(guardados, [[7, 1], [null, 1]]);
});

test('lectura pública y escritura solo para administradores', () => {
    const router = require('../src/routes/anuncio.routes');
    const roles = (metodo, ruta) => {
        const capa = router.stack.find((c) => c.route && c.route.path === ruta && c.route.methods[metodo]);
        assert.ok(capa, `${metodo} ${ruta} existe`);
        return capa.route.stack.map((h) => h.handle).filter((h) => Array.isArray(h.rolesPermitidos)).flatMap((h) => h.rolesPermitidos);
    };
    assert.deepEqual(roles('get', '/protagonista'), []);
    assert.deepEqual(roles('get', '/protagonista/panel'), ['administrador']);
    assert.deepEqual(roles('put', '/protagonista'), ['administrador']);
    // Debe declararse antes de PUT /:id para no ser tomada como un id.
    const indice = (ruta) => router.stack.findIndex((c) => c.route && c.route.path === ruta && c.route.methods.put);
    assert.ok(indice('/protagonista') < indice('/:id'));
});
