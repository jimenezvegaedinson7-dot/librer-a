const pool = require('../config/database');

// ========================================
// OBTENER TODOS LOS LIBROS
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
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
            l.estado

        FROM libros l

        INNER JOIN autores a 
            ON l.id_autor = a.id_autor

        INNER JOIN categorias c 
            ON l.id_categoria = c.id_categoria

        LEFT JOIN inventario i
            ON l.id_libro = i.id_libro

        ORDER BY l.id_libro DESC
    `);

    return rows;
};

// ========================================
// OBTENER LIBRO POR ID
// ========================================
const obtenerPorId = async (id) => {
    const [rows] = await pool.query(`
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
            l.estado

        FROM libros l

        INNER JOIN autores a 
            ON l.id_autor = a.id_autor

        INNER JOIN categorias c 
            ON l.id_categoria = c.id_categoria

        LEFT JOIN inventario i
            ON l.id_libro = i.id_libro

        WHERE l.id_libro = ?
    `, [id]);

    return rows[0];
};

// ========================================
// CREAR LIBRO
// ========================================
const crear = async (libro) => {
    const {
        titulo,
        isbn,
        descripcion,
        precio,
        stock,
        portada,
        id_autor,
        id_categoria,
        estado
    } = libro;

    const [resultado] = await pool.query(`
        INSERT INTO libros
        (
            titulo,
            isbn,
            descripcion,
            precio,
            stock,
            portada,
            id_autor,
            id_categoria,
            estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        titulo,
        isbn ?? null,
        descripcion ?? null,
        precio,
        stock ?? 0,
        portada ?? null,
        id_autor,
        id_categoria,
        estado ?? 1
    ]);

    return resultado.insertId;
};

// ========================================
// ACTUALIZAR LIBRO
// ========================================
const actualizar = async (id, libro) => {
    const {
        titulo,
        isbn,
        descripcion,
        precio,
        stock,
        portada,
        id_autor,
        id_categoria,
        estado
    } = libro;

    const [resultado] = await pool.query(`
        UPDATE libros
        SET
            titulo = COALESCE(?, titulo),
            isbn = COALESCE(?, isbn),
            descripcion = COALESCE(?, descripcion),
            precio = COALESCE(?, precio),
            stock = COALESCE(?, stock),
            portada = COALESCE(?, portada),
            id_autor = COALESCE(?, id_autor),
            id_categoria = COALESCE(?, id_categoria),
            estado = COALESCE(?, estado)
        WHERE id_libro = ?
    `, [
        titulo ?? null,
        isbn ?? null,
        descripcion ?? null,
        precio ?? null,
        stock ?? null,
        portada ?? null,
        id_autor ?? null,
        id_categoria ?? null,
        estado ?? null,
        id
    ]);

    return resultado.affectedRows;
};

// ========================================
// ELIMINAR LIBRO
// ========================================
const eliminar = async (id) => {
    const [resultado] = await pool.query(`
        DELETE FROM libros
        WHERE id_libro = ?
    `, [id]);

    return resultado.affectedRows;
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    obtenerTodos,
    obtenerPorId,
    crear,
    actualizar,
    eliminar
};