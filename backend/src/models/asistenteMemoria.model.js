const pool = require('../config/database');

// ========================================
// MEMORIA DEL ASISTENTE POR CLIENTE
// Preferencias que el asistente aprende (apodo, autores y categorías que
// más busca, libros vistos). Un registro por usuario; se borra con la cuenta.
// ========================================
const obtener = async (idUsuario) => {
    const [rows] = await pool.query(
        'SELECT datos FROM asistente_memoria WHERE id_usuario = ?',
        [idUsuario]
    );
    return rows[0]?.datos || null;
};

const guardar = async (idUsuario, datos) => {
    await pool.query(`
        INSERT INTO asistente_memoria (id_usuario, datos, actualizado)
        VALUES (?, ?::jsonb, CURRENT_TIMESTAMP)
        ON CONFLICT (id_usuario) DO UPDATE
        SET datos = EXCLUDED.datos, actualizado = CURRENT_TIMESTAMP
    `, [idUsuario, JSON.stringify(datos)]);
};

const borrar = async (idUsuario) => {
    await pool.query('DELETE FROM asistente_memoria WHERE id_usuario = ?', [idUsuario]);
};

module.exports = { obtener, guardar, borrar };
