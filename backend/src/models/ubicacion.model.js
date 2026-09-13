const pool = require('../config/database');

// ========================================
// OBTENER PROVINCIAS DE LIMA
// ========================================
const obtenerProvincias = async () => {
    const [rows] = await pool.query(`
        SELECT
            id_provincia,
            nombre,
            orden
        FROM provincias_lima
        ORDER BY orden ASC, nombre ASC
    `);

    return rows;
};

// ========================================
// OBTENER DISTRITOS DE UNA PROVINCIA DE LIMA
// ========================================
const obtenerDistritosPorProvincia = async (id_provincia) => {
    const [rows] = await pool.query(`
        SELECT
            d.id_distrito,
            d.nombre,
            d.tarifa_envio
        FROM distritos_lima d
        WHERE d.id_provincia = ?
        ORDER BY d.nombre ASC
    `, [id_provincia]);

    return rows;
};

// ========================================
// VERIFICAR QUE UN DISTRITO EXISTE Y PERTENECE A LIMA
// ========================================
const existeDistrito = async (id_distrito) => {
    const [rows] = await pool.query(`
        SELECT
            d.id_distrito,
            d.id_provincia,
            d.tarifa_envio,
            p.nombre AS provincia
        FROM distritos_lima d
        INNER JOIN provincias_lima p
            ON d.id_provincia = p.id_provincia
        WHERE d.id_distrito = ?
        LIMIT 1
    `, [id_distrito]);

    return rows[0] || null;
};

module.exports = {
    obtenerProvincias,
    obtenerDistritosPorProvincia,
    existeDistrito
};