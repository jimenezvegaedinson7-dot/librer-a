const pool = require('../config/database');

// ========================================
// OBTENER TODO EL HISTORIAL
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
        SELECT
            h.id_historial,
            h.id_usuario,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            h.tipo_operacion,
            h.modulo,
            h.descripcion,
            h.fecha_registro
        FROM historial_operaciones h
        LEFT JOIN usuarios u
            ON h.id_usuario = u.id_usuario
        ORDER BY h.id_historial DESC
    `);

    return rows;
};

// ========================================
// OBTENER HISTORIAL POR USUARIO
// ========================================
const obtenerPorUsuario = async (id_usuario) => {
    const [rows] = await pool.query(`
        SELECT
            id_historial,
            id_usuario,
            tipo_operacion,
            modulo,
            descripcion,
            fecha_registro
        FROM historial_operaciones
        WHERE id_usuario = ?
        ORDER BY id_historial DESC
    `, [id_usuario]);

    return rows;
};

// ========================================
// CREAR REGISTRO DE HISTORIAL
// ========================================
const crear = async (historial) => {
    const {
        id_usuario,
        tipo_operacion,
        modulo,
        descripcion
    } = historial;

    const [resultado] = await pool.query(`
        INSERT INTO historial_operaciones
        (
            id_usuario,
            tipo_operacion,
            modulo,
            descripcion
        )
        VALUES (?, ?, ?, ?)
    `, [
        id_usuario ?? null,
        tipo_operacion,
        modulo,
        descripcion
    ]);

    return resultado.insertId;
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    obtenerTodos,
    obtenerPorUsuario,
    crear
};