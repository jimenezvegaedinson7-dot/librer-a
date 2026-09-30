const ventaModel = require('../models/venta.model');
const historialModel = require('../models/historial.model');
const { validarId } = require('../utils/validaciones');
const { ENTREGA, esTipoEntregaValido, permitirTransicionEntrega } = require('../utils/transiciones');

// ========================================
// REGISTRAR HISTORIAL SIN AFECTAR EL PEDIDO
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

const Pedido = {
    // ========================================
    // OBTENER TODOS LOS PEDIDOS (ADMIN)
    // Filtros opcionales: tipo, estado
    // ========================================
    async obtenerPedidos(req, res) {
        try {
            const { tipo, estado } = req.query;

            let where = {};

            // Filtrar por tipo de entrega: 'domicilio' o 'tienda'
            if (tipo) {
                where.tipo_entrega = tipo;
            }

            // Filtrar por estado de entrega
            if (estado) {
                where.estado_entrega = estado;
            }

            const pedidos =
                await ventaModel.obtenerConFiltros(where);

            return res.json({
                success: true,
                data: pedidos
            });

        } catch (error) {
            console.error('Error al obtener pedidos:', error);
            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener los pedidos',
                error: 'Error interno del servidor'
            });
        }
    },

    // ========================================
    // OBTENER PEDIDO POR ID (ADMIN)
    // ========================================
    async obtenerPedido(req, res) {
        try {
            const { id } = req.params;

            const idVenta = validarId(id);

            if (!idVenta) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'ID de pedido inválido'
                });
            }

            const pedido =
                await ventaModel.obtenerPorId(idVenta);

            if (!pedido) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Pedido no encontrado'
                });
            }

            return res.json({
                success: true,
                data: pedido
            });

        } catch (error) {
            console.error('Error al obtener pedido:', error);
            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener el pedido',
                error: 'Error interno del servidor'
            });
        }
    },

    // ========================================
    // OBTENER MIS PEDIDOS (CLIENTE)
    // Solo los pedidos del usuario autenticado
    // ========================================
    async obtenerMisPedidos(req, res) {
        try {
            const id_usuario = req.usuario.id_usuario;

            const pedidos =
                await ventaModel.obtenerPorUsuario(id_usuario);

            return res.json({
                success: true,
                data: pedidos
            });

        } catch (error) {
            console.error('Error al obtener mis pedidos:', error);
            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener tus pedidos',
                error: 'Error interno del servidor'
            });
        }
    },

    // ========================================
    // ACTUALIZAR ESTADO DE PEDIDO (ADMIN)
    // Estados permitidos: pendiente, preparando, listo_recojo, en_camino, entregado, cancelado
    // ========================================
    async actualizarEstadoPedido(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            const idVenta = validarId(id);

            if (!idVenta) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'ID de pedido inválido'
                });
            }

            const id_usuario = req.usuario.id_usuario;

            // Estados permitidos para el flujo de pedido
            const estadosPermitidos = Object.keys(ENTREGA);

            if (!estado || !estadosPermitidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Estado de pedido no válido'
                });
            }

            // Buscar venta actual
            const ventaActual =
                await ventaModel.obtenerPorId(idVenta);

            if (!ventaActual) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Pedido no encontrado'
                });
            }

            const estadoActual =
                ventaActual.estado_entrega || 'pendiente';

            if (['panel', 'reserva'].includes(ventaActual.origen)) {
                return res.status(409).json({ success: false, mensaje: 'Las ventas históricas son de solo lectura' });
            }

            // Mismo estado
            if (estadoActual === estado) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        `El pedido ya se encuentra en estado "${estado}"`
                });
            }

            // Un pedido sin tipo de entrega reconocible no se puede enrutar.
            // El mensaje no expone el valor ni instrucciones de base de
            // datos: el panel es una interfaz de negocio, no una consola.
            if (!esTipoEntregaValido(ventaActual.tipo_entrega)) {
                return res.status(409).json({
                    success: false,
                    mensaje:
                        'El pedido contiene un tipo de entrega no compatible con el flujo actual. Requiere corrección de datos antes de continuar.'
                });
            }

            // Máquina de estados de ENTREGA, consciente del tipo de
            // entrega: un pedido a domicilio no pasa por "listo_recojo"
            // ni uno de tienda por "en_camino", porque son estados que el
            // panel no sabe avanzar desde ahí.
            const puedeCambiar =
                permitirTransicionEntrega(
                    ventaActual.tipo_entrega,
                    estadoActual,
                    estado
                );

            if (!puedeCambiar) {
                return res.status(400).json({
                    success: false,
                    mensaje: `No se puede cambiar el pedido de "${estadoActual}" a "${estado}"`
                });
            }

            // Actualizar solo el estado_entrega, no el estado comercial
            const actualizado =
                await ventaModel.actualizarEstadoEntrega(
                    idVenta,
                    estado
                );

            if (!actualizado) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Pedido no encontrado'
                });
            }

            // Registrar historial
            await registrarHistorial({
                id_usuario,
                tipo_operacion: 'ACTUALIZAR',
                modulo: 'pedidos',
                descripcion:
                    `Pedido #${idVenta} actualizado de "${estadoActual}" a "${estado}"`
            });

            return res.json({
                success: true,
                mensaje: 'Estado de pedido actualizado correctamente',
                data: {
                    id_venta: idVenta,
                    estado_entrega: estado
                }
            });

        } catch (error) {
            console.error('Error al actualizar estado de pedido:', error);
            if (error.status >= 400 && error.status < 500) {
                return res.status(error.status).json({ success: false, mensaje: error.message });
            }
            return res.status(500).json({
                success: false,
                mensaje: 'Error al actualizar el estado del pedido',
                error: 'Error interno del servidor'
            });
        }
    }
};

module.exports = Pedido;
