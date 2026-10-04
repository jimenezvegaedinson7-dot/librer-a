const pool = require('../config/database');

// ========================================
// OBTENER TODOS LOS AUTORES
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
        SELECT
            id_autor,
            nombre,
            apellido,
            nacionalidad,
            biografia,
            fecha_registro,
            estado
        FROM autores
        ORDER BY id_autor DESC
    `);

    return rows;
};

// ========================================
// OBTENER AUTOR POR ID
// ========================================
const obtenerPorId = async (id) => {
    const [rows] = await pool.query(`
        SELECT
            id_autor,
            nombre,
            apellido,
            nacionalidad,
            biografia,
            fecha_registro,
            estado
        FROM autores
        WHERE id_autor = ?
    `, [id]);

    return rows[0];
};

// ========================================
// CREAR AUTOR
// ========================================
const crear = async (autor) => {
    const {
        nombre,
        apellido,
        nacionalidad,
        biografia,
        estado
    } = autor;

    const [resultado] = await pool.query(`
        INSERT INTO autores
        (
            nombre,
            apellido,
            nacionalidad,
            biografia,
            estado
        )
        VALUES (?, ?, ?, ?, ?)
    `, [
        nombre,
        apellido,
        nacionalidad ?? null,
        biografia ?? null,
        estado ?? 1
    ]);

    return resultado.insertId;
};

// ========================================
// ACTUALIZAR AUTOR
// ========================================
const actualizar = async (id, autor) => {
    const campos = [], valores = [];
    for (const campo of ['nombre', 'apellido', 'nacionalidad', 'biografia', 'estado']) {
        if (autor[campo] !== undefined) { campos.push(`${campo} = ?`); valores.push(autor[campo]); }
    }
    if (!campos.length) return 0;
    const [resultado] = await pool.query(`UPDATE autores SET ${campos.join(', ')} WHERE id_autor = ?`, [...valores, id]);

    return resultado.affectedRows;
};

// ========================================
// ELIMINAR AUTOR
// ========================================
const eliminar = async (id) => {
    const [resultado] = await pool.query(`
        DELETE FROM autores
        WHERE id_autor = ?
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
