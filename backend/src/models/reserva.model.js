const pool = require('../config/database');
const { RESERVA, permitirTransicion } = require('../utils/transiciones');
const { registrarMovimiento } = require('./inventario.model');

// ========================================
// VALIDAR FECHA DE VENCIMIENTO DE RESERVA
// (función pura, testeable sin BD)
// Reglas:
//   - Si no viene (undefined/null/'') → { valida: true, fecha: null }
//     (la fecha por defecto hoy+14 se asigna al CREAR: ni el
//     controlador ni el modelo guardan NULL en la BD).
//   - Si viene debe ser YYYY-MM-DD válido y estar entre hoy+1 y
//     hoy+14 días.
// Devuelve { valida, fecha?, mensaje? }.
// ========================================
const MAX_DIAS_ANTICIPACION = 14;
const DIAS_VENCIMIENTO_DEFECTO = 14;

// ========================================
// FECHA UTC hoy + N días en formato YYYY-MM-DD
// ========================================
const fechaEnDiasUtc = (dias) => {
    const hoy = new Date();

    const fecha = new Date(
        Date.UTC(
            hoy.getUTCFullYear(),
            hoy.getUTCMonth(),
            hoy.getUTCDate()
        )
    );

    fecha.setUTCDate(
        fecha.getUTCDate() + dias
    );

    const mes = String(
        fecha.getUTCMonth() + 1
    ).padStart(2, '0');

    const dia = String(
        fecha.getUTCDate()
    ).padStart(2, '0');

    return `${fecha.getUTCFullYear()}-${mes}-${dia}`;
};

// ========================================
// FECHA DE VENCIMIENTO POR DEFECTO (hoy + 14)
// Se usa en crearReserva cuando el cliente no envía
// fecha_vencimiento, para nunca guardar NULL.
// ========================================
const fechaVencimientoDefecto = () =>
    fechaEnDiasUtc(DIAS_VENCIMIENTO_DEFECTO);

const validarFechaVencimiento = (fecha) => {
    if (
        fecha === undefined ||
        fecha === null ||
        fecha === ''
    ) {
        return { valida: true, fecha: null };
    }

    if (typeof fecha !== 'string') {
        return {
            valida: false,
            mensaje:
                'La fecha de vencimiento debe tener formato YYYY-MM-DD'
        };
    }

    const texto = fecha.trim();

    const coincidencia =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            texto
        );

    if (!coincidencia) {
        return {
            valida: false,
            mensaje:
                'La fecha de vencimiento debe tener formato YYYY-MM-DD'
        };
    }

    const anio = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    const dia = Number(coincidencia[3]);

    const fechaObj = new Date(
        Date.UTC(anio, mes - 1, dia)
    );

    if (
        fechaObj.getUTCFullYear() !== anio ||
        fechaObj.getUTCMonth() !== mes - 1 ||
        fechaObj.getUTCDate() !== dia
    ) {
        return {
            valida: false,
            mensaje:
                'La fecha de vencimiento no es una fecha válida'
        };
    }

    const hoy = new Date();

    const inicio = new Date(
        Date.UTC(
            hoy.getUTCFullYear(),
            hoy.getUTCMonth(),
            hoy.getUTCDate()
        )
    );
    inicio.setUTCDate(
        inicio.getUTCDate() + 1
    );

    const fin = new Date(
        Date.UTC(
            hoy.getUTCFullYear(),
            hoy.getUTCMonth(),
            hoy.getUTCDate()
        )
    );
    fin.setUTCDate(
        fin.getUTCDate() +
        MAX_DIAS_ANTICIPACION
    );

    if (fechaObj < inicio || fechaObj > fin) {
        return {
            valida: false,
            mensaje:
                'La fecha de vencimiento debe estar entre 1 y 14 días desde hoy'
        };
    }

    return {
        valida: true,
        fecha: texto
    };
};

// ========================================
// OBTENER TODAS LAS RESERVAS
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
        SELECT
            r.id_reserva,
            r.id_usuario,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            r.id_libro,
            l.titulo,
            r.cantidad,
            r.fecha_reserva,
            r.fecha_vencimiento,
            r.estado
        FROM reservas r
        INNER JOIN libros l
            ON r.id_libro = l.id_libro
        INNER JOIN usuarios u
            ON r.id_usuario = u.id_usuario
        ORDER BY r.id_reserva DESC
    `);

    return rows;
};

// ========================================
// OBTENER RESERVA POR ID
// ========================================
const obtenerPorId = async (id) => {
    const [rows] = await pool.query(`
        SELECT
            r.id_reserva,
            r.id_usuario,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            r.id_libro,
            l.titulo,
            r.cantidad,
            r.fecha_reserva,
            r.fecha_vencimiento,
            r.estado
        FROM reservas r
        INNER JOIN libros l
            ON r.id_libro = l.id_libro
        INNER JOIN usuarios u
            ON r.id_usuario = u.id_usuario
        WHERE r.id_reserva = ?
    `, [id]);

    return rows[0];
};

// ========================================
// OBTENER RESERVAS POR USUARIO
// ========================================
const obtenerPorUsuario = async (id_usuario) => {
    const [rows] = await pool.query(`
        SELECT
            r.id_reserva,
            r.id_usuario,
            r.id_libro,
            l.titulo,
            l.portada,
            r.cantidad,
            r.fecha_reserva,
            r.fecha_vencimiento,
            r.estado
        FROM reservas r
        INNER JOIN libros l
            ON r.id_libro = l.id_libro
        WHERE r.id_usuario = ?
        ORDER BY r.id_reserva DESC
    `, [id_usuario]);

    return rows;
};

// ========================================
// CREAR RESERVA Y DESCONTAR STOCK
// ========================================
const crear = async (reserva) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            id_usuario,
            id_libro,
            cantidad,
            fecha_vencimiento
        } = reserva;

        // ========================================
        // VALIDAR FECHA DE VENCIMIENTO (si viene)
        // Si no viene, se asigna el default hoy+14 para
        // nunca guardar NULL.
        // ========================================
        const resultadoFecha =
            validarFechaVencimiento(
                fecha_vencimiento
            );

        if (!resultadoFecha.valida) {
            throw new Error(
                resultadoFecha.mensaje
            );
        }

        const fechaVencimientoFinal =
            resultadoFecha.fecha ||
            fechaVencimientoDefecto();

        // Bloquear inventario mientras se realiza la reserva
        const [inventario] = await connection.query(`
            SELECT stock
            FROM inventario
            WHERE id_libro = ?
            FOR UPDATE
        `, [id_libro]);

        if (inventario.length === 0) {
            throw new Error(
                'El libro no tiene inventario registrado'
            );
        }

        const stockActual = inventario[0].stock;

        if (stockActual < cantidad) {
            throw new Error(
                `Stock insuficiente. Disponible: ${stockActual}`
            );
        }

        // Crear reserva
        const [resultado] = await connection.query(`
            INSERT INTO reservas
            (
                id_usuario,
                id_libro,
                cantidad,
                fecha_vencimiento
            )
            VALUES (?, ?, ?, ?)
        `, [
            id_usuario,
            id_libro,
            cantidad,
            fechaVencimientoFinal
        ]);

        // Descontar stock
        await connection.query(`
            UPDATE inventario
            SET stock = stock - ?
            WHERE id_libro = ?
        `, [
            cantidad,
            id_libro
        ]);

        await registrarMovimiento(connection, {
            id_libro,
            id_usuario,
            tipo: 'salida',
            motivo: 'reserva',
            cantidad,
            stock_resultante: Number(stockActual) - cantidad
        });

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
// ACTUALIZAR ESTADO DE RESERVA
// ========================================
const actualizarEstado = async (id, nuevoEstado) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Bloquear reserva
        const [reservas] = await connection.query(`
            SELECT
                id_reserva,
                id_libro,
                cantidad,
                estado
            FROM reservas
            WHERE id_reserva = ?
            FOR UPDATE
        `, [id]);

        if (reservas.length === 0) {
            await connection.rollback();
            return 0;
        }

        const reserva = reservas[0];

        // Evitar modificar una reserva al mismo estado
        if (reserva.estado === nuevoEstado) {
            throw new Error(
                `La reserva ya se encuentra en estado "${nuevoEstado}"`
            );
        }

        // ----------------------------------------
        // MÁQUINA DE ESTADOS (FUENTE ÚNICA: utils/transiciones)
        // ----------------------------------------
        const puedeCambiar =
            permitirTransicion(
                RESERVA,
                reserva.estado,
                nuevoEstado
            );

        if (!puedeCambiar) {
            throw new Error(
                `No se puede cambiar una reserva de "${reserva.estado}" a "${nuevoEstado}"`
            );
        }

        // Si se cancela, devolver stock
        if (nuevoEstado === 'cancelada') {
            await connection.query(`
                UPDATE inventario
                SET stock = stock + ?
                WHERE id_libro = ?
            `, [
                reserva.cantidad,
                reserva.id_libro
            ]);

            const [[{ stock: stockNuevo }]] = await connection.query(`
                SELECT stock
                FROM inventario
                WHERE id_libro = ?
            `, [reserva.id_libro]);

            await registrarMovimiento(connection, {
                id_libro: reserva.id_libro,
                id_usuario: null,
                tipo: 'entrada',
                motivo: 'cancelacion_reserva',
                cantidad: reserva.cantidad,
                stock_resultante: stockNuevo
            });
        }

        const [resultado] = await connection.query(`
            UPDATE reservas
            SET estado = ?
            WHERE id_reserva = ?
        `, [
            nuevoEstado,
            id
        ]);

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
// CANCELAR RESERVAS VENCIDAS
// (pendiente/confirmada con fecha_vencimiento pasada)
// Devuelve el stock de cada reserva cancelada.
// ========================================
const cancelarVencidas = async () => {
    const [vencidas] = await pool.query(`
        SELECT
            id_reserva
        FROM reservas
        WHERE
            estado IN ('pendiente', 'confirmada')
            AND fecha_vencimiento IS NOT NULL
            AND fecha_vencimiento < CURRENT_DATE
    `);

    let canceladas = 0;

    for (const reserva of vencidas) {
        try {
            await actualizarEstado(
                reserva.id_reserva,
                'cancelada'
            );
            canceladas++;
        } catch (error) {
            console.error(
                `[reserva] No se pudo cancelar la reserva ${reserva.id_reserva}:`,
                error.message
            );
        }
    }

    return canceladas;
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    obtenerTodos,
    obtenerPorId,
    obtenerPorUsuario,
    crear,
    actualizarEstado,
    cancelarVencidas,
    validarFechaVencimiento,
    fechaVencimientoDefecto
};