const pool = require('../config/database');

const obtener = async (idUsuario) => {
    const [rows] = await pool.query('SELECT datos FROM asistente_memoria WHERE id_usuario = ?', [idUsuario]);
    return rows[0]?.datos || null;
};

const guardar = async (idUsuario, datos) => {
    await pool.query(
        `INSERT INTO asistente_memoria (id_usuario, datos, actualizado) VALUES (?, ?::jsonb, CURRENT_TIMESTAMP) ON CONFLICT (id_usuario) DO UPDATE SET datos = EXCLUDED.datos, actualizado = CURRENT_TIMESTAMP`,
        [idUsuario, JSON.stringify(datos)]
    );
};

const borrar = async (idUsuario) => {
    await pool.query('DELETE FROM asistente_memoria WHERE id_usuario = ?', [idUsuario]);
};

module.exports = { obtener, guardar, borrar };
