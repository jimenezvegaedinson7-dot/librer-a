const reservaModel = require('../models/reserva.model');
const historialModel = require('../models/historial.model');
const { validarId, esCantidadPositiva, esNumeroNoNegativo } = require('../utils/validaciones');
const { RESERVA, permitirTransicion } = require('../utils/transiciones');

// ========================================
// REGISTRAR HISTORIAL SIN AFECTAR RESERVAS
// ========================================
const registrarHistorial = async ({
    id_usuario,
    tipo_operacion,
    modulo,
    descripcion
}) => {
    try {
        await historialModel.crear({
            id_usuario,
            tipo_operacion,
            modulo,
            descripcion
        });

    } catch (error) {
        console.error(
            'Error al registrar historial:',
            error.message
        );
    }
};

// ========================================
// OBTENER TODAS LAS RESERVAS
// ========================================
const obtenerReservas = async (req, res) => {
    try {
        const reservas =
            await reservaModel.obtenerTodos();

        return res.json({
            success: true,
            data: reservas
        });

    } catch (error) {
        console.error(
            'Error al obtener reservas:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener las reservas',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// OBTENER UNA RESERVA POR ID
// ========================================
const obtenerReserva = async (req, res) => {
    try {
        const { id } = req.params;

        const idReserva = validarId(id);

        if (!idReserva) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de reserva inválido'
            });
        }

        const reserva =
            await reservaModel.obtenerPorId(idReserva);

        if (!reserva) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Reserva no encontrada'
            });
        }

        // ========================================
        // VERIFICAR PROPIEDAD (IDOR) — dueño o admin
        // (misma regla que DELETE /reservas/:id)
        // ========================================
        const esAdmin =
            String(
                req.usuario?.rol || ''
            ).toLowerCase() ===
            'administrador';

        if (
            Number(reserva.id_usuario) !==
                Number(req.usuario.id_usuario) &&
            !esAdmin
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'No tienes permisos para ver esta reserva'
            });
        }

        return res.json({
            success: true,
            data: reserva
        });

    } catch (error) {
        console.error(
            'Error al obtener reserva:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener la reserva',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// OBTENER RESERVAS DEL USUARIO AUTENTICADO
// ========================================
const obtenerMisReservas = async (req, res) => {
    try {
        const id_usuario =
            req.usuario.id_usuario;

        const reservas =
            await reservaModel.obtenerPorUsuario(
                id_usuario
            );

        return res.json({
            success: true,
            data: reservas
        });

    } catch (error) {
        console.error(
            'Error al obtener reservas del usuario:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener tus reservas',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// CREAR UNA RESERVA
// ========================================
const crearReserva = async (req, res) => {
    try {
        const id_usuario =
            req.usuario.id_usuario;

        const {
            id_libro,
            cantidad,
            fecha_vencimiento
        } = req.body;

        // ========================================
        // VALIDACIONES
        // ========================================
        if (
            !id_libro ||
            cantidad === undefined
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'id_libro y cantidad son obligatorios'
            });
        }

        const idLibroNum = validarId(id_libro);

        if (!idLibroNum) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El id del libro no es válido'
            });
        }

        if (
            !Number.isInteger(
                Number(cantidad)
            ) ||
            Number(cantidad) <= 0
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'La cantidad debe ser un número entero'
            });
        }

        // ========================================
        // VALIDAR FECHA DE VENCIMIENTO (si viene)
        // Debe ser YYYY-MM-DD entre hoy+1 y hoy+14.
        // Si no viene, se asigna el default hoy+14
        // (nunca se guarda NULL).
        // ========================================
        const validacionFecha =
            reservaModel.validarFechaVencimiento(
                fecha_vencimiento
            );

        if (!validacionFecha.valida) {
            return res.status(400).json({
                success: false,
                mensaje:
                    validacionFecha.mensaje
            });
        }

        const fechaVencimientoFinal =
            validacionFecha.fecha ||
            reservaModel
                .fechaVencimientoDefecto();

        // ========================================
        // CREAR RESERVA
        // ========================================
        const id =
            await reservaModel.crear({
                id_usuario,
                id_libro:
                    idLibroNum,

                cantidad:
                    Number(cantidad),

                fecha_vencimiento:
                    fechaVencimientoFinal
            });

        // ========================================
        // HISTORIAL
        // ========================================
        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'CREAR',
            modulo: 'reservas',
            descripcion:
                `Reserva #${id} creada para el libro ${idLibroNum} con cantidad ${Number(cantidad)}`
        });

        return res.status(201).json({
            success: true,
            mensaje:
                'Reserva creada correctamente',
            id_reserva: id,
            id_usuario
        });

    } catch (error) {
        console.error(
            'Error al crear reserva:',
            error
        );

        const mensaje =
            error.message ||
            'Error al crear la reserva';

        if (
            mensaje.includes(
                'Stock insuficiente'
            ) ||
            mensaje.includes(
                'inventario'
            )
        ) {
            return res.status(400).json({
                success: false,
                mensaje
            });
        }

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al crear la reserva',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// ACTUALIZAR ESTADO DE UNA RESERVA
// ========================================
const actualizarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const idReserva = validarId(id);

        if (!idReserva) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de reserva inválido'
            });
        }

        const id_usuario =
            req.usuario.id_usuario;

        // ========================================
        // ESTADOS PERMITIDOS
        // ========================================
        const estadosPermitidos = [
            'pendiente',
            'confirmada',
            'cancelada',
            'completada'
        ];

        if (
            !estado ||
            !estadosPermitidos.includes(
                estado
            )
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Estado no válido'
            });
        }

        // ========================================
        // BUSCAR RESERVA ACTUAL
        // ========================================
        const reservaActual =
            await reservaModel.obtenerPorId(idReserva);

        if (!reservaActual) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Reserva no encontrada'
            });
        }

        const estadoActual =
            reservaActual.estado;

        // ========================================
        // EVITAR ACTUALIZAR AL MISMO ESTADO
        // ========================================
        if (estadoActual === estado) {
            return res.status(400).json({
                success: false,
                mensaje:
                    `La reserva ya se encuentra en estado "${estado}"`
            });
        }

        // ========================================
        // TRANSICIONES VÁLIDAS
        // (fuente única: utils/transiciones)
        // ========================================
        const puedeCambiar =
            permitirTransicion(
                RESERVA,
                estadoActual,
                estado
            );

        if (!puedeCambiar) {
            return res.status(400).json({
                success: false,
                mensaje:
                    `No se puede cambiar una reserva de "${estadoActual}" a "${estado}"`
            });
        }

        // ========================================
        // ACTUALIZAR ESTADO
        // ========================================
        const actualizado =
            await reservaModel.actualizarEstado(
                idReserva,
                estado
            );

        if (!actualizado) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Reserva no encontrada'
            });
        }

        // ========================================
        // HISTORIAL
        // ========================================
        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'reservas',
            descripcion:
                `Reserva #${idReserva} actualizada de "${estadoActual}" a "${estado}"`
        });

        return res.json({
            success: true,
            mensaje:
                `Reserva actualizada a estado "${estado}" correctamente`
        });

    } catch (error) {
        console.error(
            'Error al actualizar reserva:',
            error
        );

        return res.status(400).json({
            success: false,
            mensaje:
                error.message ||
                'Error al actualizar la reserva'
        });
    }
};

// ========================================
// CANCELAR UNA RESERVA (SOLO EL DUEÑO)
// DELETE /api/reservas/:id (token, cliente)
// Pone la reserva en 'cancelada' y devuelve el stock.
// ========================================
const cancelarReserva = async (req, res) => {
    try {
        const { id } = req.params;

        const idReserva = validarId(id);

        if (!idReserva) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de reserva inválido'
            });
        }

        // ========================================
        // BUSCAR RESERVA
        // ========================================
        const reserva =
            await reservaModel.obtenerPorId(idReserva);

        if (!reserva) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Reserva no encontrada'
            });
        }

        // ========================================
        // VERIFICAR PROPIEDAD (IDOR) — solo el dueño
        // ========================================
        if (
            Number(reserva.id_usuario) !==
            Number(req.usuario.id_usuario)
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'No tienes permisos para cancelar esta reserva'
            });
        }

        // ========================================
        // ESTADOS QUE NO SE PUEDEN CANCELAR
        // ========================================
        if (reserva.estado === 'completada') {
            return res.status(400).json({
                success: false,
                mensaje:
                    'No se puede cancelar una reserva completada'
            });
        }

        if (reserva.estado === 'cancelada') {
            return res.status(400).json({
                success: false,
                mensaje:
                    'La reserva ya está cancelada'
            });
        }

        // ========================================
        // CANCELAR + DEVOLVER STOCK
        // ========================================
        const actualizado =
            await reservaModel.actualizarEstado(
                idReserva,
                'cancelada'
            );

        if (!actualizado) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Reserva no encontrada'
            });
        }

        // ========================================
        // HISTORIAL
        // ========================================
        await registrarHistorial({
            id_usuario:
                req.usuario.id_usuario,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'reservas',
            descripcion:
                `Reserva #${idReserva} cancelada por el cliente`
        });

        return res.json({
            success: true,
            mensaje:
                'Reserva cancelada correctamente'
        });

    } catch (error) {
        console.error(
            'Error al cancelar reserva:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al cancelar la reserva',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// EXPORTAR CONTROLADORES
// ========================================
module.exports = {
    obtenerReservas,
    obtenerReserva,
    obtenerMisReservas,
    crearReserva,
    actualizarEstado,
    cancelarReserva
};