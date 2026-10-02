const pool = require('../config/database');
const { PRECIO_FINAL_SQL, CAMPOS_DESCUENTO } = require('./libro.model');

// ========================================
// AGREGAR FAVORITO
// (idempotente: si ya existe, no hace nada)
// ========================================
const agregar = async (idUsuario, idLibro) => {
    const [resultado] = await pool.query(`
        INSERT INTO favoritos
        (
            id_usuario,
            id_libro
        )
        VALUES (?, ?)
        ON CONFLICT (id_usuario, id_libro) DO NOTHING
    `, [idUsuario, idLibro]);

    return resultado.affectedRows;
};

// ========================================
// QUITAR FAVORITO
// ========================================
const quitar = async (idUsuario, idLibro) => {
    const [resultado] = await pool.query(`
        DELETE FROM favoritos
        WHERE id_usuario = ? AND id_libro = ?
    `, [idUsuario, idLibro]);

    return resultado.affectedRows;
};

// ========================================
// ¿EL LIBRO ES FAVORITO DEL USUARIO?
// ========================================
const esFavorito = async (idUsuario, idLibro) => {
    const [rows] = await pool.query(`
        SELECT 1 AS existe
        FROM favoritos
        WHERE id_usuario = ? AND id_libro = ?
        LIMIT 1
    `, [idUsuario, idLibro]);

    return rows.length > 0;
};

// ========================================
// LISTAR FAVORITOS DEL USUARIO
// (misma forma que libroModel.obtenerTodos
// para que la app parsee con Libro.fromJson)
// ========================================
const listar = async (idUsuario) => {
    const [rows] = await pool.query(`
        SELECT base.*, ${CAMPOS_DESCUENTO} FROM (
        SELECT
            l.id_libro,
            l.titulo,
            l.isbn,
            l.descripcion,
            l.precio,

            COALESCE(
                i.stock,
                l.stock,
                0
            ) AS stock,

            l.portada,
            l.id_autor,

            CONCAT(
                a.nombre,
                ' ',
                a.apellido
            ) AS autor,

            l.id_categoria,
            c.nombre AS categoria,
            l.estado,
            l.creado_en,
            l.descuento_porcentaje,
            l.precio_oferta,
            TO_CHAR(l.descuento_hasta, 'YYYY-MM-DD') AS descuento_hasta,
            ${PRECIO_FINAL_SQL},
            f.fecha AS favorito_fecha

        FROM favoritos f

        INNER JOIN libros l
            ON f.id_libro = l.id_libro

        INNER JOIN autores a
            ON l.id_autor = a.id_autor

        INNER JOIN categorias c
            ON l.id_categoria = c.id_categoria

        LEFT JOIN inventario i
            ON l.id_libro = i.id_libro

        WHERE f.id_usuario = ?

        ) base
        ORDER BY base.favorito_fecha DESC, base.id_libro DESC
    `, [idUsuario]);

    return rows;
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    agregar,
    quitar,
    esFavorito,
    listar
};
