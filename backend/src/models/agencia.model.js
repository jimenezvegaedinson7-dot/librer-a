const pool = require('../config/database');

const obtenerActivas = async () => {
    const [rows] = await pool.query(`SELECT id_agencia, nombre, tarifa_base, descripcion, estado FROM agencias_courier WHERE estado = 1 ORDER BY nombre ASC`);

    return rows;
};

const obtenerPorId = async (id_agencia) => {
    const [rows] = await pool.query(`SELECT id_agencia, nombre, tarifa_base, descripcion, estado FROM agencias_courier WHERE id_agencia = ? LIMIT 1`, [id_agencia]);

    return rows[0] || null;
};

const obtenerTodas = async () => {
    const [rows] = await pool.query(`SELECT id_agencia, nombre, tarifa_base, descripcion, estado FROM agencias_courier ORDER BY id_agencia DESC`);

    return rows;
};

const crear = async (agencia) => {
    const { nombre, tarifa_base, descripcion, estado } = agencia;

    const [resultado] = await pool.query(`INSERT INTO agencias_courier (nombre, tarifa_base, descripcion, estado) VALUES (?, ?, ?, ?)`, [
        nombre,
        tarifa_base ?? 0,
        descripcion ?? null,
        estado ?? 1
    ]);

    return resultado.insertId;
};

const actualizar = async (id_agencia, agencia) => {
    const { nombre, tarifa_base, descripcion, estado } = agencia;

    let descripcionSet = 'descripcion = COALESCE(?, descripcion)';
    let descripcionValor = null;

    if (descripcion !== undefined) {
        const texto = descripcion === null ? '' : String(descripcion).trim();

        descripcionSet = 'descripcion = ?';
        descripcionValor = texto === '' ? null : texto;
    }

    const [resultado] = await pool.query(
        `UPDATE agencias_courier SET nombre = COALESCE(?, nombre), tarifa_base = COALESCE(?, tarifa_base), ${descripcionSet}, estado = COALESCE(?, estado) WHERE id_agencia = ?`,
        [nombre ?? null, tarifa_base ?? null, descripcionValor, estado ?? null, id_agencia]
    );

    return resultado.affectedRows;
};

module.exports = { obtenerActivas, obtenerPorId, obtenerTodas, crear, actualizar };
