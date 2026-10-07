const test = require('node:test');
const assert = require('node:assert/strict');
const { aplicarMigracionesDatos, MIGRACIONES_DATOS } = require('../src/config/migraciones');

// Pool falso: registra las sentencias y simula la tabla migraciones_datos.
function poolFalso({ yaAplicadas = [], filas = 3, falla = false } = {}) {
    const aplicadas = new Set(yaAplicadas);
    const log = [];
    const pool = {
        log,
        aplicadas,
        query: async (sql) => { log.push(`pool: ${sql.trim().split('\n')[0]}`); return [[]]; },
        getConnection: async () => ({
            beginTransaction: async () => log.push('BEGIN'),
            commit: async () => log.push('COMMIT'),
            rollback: async () => log.push('ROLLBACK'),
            release: () => log.push('RELEASE'),
            pgQuery: async (sql, params = []) => {
                if (/pg_advisory_xact_lock/.test(sql)) { log.push('LOCK'); return { rowCount: 1 }; }
                if (/SELECT filas FROM migraciones_datos/.test(sql)) return { rowCount: aplicadas.has(params[0]) ? 1 : 0 };
                if (/INSERT INTO migraciones_datos/.test(sql)) { aplicadas.add(params[0]); log.push(`REGISTRO ${params[0]}=${params[1]}`); return { rowCount: 1 }; }
                if (falla) throw new Error('fallo simulado');
                log.push('BACKFILL');
                return { rowCount: filas };
            },
        }),
    };
    return pool;
}
const silencio = { log() {}, error() {} };

test('la migración 041 está registrada como migración de datos', () => {
    assert.deepEqual(MIGRACIONES_DATOS, ['041_backfill_entrega_ventas_canceladas.sql']);
});

test('migración de datos: se aplica en transacción con bloqueo y registra las filas', async () => {
    const pool = poolFalso({ filas: 3 });
    const r = await aplicarMigracionesDatos(pool, { lista: ['041_x.sql'], leer: () => 'UPDATE ...', registro: silencio });
    assert.deepEqual(r, [{ nombre: '041_x.sql', aplicada: true, filas: 3 }]);
    const pasos = pool.log.filter((l) => !l.startsWith('pool:'));
    assert.deepEqual(pasos, ['BEGIN', 'LOCK', 'BACKFILL', 'REGISTRO 041_x.sql=3', 'COMMIT', 'RELEASE']);
});

test('migración de datos: si ya está registrada no vuelve a ejecutarse', async () => {
    const pool = poolFalso({ yaAplicadas: ['041_x.sql'] });
    const r = await aplicarMigracionesDatos(pool, { lista: ['041_x.sql'], leer: () => 'UPDATE ...', registro: silencio });
    assert.deepEqual(r, [{ nombre: '041_x.sql', aplicada: false, filas: 0 }]);
    assert.equal(pool.log.includes('BACKFILL'), false);
    assert.equal(pool.log.includes('ROLLBACK'), true);
});

test('migración de datos: un error deshace la transacción y no la registra', async () => {
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
        const pool = poolFalso({ falla: true });
        const r = await aplicarMigracionesDatos(pool, { lista: ['041_x.sql'], leer: () => 'UPDATE ...', registro: silencio });
        assert.equal(r[0].aplicada, false);
        assert.equal(pool.aplicadas.has('041_x.sql'), false);
        assert.equal(pool.log.includes('ROLLBACK'), true);
    } finally { process.env.NODE_ENV = anterior; }
});

test('migración de datos: en producción un error detiene el arranque', async () => {
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        await assert.rejects(
            aplicarMigracionesDatos(poolFalso({ falla: true }), { lista: ['041_x.sql'], leer: () => 'UPDATE ...', registro: silencio }),
            /falló en producción/,
        );
    } finally { process.env.NODE_ENV = anterior; }
});
