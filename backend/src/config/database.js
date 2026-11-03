const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const construirConnectionString = () => {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }

    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

    if (!DB_HOST || !DB_USER || !DB_NAME) {
        if (isProduction) {
            throw new Error('[DB] Falta la configuración de base de datos. Define ' + 'DATABASE_URL o, en su defecto, DB_HOST, DB_USER y DB_NAME.');
        }

        return undefined;
    }

    const credenciales = `${DB_USER}:${DB_PASSWORD ?? ''}`;

    return `postgresql://${credenciales}@${DB_HOST}:${DB_PORT || 5432}/${DB_NAME}`;
};

const connectionString = construirConnectionString();
const usarSsl = isProduction ? process.env.DB_SSL !== 'false' : process.env.DB_SSL === 'true';
const pool = new Pool({ connectionString, ssl: usarSsl ? { rejectUnauthorized: false } : false, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });

pool.on('error', (err) => {
    console.error('[PG] Error inesperado en cliente idle', err);
});

function convertPlaceholders(sql, params = []) {
    if (!params || params.length === 0) {
        return { text: sql, values: [] };
    }
    let index = 0;
    const text = sql.replace(/\?/g, () => {
        index++;
        return `$${index}`;
    });
    return { text, values: params };
}

const prepararSql = (sql, params) => {
    const { text, values } = convertPlaceholders(sql, params);
    const esInsert = /^\s*INSERT\b/i.test(text);
    const tieneReturning = /\bRETURNING\b/i.test(text);
    const textoFinal = esInsert && !tieneReturning ? `${text.trimEnd().replace(/;$/, '')} RETURNING *` : text;
    return { text: textoFinal, values };
};

const primeraClaveId = (fila) => {
    const claves = Object.keys(fila);
    return claves.find((k) => k === 'id' || k.endsWith('_id') || k.startsWith('id_')) || claves[0];
};

const construirResultado = (ejecucion) => {
    const filas = ejecucion.rows || [];

    if (Array.isArray(filas)) {
        const primera = filas[0] || null;
        const claveId = primera ? primeraClaveId(primera) : null;
        const valorId = primera && claveId ? firstNullableN(primera[claveId]) : null;

        filas.insertId = valorId !== null && valorId !== undefined ? Number(valorId) || 0 : 0;
        filas.affectedRows = ejecucion.rowCount ?? 0;
        filas.changedRows = filas.affectedRows;
    }

    const fields = ejecucion.fields ? ejecucion.fields.map((f) => ({ name: f.name, type: f.dataTypeID })) : [];

    return [filas, fields];
};

const firstNullableN = (valor) => {
    if (valor === null || valor === undefined) {
        return null;
    }
    return Number(valor);
};

const mysql2CompatibleQuery = async (sql, params) => {
    const { text, values } = prepararSql(sql, params);
    const resultado = await pool.query(text, values);
    return construirResultado(resultado);
};

const getConnection = async () => {
    const client = await pool.connect();

    const wrappedQuery = async (sql, params) => {
        const { text, values } = prepararSql(sql, params);
        const resultado = await client.query(text, values);
        return construirResultado(resultado);
    };

    return {
        query: wrappedQuery,
        beginTransaction: async () => {
            await client.query('BEGIN');
        },
        commit: async () => {
            await client.query('COMMIT');
        },
        rollback: async () => {
            await client.query('ROLLBACK');
        },
        release: () => client.release(),
        pgQuery: client.query.bind(client)
    };
};

const mysql2CompatiblePool = {
    query: mysql2CompatibleQuery,
    getConnection,

    _pool: pool,

    end: () => pool.end(),
    on: (event, listener) => pool.on(event, listener)
};

module.exports = mysql2CompatiblePool;
