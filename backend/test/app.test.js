const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'app-http-fixture-not-for-production';
let consultas = [];
let iniciosJobs = 0;
let fallaMigracion = false;
const database = require.resolve('../src/config/database');
require.cache[database] = {
    id: database,
    filename: database,
    loaded: true,
    exports: {
        query: async (sql, values = []) => {
            consultas.push(sql);
            if (sql === 'SELECT 1 AS resultado') return [[{ resultado: 1 }]];
            if (sql.includes('FROM usuarios WHERE id_usuario')) {
                return [[{ id_usuario: values[0], estado: 1, rol: Number(values[0]) === 1 ? 'administrador' : 'cliente', sesion_version: 0 }]];
            }
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    }
};
const migraciones = require.resolve('../src/config/migraciones');
require.cache[migraciones] = {
    id: migraciones,
    filename: migraciones,
    loaded: true,
    exports: {
        aplicarMigraciones: async () => {
            if (fallaMigracion) throw new Error('Migración rechazada por la prueba');
        },
        aplicarMigracionesDatos: async () => {}
    }
};
const jobs = require.resolve('../src/jobs/limpieza');
require.cache[jobs] = {
    id: jobs,
    filename: jobs,
    loaded: true,
    exports: { iniciarJobs: () => { iniciosJobs++; return () => {}; } }
};

const { crearApp } = require('../src/app/app');
const { iniciar } = require('../src/app/iniciar');
let servidor;
let base;
const token = (id) => ({ Authorization: `Bearer ${jwt.sign({ id_usuario: id, sesion_version: 0 }, process.env.JWT_SECRET)}` });
const cerrar = (http) => new Promise((resolve, reject) => http.close((error) => error ? reject(error) : resolve()));

test.before(async () => {
    servidor = await new Promise((resolve) => {
        const http = crearApp().listen(0, () => resolve(http));
    });
    base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => cerrar(servidor));
test.beforeEach(() => { consultas = []; iniciosJobs = 0; });

test('componer Express no consulta la base ni inicia tareas programadas', () => {
    assert.notEqual(crearApp(), crearApp());
    assert.deepEqual(consultas, []);
    assert.equal(iniciosJobs, 0);
});

test('salud pública conserva sus respuestas sin consultar PostgreSQL', async () => {
    assert.deepEqual(await (await fetch(`${base}/`)).json(), { mensaje: 'Servidor de MATIDANA funcionando' });
    assert.deepEqual(await (await fetch(`${base}/api`)).json(), {
        mensaje: 'API de MATIDANA funcionando correctamente',
        capacidades: { descuentos_libros: true, anuncios_video: true, libros_nuevos: true }
    });
    assert.deepEqual(consultas, []);
});

test('diagnóstico de base: exige sesión y administrador antes de ejecutar SELECT 1', async () => {
    assert.equal((await fetch(`${base}/api/test-db`)).status, 401);
    assert.equal((await fetch(`${base}/api/test-db`, { headers: token(2) })).status, 403);
    assert.equal(consultas.includes('SELECT 1 AS resultado'), false);
    const respuesta = await fetch(`${base}/api/test-db`, { headers: token(1) });
    assert.equal(respuesta.status, 200);
    assert.deepEqual(await respuesta.json(), { mensaje: 'Conexión con PostgreSQL exitosa', resultado: 1 });
});

test('el montaje conserva las rutas retiradas y el 404 JSON', async () => {
    assert.equal((await fetch(`${base}/api/reservas`, { headers: token(2) })).status, 410);
    assert.equal((await fetch(`${base}/api/ventas`, { method: 'POST', headers: token(2) })).status, 405);
    const desconocida = await fetch(`${base}/api/no-existe`);
    assert.equal(desconocida.status, 404);
    assert.deepEqual(await desconocida.json(), { success: false, mensaje: 'Ruta no encontrada' });
});

test('un fallo de migración rechaza el arranque antes de abrir puerto o iniciar jobs', async () => {
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    fallaMigracion = true;
    try {
        await assert.rejects(iniciar({ puerto: 0 }), /Migración rechazada/);
        assert.equal(iniciosJobs, 0);
    } finally {
        fallaMigracion = false;
        if (anterior === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = anterior;
    }
});

test('un puerto ocupado rechaza el arranque sin dejar jobs activos', async () => {
    await assert.rejects(iniciar({ puerto: servidor.address().port }), { code: 'EADDRINUSE' });
    assert.equal(iniciosJobs, 0);
});

test('el arranque devuelve el servidor y el control de sus tareas', async () => {
    const resultado = await iniciar({ puerto: 0 });
    try {
        assert.equal(iniciosJobs, 1);
        assert.equal(typeof resultado.detenerJobs, 'function');
        assert.equal((await fetch(`http://127.0.0.1:${resultado.servidor.address().port}/api`)).status, 200);
    } finally {
        resultado.detenerJobs();
        await cerrar(resultado.servidor);
    }
});
