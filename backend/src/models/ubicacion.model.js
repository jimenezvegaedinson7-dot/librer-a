const pool = require('../config/database');

const obtenerProvincias = async () => {
    const [rows] = await pool.query(`SELECT id_provincia, nombre, orden FROM provincias_lima ORDER BY orden ASC, nombre ASC`);

    return rows;
};

const obtenerDistritosPorProvincia = async (id_provincia) => {
    const [rows] = await pool.query(`SELECT d.id_distrito, d.nombre, d.tarifa_envio FROM distritos_lima d WHERE d.id_provincia = ? ORDER BY d.nombre ASC`, [id_provincia]);

    return rows;
};

const existeDistrito = async (id_distrito) => {
    const [rows] = await pool.query(
        `SELECT d.id_distrito, d.id_provincia, d.tarifa_envio, p.nombre AS provincia FROM distritos_lima d INNER JOIN provincias_lima p ON d.id_provincia = p.id_provincia WHERE d.id_distrito = ? LIMIT 1`,
        [id_distrito]
    );

    return rows[0] || null;
};

const esDistritoDeLima = (distrito) =>
    Boolean(distrito) &&
    String(distrito.provincia || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase() === 'lima';

const actualizarTarifaDistrito = async (id_distrito, tarifa_envio) => {
    const [rows] = await pool.query(`UPDATE distritos_lima SET tarifa_envio = ? WHERE id_distrito = ? RETURNING id_distrito, nombre, tarifa_envio`, [tarifa_envio, id_distrito]);

    return rows[0] || null;
};

module.exports = { obtenerProvincias, obtenerDistritosPorProvincia, existeDistrito, esDistritoDeLima, actualizarTarifaDistrito };
