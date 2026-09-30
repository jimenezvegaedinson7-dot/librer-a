const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// La conexión se puede definir de dos formas equivalentes:
//   1) DATABASE_URL (típico en Render/Heroku).
//   2) Las piezas DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
//
// Antes, en producción solo se aceptaba DATABASE_URL: si faltaba,
// connectionString quedaba en undefined y `pg` caía silenciosamente a
// localhost:5432, dejando el servidor sin poder conectarse a su base.
// Con el arranque fail-secure eso además impedía levantar el proceso.
// Ahora ambas formas sirven en todos los entornos, y si no hay ninguna
// se avisa de forma explícita en vez de fallar con ECONNREFUSED.
const construirConnectionString = () => {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }

    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

    if (!DB_HOST || !DB_USER || !DB_NAME) {
        if (isProduction) {
            throw new Error(
                '[DB] Falta la configuración de base de datos. Define ' +
                'DATABASE_URL o, en su defecto, DB_HOST, DB_USER y DB_NAME.'
            );
        }

        return undefined;
    }

    const credenciales = `${DB_USER}:${DB_PASSWORD ?? ''}`;

    return `postgresql://${credenciales}@${DB_HOST}:${DB_PORT || 5432}/${DB_NAME}`;
};

const connectionString = construirConnectionString();

// En producción el servidor de base de datos se espera cifrado (Render,
// Neon, Supabase, etc.), así que SSL está activo por defecto. Si se
// despliega contra un PostgreSQL propio sin TLS, se puede desactivar de
// forma explícita con DB_SSL=false en lugar de romper la conexión.
const usarSsl = isProduction
    ? process.env.DB_SSL !== 'false'
    : process.env.DB_SSL === 'true';

const pool = new Pool({
    connectionString,
    ssl: usarSsl ? { rejectUnauthorized: false } : false,
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
        claves.find((k) =>
            k === 'id' ||
            k.endsWith('_id') ||
            k.startsWith('id_')
        ) ||
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
        pgQuery: client.query.bind(client),
    };
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