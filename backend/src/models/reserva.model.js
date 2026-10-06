const pool = require('../config/database');
const { RESERVA, permitirTransicion } = require('../utils/transiciones');
const { registrarMovimiento } = require('./inventario.model');
const { PRECIO_FINAL_SQL } = require('./libro.model');

const fechaEnDiasUtc = dias => {
    const hoy = new Date();
    return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + dias)).toISOString().slice(0, 10);
};
const fechaVencimientoDefecto = () => fechaEnDiasUtc(14);
// Compatibilidad para interpretar fechas históricas; no habilita creación.
const validarFechaVencimiento = fecha => {
    if (fecha === undefined || fecha === null || fecha === '') return { valida: true, fecha: null };
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())) {
        return { valida: false, mensaje: 'La fecha de vencimiento debe tener formato YYYY-MM-DD' };
    }
    const texto = fecha.trim();
    const date = new Date(`${texto}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== texto) {
        return { valida: false, mensaje: 'La fecha de vencimiento no es una fecha válida' };
    }
    if (texto < fechaEnDiasUtc(1) || texto > fechaEnDiasUtc(14)) {
        return { valida: false, mensaje: 'La fecha de vencimiento debe estar entre 1 y 14 días desde hoy' };
    }
    return { valida: true, fecha: texto };
};

const consulta = `SELECT r.*, l.titulo, l.precio, ${PRECIO_FINAL_SQL}, l.estado AS libro_estado,
    l.isbn, l.portada, u.nombre AS nombre_usuario, u.apellido AS apellido_usuario, u.email AS correo_usuario
    FROM reservas r JOIN libros l ON r.id_libro=l.id_libro JOIN usuarios u ON r.id_usuario=u.id_usuario`;
const obtenerTodos = async () => (await pool.query(`${consulta} ORDER BY r.id_reserva DESC`))[0];
const obtenerPorId = async id => (await pool.query(`${consulta} WHERE r.id_reserva=?`, [id]))[0][0];
const obtenerPorUsuario = async id => (await pool.query(`${consulta} WHERE r.id_usuario=? ORDER BY r.id_reserva DESC`, [id]))[0];
const crear = async () => {
    throw Object.assign(new Error('La creación de reservas está retirada'), { status: 405 });
};

const actualizarEstado = async (id, nuevoEstado) => {
    if (nuevoEstado !== 'cancelada') {
        throw Object.assign(new Error('Las reservas históricas solo permiten cancelación'), { status: 409 });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT * FROM reservas WHERE id_reserva=? FOR UPDATE', [id]);
        const reserva = rows[0];
        if (!reserva) { await connection.rollback(); return 0; }
        if (!permitirTransicion(RESERVA, reserva.estado, nuevoEstado)) {
            throw Object.assign(new Error(`No se puede cancelar una reserva en estado "${reserva.estado}"`), { status: 409 });
        }
        const [inventario] = await connection.query('UPDATE inventario SET stock=stock+? WHERE id_libro=? RETURNING stock',
            [reserva.cantidad, reserva.id_libro]);
        if (!inventario[0]) throw Object.assign(new Error('Inventario no encontrado; no se canceló la reserva'), { status: 409 });
        await registrarMovimiento(connection, { id_libro: reserva.id_libro, id_usuario: null,
            tipo: 'entrada', motivo: 'cancelacion_reserva', cantidad: reserva.cantidad, stock_resultante: inventario[0].stock });
        const [result] = await connection.query("UPDATE reservas SET estado='cancelada' WHERE id_reserva=?", [id]);
        await connection.commit();
        return result.affectedRows;
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
};

const cancelarVencidas = async () => {
    const [rows] = await pool.query("SELECT id_reserva FROM reservas WHERE estado IN ('pendiente','confirmada') AND fecha_vencimiento<CURRENT_DATE");
    let canceladas = 0;
    for (const row of rows) {
        try { canceladas += await actualizarEstado(row.id_reserva, 'cancelada'); }
        catch (error) { if (error.status !== 409) console.error('Error al liberar reserva vencida:', error.message); }
    }
    return canceladas;
};
module.exports = { obtenerTodos, obtenerPorId, obtenerPorUsuario, crear, actualizarEstado, cancelarVencidas,
    validarFechaVencimiento, fechaVencimientoDefecto };
