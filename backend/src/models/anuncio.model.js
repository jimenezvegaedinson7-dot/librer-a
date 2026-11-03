const pool = require('../config/database');

const obtenerTodos = async () => {
    const [rows] = await pool.query(
        `SELECT id_anuncio, titulo, video_url, video_public_id, poster_url, etiqueta, descripcion, boton_texto, boton_enlace, estado, created_at, updated_at FROM anuncios ORDER BY id_anuncio DESC`
    );

    return rows;
};

const obtenerActivo = async () => {
    const [rows] = await pool.query(
        `SELECT id_anuncio, titulo, video_url, poster_url, etiqueta, descripcion, boton_texto, boton_enlace FROM anuncios WHERE estado = 1 ORDER BY id_anuncio DESC LIMIT 1`
    );

    return rows[0] || null;
};

const obtenerPorId = async (id) => {
    const [rows] = await pool.query(
        `SELECT id_anuncio, titulo, video_url, video_public_id, poster_url, etiqueta, descripcion, boton_texto, boton_enlace, estado FROM anuncios WHERE id_anuncio = ?`,
        [id]
    );

    return rows[0] || null;
};

const crear = async (datos) => {
    const [result] = await pool.query(
        `INSERT INTO anuncios (titulo, video_url, video_public_id, poster_url, etiqueta, descripcion, boton_texto, boton_enlace, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            datos.titulo,
            datos.videoUrl,
            datos.videoPublicId || null,
            datos.posterUrl || null,
            datos.etiqueta || null,
            datos.descripcion || null,
            datos.botonTexto || null,
            datos.botonEnlace || null,
            datos.estado ?? 1
        ]
    );

    return obtenerPorId(result.insertId);
};

const actualizar = async (id, datos) => {
    const [result] = await pool.query(
        `UPDATE anuncios SET titulo = ?, video_url = COALESCE(?, video_url), video_public_id = ?, poster_url = ?, etiqueta = ?, descripcion = ?, boton_texto = ?, boton_enlace = ?, estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id_anuncio = ?`,
        [
            datos.titulo,
            datos.videoUrl ?? null,
            datos.videoPublicId || null,
            datos.posterUrl || null,
            datos.etiqueta || null,
            datos.descripcion || null,
            datos.botonTexto || null,
            datos.botonEnlace || null,
            datos.estado ?? 1,
            id
        ]
    );

    if (!result.affectedRows) {
        return null;
    }

    return obtenerPorId(id);
};

const eliminar = async (id) => {
    const [result] = await pool.query('DELETE FROM anuncios WHERE id_anuncio = ?', [id]);

    return result.affectedRows > 0;
};

module.exports = { obtenerTodos, obtenerActivo, obtenerPorId, crear, actualizar, eliminar };
