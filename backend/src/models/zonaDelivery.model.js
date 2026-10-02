const pool = require('../config/database');

const listar = async (soloActivas = true) => {
    const [rows] = await pool.query(`
        SELECT id_zona, nombre, tarifa, estado FROM zonas_delivery_pallasca
        ${soloActivas ? 'WHERE estado = 1' : ''}
        ORDER BY nombre ASC
    `);
    return rows;
};

// El checkout toma el bloqueo dentro de su transacción: ni tarifa ni estado
// pueden cambiar entre la validación y el guardado definitivo de la venta.
const obtenerPorId = async (id, connection = pool, bloquear = false) => {
    const [rows] = await connection.query(`
        SELECT id_zona, nombre, tarifa, estado FROM zonas_delivery_pallasca
        WHERE id_zona = ? ${bloquear ? 'FOR SHARE' : ''}
    `, [id]);
    return rows[0] || null;
};

const crear = async ({ nombre, tarifa, estado }) => {
    const [rows] = await pool.query(`
        INSERT INTO zonas_delivery_pallasca(nombre, tarifa, estado)
        VALUES (?, ?, ?) RETURNING id_zona, nombre, tarifa, estado
    `, [nombre, tarifa, estado]);
    return rows[0];
};

const actualizar = async (id, { nombre, tarifa, estado }) => {
    const [rows] = await pool.query(`
        UPDATE zonas_delivery_pallasca SET nombre = ?, tarifa = ?, estado = ?
        WHERE id_zona = ? RETURNING id_zona, nombre, tarifa, estado
    `, [nombre, tarifa, estado, id]);
    return rows[0] || null;
};

module.exports = { listar, obtenerPorId, crear, actualizar };
