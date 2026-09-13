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
 * Wrapper que devuelve [rows, fields] compatible con mysql2
 */
const mysql2CompatibleQuery = async (sql, params) => {
    const { text, values } = convertPlaceholders(sql, params);
    const result = await pool.query(text, values);
    // mysql2 devuelve [rows, fields] donde fields contiene metadatos de columnas
    const fields = result.fields ? result.fields.map(f => ({ name: f.name, type: f.dataTypeID })) : [];
    return [result.rows, fields];
};

/**
 * Obtener cliente para transacciones con query compatible
 */
const getConnection = async () => {
    const client = await pool.connect();
    
    const originalQuery = client.query.bind(client);
    client.query = async (sql, params) => {
        const { text, values } = convertPlaceholders(sql, params);
        const result = await originalQuery(text, values);
        const fields = result.fields ? result.fields.map(f => ({ name: f.name, type: f.dataTypeID })) : [];
        return [result.rows, fields];
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