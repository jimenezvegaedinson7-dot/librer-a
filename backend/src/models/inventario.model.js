const pool = require('../config/database');

// ========================================
// REGISTRAR MOVIMIENTO DE INVENTARIO (KARDEX)
// ========================================
// Inserta una fila en movimientos_inventario usando la misma
// conexión (transacción) del cambio de stock. Se usa internamente
// y también desde venta.model y reserva.model para registrar kardex.
// ========================================
const registrarMovimiento = async (connection, {
    id_libro,
    id_usuario = null,
    tipo,
    motivo = 'ajuste',
    cantidad,
    stock_resultante
}) => {
    if (!cantidad || cantidad === 0) {
        return 0;
    }

    const [resultado] = await connection.query(`
        INSERT INTO movimientos_inventario
        (
            id_libro,
            id_usuario,
            tipo,
            motivo,
            cantidad,
            stock_resultante
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `, [
        id_libro,
        id_usuario ?? null,
        tipo,
        motivo,
        cantidad,
        stock_resultante
    ]);

    return resultado.insertId;
};

// ========================================
// OBTENER TODO EL INVENTARIO
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
        SELECT
            i.id_inventario,
            i.id_libro,
            l.titulo,
            i.stock,
            i.stock_minimo,
            i.ubicacion,
            i.ultima_actualizacion
        FROM inventario i
        INNER JOIN libros l ON i.id_libro = l.id_libro
        ORDER BY i.id_inventario DESC
    `);

    return rows;
};

// ========================================
// OBTENER INVENTARIO POR LIBRO
// ========================================
const obtenerPorLibro = async (id_libro) => {
    const [rows] = await pool.query(`
        SELECT
            i.id_inventario,
            i.id_libro,
            l.titulo,
            i.stock,
            i.stock_minimo,
            i.ubicacion,
            i.ultima_actualizacion
        FROM inventario i
        INNER JOIN libros l ON i.id_libro = l.id_libro
        WHERE i.id_libro = ?
    `, [id_libro]);

    return rows[0];
};

// ========================================
// CREAR INVENTARIO
// ========================================
const crear = async (inventario, motivo = 'creacion') => {
    const {
        id_libro,
        stock,
        stock_minimo,
        ubicacion
    } = inventario;

    const id_usuario = inventario.id_usuario ?? null;
    const stockInicial = stock ?? 0;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [resultado] = await connection.query(`
            INSERT INTO inventario
            (
                id_libro,
                stock,
                stock_minimo,
                ubicacion
            )
            VALUES (?, ?, ?, ?)
        `, [
            id_libro,
            stockInicial,
            stock_minimo ?? 5,
            ubicacion ?? null
        ]);

        if (stockInicial > 0) {
            await registrarMovimiento(connection, {
                id_libro,
                id_usuario,
                tipo: 'entrada',
                motivo,
                cantidad: stockInicial,
                stock_resultante: stockInicial
            });
        }

        await connection.commit();

        return resultado.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// ========================================
// ACTUALIZAR STOCK
// ========================================
const actualizarStock = async (id_libro, stock, motivo = 'ajuste_manual') => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [filas] = await connection.query(`
            SELECT stock
            FROM inventario
            WHERE id_libro = ?
            FOR UPDATE
        `, [id_libro]);

        const stockAnterior = filas[0] ? filas[0].stock : null;

        const [resultado] = await connection.query(`
            UPDATE inventario
            SET stock = ?
            WHERE id_libro = ?
        `, [
            stock,
            id_libro
        ]);

        if (stockAnterior !== null) {
            const nuevoStock = Number(stock);
            const delta = nuevoStock - Number(stockAnterior);

            if (delta !== 0) {
                await registrarMovimiento(connection, {
                    id_libro,
                    id_usuario: null,
                    tipo: delta > 0 ? 'entrada' : 'salida',
                    motivo,
                    cantidad: Math.abs(delta),
                    stock_resultante: nuevoStock
                });
            }
        }

        await connection.commit();

        return resultado.affectedRows;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// ========================================
// ACTUALIZAR INVENTARIO
// ========================================
const actualizar = async (id_libro, inventario, motivo = 'ajuste_manual') => {
    const {
        stock,
        stock_minimo,
        ubicacion
    } = inventario;

    const id_usuario = inventario.id_usuario ?? null;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [filas] = await connection.query(`
            SELECT stock
            FROM inventario
            WHERE id_libro = ?
            FOR UPDATE
        `, [id_libro]);

        const stockAnterior = filas[0] ? filas[0].stock : null;

        const [resultado] = await connection.query(`
            UPDATE inventario
            SET
                stock = COALESCE(?, stock),
                stock_minimo = COALESCE(?, stock_minimo),
                ubicacion = COALESCE(?, ubicacion)
            WHERE id_libro = ?
        `, [
            stock ?? null,
            stock_minimo ?? null,
            ubicacion ?? null,
            id_libro
        ]);

        if (filas[0] && stock !== undefined && stock !== null) {
            const nuevoStock = Number(stock);
            const delta = nuevoStock - Number(stockAnterior);

            if (delta !== 0) {
                await registrarMovimiento(connection, {
                    id_libro,
                    id_usuario,
                    tipo: delta > 0 ? 'entrada' : 'salida',
                    motivo,
                    cantidad: Math.abs(delta),
                    stock_resultante: nuevoStock
                });
            }
        }

        await connection.commit();

        return resultado.affectedRows;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// ========================================
// OBTENER LIBROS CON STOCK BAJO
// ========================================
const obtenerStockBajo = async () => {
    const [rows] = await pool.query(`
        SELECT
            i.id_inventario,
            i.id_libro,
            l.titulo,
            i.stock,
            i.stock_minimo,
            i.ubicacion
        FROM inventario i
        INNER JOIN libros l ON i.id_libro = l.id_libro
        WHERE i.stock <= i.stock_minimo
        ORDER BY i.stock ASC
    `);

    return rows;
};

// ========================================
// LISTAR MOVIMIENTOS DE INVENTARIO (KARDEX)
// ========================================
const listarMovimientos = async ({
    pagina = 1,
    porPagina = 20,
    id_libro = null
} = {}) => {
    const nPagina = Math.max(1, Math.floor(Number(pagina)) || 1);
    const nPorPagina = Math.min(
        100,
        Math.max(1, Math.floor(Number(porPagina)) || 20)
    );
    const offset = (nPagina - 1) * nPorPagina;

    const condiciones = [];
    const parametros = [];

    if (id_libro !== null && id_libro !== undefined && id_libro !== 0) {
        condiciones.push('m.id_libro = ?');
        parametros.push(id_libro);
    }

    const whereSql = condiciones.length
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    const [filas] = await pool.query(`
        SELECT
            m.id_movimiento,
            m.id_libro,
            l.titulo,
            m.tipo,
            m.motivo,
            m.cantidad,
            m.stock_resultante,
            CASE
                WHEN u.id_usuario IS NULL THEN NULL
                ELSE CONCAT_WS(' ', u.nombre, u.apellido)
            END AS usuario,
            m.fecha_movimiento
        FROM movimientos_inventario m
        INNER JOIN libros l ON m.id_libro = l.id_libro
        LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
        ${whereSql}
        ORDER BY m.fecha_movimiento DESC, m.id_movimiento DESC
        LIMIT ? OFFSET ?
    `, [...parametros, nPorPagina, offset]);

    const [[{ total }]] = await pool.query(`
        SELECT COUNT(*) AS total
        FROM movimientos_inventario m
        ${whereSql}
    `, parametros);

    return {
        movimientos: filas,
        total,
        paginas: Math.ceil(total / nPorPagina)
    };
};

// ========================================
// ELIMINAR INVENTARIO Y KARDEX DE UN LIBRO
// ========================================
// Se usan al eliminar un libro para no dejar
// registros huérfanos ni romper la FK.
// Aceptan una conexión opcional (transacción).
// ========================================
const eliminarPorLibro = async (
    idLibro,
    connection = pool
) => {
    const [resultado] = await connection.query(`
        DELETE FROM inventario
        WHERE id_libro = ?
    `, [idLibro]);

    return resultado.affectedRows;
};

const eliminarMovimientosPorLibro = async (
    idLibro,
    connection = pool
) => {
    const [resultado] = await connection.query(`
        DELETE FROM movimientos_inventario
        WHERE id_libro = ?
    `, [idLibro]);

    return resultado.affectedRows;
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    registrarMovimiento,
    obtenerTodos,
    obtenerPorLibro,
    crear,
    actualizarStock,
    actualizar,
    obtenerStockBajo,
    listarMovimientos,
    eliminarPorLibro,
    eliminarMovimientosPorLibro
};