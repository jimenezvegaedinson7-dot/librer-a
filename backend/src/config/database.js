const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || (isProduction
        ? process.env.DATABASE_URL
        : `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`),
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[PG] Error inesperado en cliente idle', err);
});

/**
 * Convierte placeholders estilo MySQL (?) a estilo PostgreSQL ($1, $2, ...)
 */
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

/**
 * Para INSERT sin RETURNING, PostgreSQL necesita RETURNING para devolver
 * la fila insertada (mysql2 devuelve insertId automáticamente).
 */
const prepararSql = (sql, params) => {
    const { text, values } = convertPlaceholders(sql, params);
    const esInsert = /^\s*INSERT\b/i.test(text);
    const tieneReturning = /\bRETURNING\b/i.test(text);
    const textoFinal = (esInsert && !tieneReturning)
        ? `${text} RETURNING *`
        : text;
    return { text: textoFinal, values };
};

/**
 * Primera columna candidata a ser la llave primaria de una fila.
 */
const primeraClaveId = (fila) => {
    const claves = Object.keys(fila);
    return (
        claves.find((k) => k === 'id' || k.endsWith('_id')) ||
        claves[0]
    );
};

/**
 * Construye el arreglo [rows, fields] compatible con mysql2 y
 * adjunta sobre `rows` las propiedades insertId / affectedRows / changedRows.
 */
const construirResultado = (ejecucion) => {
    const filas = ejecucion.rows || [];

    if (Array.isArray(filas)) {
        const primera = filas[0] || null;
        const claveId = primera
            ? primeraClaveId(primera)
            : null;
        const valorId = primera && claveId
            ? firstNullableN(primera[claveId])
            : null;

        filas.insertId =
            valorId !== null && valorId !== undefined
                ? Number(valorId) || 0
                : 0;
        filas.affectedRows = ejecucion.rowCount ?? 0;
        filas.changedRows = filas.affectedRows;
    }

    const fields = ejecucion.fields
        ? ejecucion.fields.map((f) => ({
            name: f.name,
            type: f.dataTypeID
        }))
        : [];

    return [filas, fields];
};

const firstNullableN = (valor) => {
    if (valor === null || valor === undefined) {
        return null;
    }
    return Number(valor);
};

/**
 * Wrapper que devuelve [rows, fields] compatible con mysql2
 */
const mysql2CompatibleQuery = async (sql, params) => {
    const { text, values } = prepararSql(sql, params);
    const resultado = await pool.query(text, values);
    return construirResultado(resultado);
};

/**
 * Obtener cliente para transacciones con query compatible
 */
const getConnection = async () => {
    const client = await pool.connect();

    const originalQuery = client.query.bind(client);
    client.query = async (sql, params) => {
        const { text, values } = prepararSql(sql, params);
        const resultado = await originalQuery(text, values);
        return construirResultado(resultado);
    };

    // También mantener el método original para casos que lo necesiten
    client.pgQuery = originalQuery;

    return client;
};

// Exportar objeto compatible con mysql2 pool
const mysql2CompatiblePool = {
    query: mysql2CompatibleQuery,
    getConnection,
    // Exponer pool original para casos avanzados
    _pool: pool,
    // Métodos de ciclo de vida
    end: () => pool.end(),
    on: (event, listener) => pool.on(event, listener)
};

module.exports = mysql2CompatiblePool;