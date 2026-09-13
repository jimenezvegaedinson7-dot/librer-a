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
    const {
        nombre,
        apellido,
        nacionalidad,
        biografia,
        estado
    } = autor;

    const [resultado] = await pool.query(`
        UPDATE autores
        SET
            nombre = COALESCE(?, nombre),
            apellido = COALESCE(?, apellido),
            nacionalidad = COALESCE(?, nacionalidad),
            biografia = COALESCE(?, biografia),
            estado = COALESCE(?, estado)
        WHERE id_autor = ?
    `, [
        nombre ?? null,
        apellido ?? null,
        nacionalidad ?? null,
        biografia ?? null,
        estado ?? null,
        id
    ]);

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