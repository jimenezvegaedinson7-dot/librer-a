const pool = require('../config/database');

// ========================================
// ANUNCIOS EN VIDEO DE LA WEB PÚBLICA
// Los sube el administrador desde el panel. La web pública solo
// lee el activo por GET /api/anuncios.
// ========================================

// ========================================
// OBTENER TODOS (panel)
// El más reciente primero: lo último que se sube es lo primero
// que se revisa.
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
        SELECT
            id_anuncio,
            titulo,
            video_url,
            video_public_id,
            poster_url,
            estado,
            created_at,
            updated_at
        FROM anuncios
        ORDER BY id_anuncio DESC
    `);

    return rows;
};

// ========================================
// OBTENER EL ACTIVO (web pública)
// Devuelve null si no hay ninguno visible. Solo se proyecta lo
// justo: la web no necesita el public_id ni las fechas, y el
// public_id no tiene por qué viajar al cliente.
// ========================================
const obtenerActivo = async () => {
    const [rows] = await pool.query(`
        SELECT
            id_anuncio,
            titulo,
            video_url,
            poster_url
        FROM anuncios
        WHERE estado = 1
        ORDER BY id_anuncio DESC
        LIMIT 1
    `);

    return rows[0] || null;
};

const obtenerPorId = async (id) => {
    const [rows] = await pool.query(
        `
        SELECT
            id_anuncio,
            titulo,
            video_url,
            video_public_id,
            poster_url,
            estado
        FROM anuncios
        WHERE id_anuncio = ?
    `,
        [id]
    );

    return rows[0] || null;
};

const crear = async (datos) => {
    const [result] = await pool.query(
        `
        INSERT INTO anuncios (
            titulo,
            video_url,
            video_public_id,
            poster_url,
            estado
        )
        VALUES (?, ?, ?, ?, ?)
    `,
        [
            datos.titulo,
            datos.videoUrl,
            datos.videoPublicId || null,
            datos.posterUrl || null,
            datos.estado ?? 1
        ]
    );

    return obtenerPorId(result.insertId);
};

// video_url va con COALESCE a propósito: es NOT NULL y es lo único que no
// se puede recuperar. Si un llamador actualiza solo el título y olvida la
// URL, con un "= ?" plano el UPDATE revienta por la restricción y, si la
// columna admitiera NULL, dejaba el anuncio publicado sin archivo. Así el
// valor anterior sobrevive a un guardado parcial.
const actualizar = async (id, datos) => {
    const [result] = await pool.query(
        `
        UPDATE anuncios
        SET
            titulo = ?,
            video_url = COALESCE(?, video_url),
            video_public_id = ?,
            poster_url = ?,
            estado = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_anuncio = ?
    `,
        [
            datos.titulo,
            datos.videoUrl ?? null,
            datos.videoPublicId || null,
            datos.posterUrl || null,
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
    const [result] = await pool.query(
        'DELETE FROM anuncios WHERE id_anuncio = ?',
        [id]
    );

    return result.affectedRows > 0;
};

module.exports = {
    obtenerTodos,
    obtenerActivo,
    obtenerPorId,
    crear,
    actualizar,
    eliminar
};
