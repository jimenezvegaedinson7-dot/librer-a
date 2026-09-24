const ventaModel = require('../models/venta.model');
const historialModel = require('../models/historial.model');
const ubicacionModel = require('../models/ubicacion.model');
const pool = require('../config/database');
const { validarId } = require('../utils/validaciones');
const { VENTA, permitirTransicion } = require('../utils/transiciones');
const { PUBLIC_BASE_URL } = require('../config/payu');
const { enviarCorreoPedidoEntregado } = require('../utils/mailer');

// ========================================
// REGISTRAR HISTORIAL SIN AFECTAR LA VENTA
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
// NOTIFICAR ENTREGA SIN AFECTAR LA VENTA
// (fire-and-forget: un fallo de correo no
// debe romper el cambio de estado)
// ========================================
const notificarPedidoEntregado = async (ventaActual) => {
    const destinatario =
        ventaActual.correo_compra ||
        ventaActual.correo_usuario;

    if (!destinatario) return;

    const nombre = [
        ventaActual.nombre_usuario,
        ventaActual.apellido_usuario
    ].filter(Boolean).join(' ').trim();

    await enviarCorreoPedidoEntregado({
        destinatario,
        nombre: nombre || 'cliente',
        idVenta: ventaActual.id_venta,
        tipoEntrega: ventaActual.tipo_entrega
    });
};

// ========================================
// OBTENER TODAS LAS VENTAS
// ========================================
const obtenerVentas = async (req, res) => {
    try {
        const ventas =
            await ventaModel.obtenerTodos();

        return res.json({
            success: true,
            data: ventas
        });

    } catch (error) {
        console.error(
            'Error al obtener ventas:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener las ventas',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// OBTENER UNA VENTA POR ID
// (dueño de la venta o administrador)
// ========================================
const obtenerVenta = async (req, res) => {
    try {
        const { id } = req.params;

        const idVenta = validarId(id);

        if (!idVenta) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de venta inválido'
            });
        }

        const venta =
            await ventaModel.obtenerPorId(idVenta);

        if (!venta) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Venta no encontrada'
            });
        }

        // ========================================
        // VERIFICAR PROPIEDAD (IDOR)
        // El dueño de la venta puede ver el detalle completo
        // de su compra; el admin puede ver todas.
        // ========================================
        const esAdmin =
            String(
                req.usuario?.rol || ''
            ).toLowerCase() === 'administrador';

        if (
            Number(venta.id_usuario) !==
                Number(req.usuario.id_usuario) &&
            !esAdmin
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'No tienes permisos para consultar esta venta'
            });
        }

        return res.json({
            success: true,
            data: venta
        });

    } catch (error) {
        console.error(
            'Error al obtener venta:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener la venta',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// OBTENER MIS VENTAS
// ========================================
const obtenerMisVentas = async (req, res) => {
    try {
        const id_usuario =
            req.usuario.id_usuario;

        const ventas =
            await ventaModel.obtenerPorUsuario(
                id_usuario
            );

        return res.json({
            success: true,
            data: ventas
        });

    } catch (error) {
        console.error(
            'Error al obtener ventas del usuario:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener tus ventas',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// CREAR VENTA (ADMIN)
// Acepta tipo de entrega (tienda | domicilio), dirección e
// id_distrito para domicilio y una referencia opcional.
// El envío por agencia ya no se ofrece (solo se entrega en
// Lima); las ventas antiguas por agencia se conservan.
// ========================================
const ListaTipoEntrega = [
    'tienda',
    'domicilio'
];

const crearVenta = async (req, res) => {
    try {
        const id_usuario =
            req.usuario.id_usuario;

        const { detalles } = req.body;
        const correo_compra = req.body.correo_compra;

        const tipo_entrega = req.body.tipo_entrega;
        const id_distrito = req.body.id_distrito;
        const direccion = req.body.direccion;
        const referencia = req.body.referencia;
        const cliente_documento = req.body.cliente_documento;
        const cliente_tipo_documento = req.body.cliente_tipo_documento;

        // ========================================
        // NORMALIZAR TIPO DE ENTREGA
        // ========================================
        let tipoEntrega = 'tienda';

        if (
            tipo_entrega !== undefined &&
            tipo_entrega !== null &&
            String(tipo_entrega).trim() !== ''
        ) {
            if (
                !ListaTipoEntrega.includes(
                    tipo_entrega
                )
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'Tipo de entrega no válido. Usa "tienda" o "domicilio"'
                });
            }

            tipoEntrega = tipo_entrega;
        }

        // ========================================
        // VALIDAR DETALLES
        // ========================================
        if (
            !detalles ||
            !Array.isArray(detalles) ||
            detalles.length === 0
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'La venta debe contener al menos un detalle'
            });
        }

        // ========================================
        // VALIDAR CADA DETALLE
        // ========================================
        for (const detalle of detalles) {
            if (
                !detalle.id_libro ||
                detalle.cantidad === undefined
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'Cada detalle debe contener id_libro y cantidad'
                });
            }

            const cantidadNum =
                Number(detalle.cantidad);

            if (
                !Number.isInteger(cantidadNum) ||
                cantidadNum <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'La cantidad de cada libro debe ser un número entero mayor a 0'
                });
            }
        }

        // ========================================
        // CALCULAR COSTO DE ENVÍO SEGÚN TIPO DE ENTREGA
        // (consistente con la lógica de crearOrden / listar)
        // ========================================
        let costoEnvio = 0;
        let distritoEntrega = null;

        if (
            tipoEntrega === 'domicilio'
        ) {
            distritoEntrega =
                await ubicacionModel
                    .existeDistrito(
                        validarId(id_distrito)
                    );

            // Solo se envía a domicilio dentro de Lima (provincia). Una app
            // antigua podría enviar un distrito de otra provincia.
            if (!ubicacionModel.esDistritoDeLima(distritoEntrega)) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'Selecciona un distrito válido de Lima'
                });
            }

            if (
                !direccion ||
                typeof direccion !== 'string' ||
                direccion.trim().length < 5
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'Indica una dirección de entrega válida'
                });
            }

            costoEnvio = Number(
                distritoEntrega.tarifa_envio
            ) || 0;
        }

        // 'tienda' no requiere datos adicionales: costoEnvio queda 0.

        // ========================================
        // CREAR VENTA
        // ========================================
        const resultado =
            await ventaModel.crear({
                id_usuario,
                detalles,
                tipo_entrega: tipoEntrega,
                direccion:
                    tipoEntrega === 'domicilio'
                        ? String(direccion).trim()
                        : null,
                id_distrito:
                    tipoEntrega === 'domicilio'
                        ? validarId(id_distrito)
                        : null,
                id_agencia: null,
                referencia:
                    referencia &&
                    String(referencia).trim()
                        ? String(
                            referencia
                        ).trim()
                        : null,
                correo_compra,
                costo_envio: costoEnvio,
                cliente_documento: cliente_documento || null,
                cliente_tipo_documento: cliente_tipo_documento || null,
                estado: 'pendiente'
            });

        // ========================================
        // HISTORIAL
        // ========================================
        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'CREAR',
            modulo: 'ventas',
            descripcion:
                `Venta #${resultado.id_venta} creada correctamente por un total de S/ ${Number(resultado.total).toFixed(2)} (${tipoEntrega})`
        });

        return res.status(201).json({
            success: true,
            mensaje: 'Venta creada correctamente',
            data: {
                id_venta: resultado.id_venta,
                total: resultado.total,
                subtotal: Number(
                    (
                        Number(resultado.total) -
                        Number(resultado.costo_envio || 0)
                    ).toFixed(2)
                ),
                costo_envio:
                    Number(resultado.costo_envio || 0),
                tipo_entrega: tipoEntrega,
                id_distrito:
                    tipoEntrega === 'domicilio'
                        ? validarId(id_distrito)
                        : null,
                id_agencia: null,
                direccion:
                    tipoEntrega === 'domicilio'
                        ? String(direccion).trim()
                        : null,
                referencia:
                    referencia &&
                    String(referencia).trim()
                        ? String(
                            referencia
                        ).trim()
                        : null,
                estado: 'pendiente'
            }
        });

    } catch (error) {
        console.error(
            'Error al crear venta:',
            error
        );

        const mensaje =
            error.message ||
            'Error al crear la venta';

        if (
            mensaje.includes(
                'Stock insuficiente'
            ) ||
            mensaje.includes(
                'no tiene inventario'
            ) ||
            mensaje.includes(
                'no existe'
            ) ||
            mensaje.includes(
                'cantidad'
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
                'Error al crear la venta',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// ACTUALIZAR ESTADO DE VENTA
// ========================================
const actualizarEstadoVenta = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const idVenta = validarId(id);

        if (!idVenta) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de venta inválido'
            });
        }

        const id_usuario =
            req.usuario.id_usuario;

        // ========================================
        // ESTADOS VÁLIDOS
        // ========================================
        const estadosPermitidos = [
            'pendiente',
            'pagada',
            'entregada',
            'cancelada'
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
                    'Estado de venta no válido'
            });
        }

        // ========================================
        // BUSCAR VENTA ACTUAL
        // ========================================
        const ventaActual =
            await ventaModel.obtenerPorId(idVenta);

        if (!ventaActual) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Venta no encontrada'
            });
        }

        const estadoActual =
            ventaActual.estado;

        // ========================================
        // MISMO ESTADO
        // ========================================
        if (
            estadoActual === estado
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    `La venta ya se encuentra en estado "${estado}"`
            });
        }

        // ========================================
        // BLOQUEAR TRANSICION PENDIENTE -> PAGADA
        // Solo el webhook de PayU puede confirmar pago
        // ========================================
        if (estadoActual === 'pendiente' && estado === 'pagada') {
            return res.status(403).json({
                success: false,
                mensaje: 'No se puede marcar una venta como pagada manualmente. Solo el sistema de pago (PayU) puede confirmar el pago.'
            });
        }

        // ========================================
        // BLOQUEAR CANCELACION DE VENTA PAGADA
        // Requiere gestion de reembolso primero
        // ========================================
        if (estadoActual === 'pagada' && estado === 'cancelada') {
            return res.status(403).json({
                success: false,
                mensaje: 'No se puede cancelar una venta ya pagada. Se requiere gestionar el reembolso a traves de PayU primero.'
            });
        }
        const puedeCambiar =
            permitirTransicion(
                VENTA,
                estadoActual,
                estado
            );

        if (!puedeCambiar) {
            return res.status(400).json({
                success: false,
                mensaje:
                    `No se puede cambiar una venta de "${estadoActual}" a "${estado}"`
            });
        }

        // ========================================
        // ACTUALIZAR ESTADO
        // ========================================
        const actualizado =
            await ventaModel.actualizarEstado(
                idVenta,
                estado
            );

        if (!actualizado) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Venta no encontrada'
            });
        }

        // ========================================
        // HISTORIAL
        // ========================================
        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'ventas',
            descripcion:
                `Venta #${idVenta} actualizada de "${estadoActual}" a "${estado}"`
        });

        // ========================================
        // NOTIFICAR ENTREGA AL CLIENTE
        // (solo cuando realmente pasa a "entregada")
        // ========================================
        if (estado === 'entregada') {
            notificarPedidoEntregado(
                ventaActual
            ).catch((error) => {
                console.error(
                    'Error al notificar pedido entregado:',
                    error.message
                );
            });
        }

        return res.json({
            success: true,
            mensaje:
                `Venta actualizada a estado "${estado}" correctamente`
        });

    } catch (error) {
        console.error(
            'Error al actualizar venta:',
            error
        );

        return res.status(400).json({
            success: false,
            mensaje:
                error.message ||
                'Error al actualizar la venta'
        });
    }
};

// ========================================
// OBTENER DATOS DE PAGO DE UNA VENTA
// (dueño de la venta o administrador)
// ========================================
const obtenerPagoVenta = async (req, res) => {
    try {
        const { id } = req.params;

        const idVenta = validarId(id);

        if (!idVenta) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de venta inválido'
            });
        }

        // ========================================
        // OBTENER DATOS DE PAGO
        // ========================================
        const datosPago =
            await ventaModel.obtenerDatosPago(idVenta);

        if (!datosPago) {
            return res.status(404).json({
                success: false,
                mensaje: 'Venta no encontrada'
            });
        }

        // ========================================
        // VERIFICAR PROPIEDAD (IDOR)
        // ========================================
        const esAdmin =
            String(
                req.usuario?.rol || ''
            ).toLowerCase() === 'administrador';

        if (
            Number(datosPago.id_usuario) !==
                Number(req.usuario.id_usuario) &&
            !esAdmin
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'No tienes permisos para consultar esta venta'
            });
        }

        const estadoPagoMap = {
            pagada: 'APPROVED',
            cancelada: 'DECLINED'
        };

        const estadoPago =
            datosPago.payu_payment_status ||
            estadoPagoMap[datosPago.estado] ||
            null;

        // Con WebCheckout el checkout_url apunta a la página propia que
        // auto-envía el form a PayU; sólo se ofrece mientras esté pendiente.
        const checkoutUrl =
            datosPago.estado === 'pendiente' &&
            datosPago.external_reference
                ? `${PUBLIC_BASE_URL}/api/pagos/checkout/${encodeURIComponent(datosPago.external_reference)}`
                : null;

        const tienePago =
            datosPago.payu_payment_id ||
            datosPago.payu_payment_status ||
            datosPago.external_reference;

        return res.json({
            success: true,
            data: {
                id_venta: datosPago.id_venta,
                external_reference:
                    datosPago.external_reference,
                payu_order_id:
                    datosPago.payu_order_id,
                order_id:
                    datosPago.external_reference ||
                    datosPago.payu_order_id,
                checkout_url: checkoutUrl,
                payu_payment_id:
                    datosPago.payu_payment_id,
                payu_payment_status:
                    datosPago.payu_payment_status,
                metodo_pago:
                    tienePago
                        ? 'payu'
                        : null,
                estado_pago: estadoPago,
                fecha_pago: null,
                estado: datosPago.estado,
                estado_venta:
                    datosPago.estado
            }
        });

    } catch (error) {
        console.error(
            'Error al obtener datos de pago de la venta:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener los datos de pago de la venta',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// EXPORTAR
// ========================================
module.exports = {
    obtenerVentas,
    obtenerVenta,
    obtenerMisVentas,
    crearVenta,
    actualizarEstadoVenta,
    obtenerPagoVenta
};
