const pool = require('../config/database');

// ========================================
// OBTENER TODAS LAS CATEGORÍAS
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
        SELECT
            id_categoria,
            nombre,
            descripcion,
            estado,
            fecha_registro
        FROM categorias
        ORDER BY id_categoria DESC
    `);

    return rows;
};

// ========================================
// OBTENER CATEGORÍA POR ID
// ========================================
const obtenerPorId = async (id) => {
    const [rows] = await pool.query(`
        SELECT
            id_categoria,
            nombre,
            descripcion,
            estado,
            fecha_registro
        FROM categorias
        WHERE id_categoria = ?
    `, [id]);

    return rows[0];
};

// ========================================
// CREAR CATEGORÍA
// ========================================
const crear = async (categoria) => {
    const {
        nombre,
        descripcion,
        estado
    } = categoria;

    const [resultado] = await pool.query(`
        INSERT INTO categorias
        (
            nombre,
            descripcion,
            estado
        )
        VALUES (?, ?, ?)
    `, [
        nombre,
        descripcion ?? null,
        estado ?? 1
    ]);

    return resultado.insertId;
};

// ========================================
// ACTUALIZAR CATEGORÍA
// ========================================
const actualizar = async (id, categoria) => {
    const campos = [], valores = [];
    for (const campo of ['nombre', 'descripcion', 'estado']) {
        if (categoria[campo] !== undefined) { campos.push(`${campo} = ?`); valores.push(categoria[campo]); }
    }
    if (!campos.length) return 0;
    const [resultado] = await pool.query(`UPDATE categorias SET ${campos.join(', ')} WHERE id_categoria = ?`, [...valores, id]);

    return resultado.affectedRows;
};

// ========================================
// ELIMINAR CATEGORÍA
// ========================================
const eliminar = async (id) => {
    const [resultado] = await pool.query(`
        DELETE FROM categorias
        WHERE id_categoria = ?
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
