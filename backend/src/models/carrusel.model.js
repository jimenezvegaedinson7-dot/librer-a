const pool = require('../config/database');

async function listar(publico = false) {
    const [filas] = await pool.query(
        publico
            ? `SELECT c.id_imagen,c.titulo,c.imagen_url,c.orden, CASE WHEN l.estado=1 THEN c.id_libro ELSE NULL END AS id_libro FROM carrusel_anuncios c LEFT JOIN libros l ON l.id_libro=c.id_libro WHERE c.estado=1 ORDER BY c.orden,c.id_imagen`
            : 'SELECT * FROM carrusel_anuncios ORDER BY orden,id_imagen'
    );
    return filas;
}

async function obtener(id) {
    const [filas] = await pool.query('SELECT * FROM carrusel_anuncios WHERE id_imagen=?', [id]);
    return filas[0] || null;
}

async function crear(datos) {
    const [filas] = await pool.query(`INSERT INTO carrusel_anuncios(titulo,imagen_url,imagen_public_id,id_libro,orden,estado) VALUES (?,?,?,?,?,?) RETURNING *`, [
        datos.titulo,
        datos.imagen_url,
        datos.imagen_public_id,
        datos.id_libro ?? null,
        datos.orden ?? 0,
        datos.estado ?? 1
    ]);
    return filas[0];
}

async function actualizar(id, datos) {
    const [filas] = await pool.query(
        `WITH previa AS (SELECT * FROM carrusel_anuncios WHERE id_imagen=? FOR UPDATE), cambiada AS (UPDATE carrusel_anuncios c SET titulo=COALESCE(?,c.titulo), imagen_url=COALESCE(?,c.imagen_url),imagen_public_id=CASE WHEN ?::boolean THEN ? ELSE c.imagen_public_id END, id_libro=CASE WHEN ?::boolean THEN ? ELSE c.id_libro END, orden=COALESCE(?::int,c.orden),estado=COALESCE(?::smallint,c.estado),actualizado_en=CURRENT_TIMESTAMP FROM previa p WHERE c.id_imagen=p.id_imagen RETURNING c.*,p.imagen_url AS url_anterior,p.imagen_public_id AS public_id_anterior) SELECT * FROM cambiada`,
        [
            id,
            datos.titulo ?? null,
            datos.imagen_url ?? null,
            Boolean(datos.imagen_url),
            datos.imagen_public_id ?? null,
            Object.hasOwn(datos, 'id_libro'),
            datos.id_libro ?? null,
            datos.orden ?? null,
            datos.estado ?? null
        ]
    );
    if (!filas[0]) return null;
    const { url_anterior, public_id_anterior, ...actual } = filas[0];
    return { actual, anterior: { imagen_url: url_anterior, imagen_public_id: public_id_anterior } };
}

async function eliminar(id) {
    const [filas] = await pool.query('DELETE FROM carrusel_anuncios WHERE id_imagen=? RETURNING *', [id]);
    return filas[0] || null;
}

async function reordenar(ids) {
    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        await conexion.query('LOCK TABLE carrusel_anuncios IN SHARE ROW EXCLUSIVE MODE');
        const [filas] = await conexion.query('SELECT id_imagen FROM carrusel_anuncios ORDER BY id_imagen');
        if (filas.length !== ids.length || filas.some((imagen) => !ids.includes(imagen.id_imagen))) {
            throw new Error('lista_desactualizada');
        }
        for (let indice = 0; indice < ids.length; indice++) {
            await conexion.query('UPDATE carrusel_anuncios SET orden=?,actualizado_en=CURRENT_TIMESTAMP WHERE id_imagen=?', [indice + 1, ids[indice]]);
        }
        await conexion.commit();
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, reordenar };
