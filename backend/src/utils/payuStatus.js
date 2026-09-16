// ========================================
// CONSULTAR ESTADO DE UNA ORDEN EN PAYU
// ========================================
// Usado por el job de limpieza (cancelarOrdenesAbandonadas) para
// NO liberar el stock de ventas que en realidad ya están pagadas
// en PayU aunque el webhook aún no haya llegado a la BD.
//
// Firma: consultarEstadoOrdenPayu({ externalReference, orderId })
//
// Devuelve SIEMPRE un objeto (no lanza):
//   { pagado: true/false, status, error: false, mensaje }
//   { pagado: false, status, error: true, mensaje }  (API caída)
//
// El job consulta por id de orden (payu_order_id) cuando existe;
// si no, intenta localizar pagos por external_reference.
// ========================================

const { cliente } = require('../config/payu');
const { consultarReporte } = require('../services/payu.service');

const ESTADOS_PAGADOS = [
    'APPROVED',
    'CAPTURED'
];

const ESTADOS_CANCELADOS = [
    'DECLINED',
    'ERROR',
    'EXPIRED',
    'VOIDED',
    'REFUNDED'
];

const ESTADOS_PENDIENTES = [
    'PENDING',
    'PENDING_TRANSACTION_REVIEW',
    'PENDING_TRANSACTION_CONFIRMATION'
];

const normalizarEstado = (estado) => {
    return typeof estado === 'string'
        ? estado.toUpperCase().trim()
        : null;
};

const montoPagoCoincide = (
    montoPago,
    montoVenta,
    tolerancia = 0.02
) => {
    if (montoPago == null || montoVenta == null) {
        return false;
    }

    const pago = Number(montoPago);
    const venta = Number(montoVenta);

    return Number.isFinite(pago) &&
        Number.isFinite(venta) &&
        Math.abs(pago - venta) <= tolerancia;
};

const debeActualizarEstadoPago = (
    estadoActual,
    estadoNuevo
) => {
    const actual = normalizarEstado(estadoActual);
    const nuevo = normalizarEstado(estadoNuevo);
    const reversiones = ['REFUNDED', 'CHARGED_BACK'];

    if (!nuevo) {
        return false;
    }

    if (reversiones.includes(nuevo)) {
        return true;
    }

    if (reversiones.includes(actual)) {
        return false;
    }

    if (ESTADOS_PAGADOS.includes(actual)) {
        return ESTADOS_PAGADOS.includes(nuevo);
    }

    return true;
};

const extraerEstadoOrdenPayu = (orden) => {
    const transactionResponse = orden?.transactionResponse || orden;
    const status = transactionResponse?.state || 'UNKNOWN';
    const amount = transactionResponse?.value ? transactionResponse.value / 100 : (orden?.amount ? orden.amount / 100 : null);
    const paymentId = transactionResponse?.transactionId || transactionResponse?.orderId || null;

    const pagado = ESTADOS_PAGADOS.includes(status);
    const cancelado = ESTADOS_CANCELADOS.includes(status);
    const pendiente = ESTADOS_PENDIENTES.includes(status);

    return {
        status,
        orderStatus: status,
        paymentStatus: status,
        paymentStatusDetail: transactionResponse?.pendingReason || transactionResponse?.responseMessage || null,
        paymentId,
        amount,
        pagado,
        cancelado,
        pendiente
    };
};

const consultarEstadoOrdenPayu = async ({
    externalReference,
    orderId
}) => {
    try {
        if (!cliente) {
            return {
                pagado: false,
                error: true,
                status: null,
                mensaje:
                    'PayU no está configurado en el servidor'
            };
        }

        let status = null;

        // 1) POR ID DE ORDEN (payu_order_id)
        if (orderId) {
            const consulta =
                await consultarReporte('ORDER_DETAIL', {
                    orderId: Number(orderId)
                });

            status =
                consulta?.result?.payload?.status ?? null;
        } else if (externalReference) {
            // 2) POR REFERENCIA EXTERNA (ORDER_DETAIL_BY_REFERENCE_CODE)
            const consulta =
                await consultarReporte(
                    'ORDER_DETAIL_BY_REFERENCE_CODE',
                    {
                        referenceCode: String(
                            externalReference
                        )
                    }
                );

            const payload =
                consulta?.result?.payload;
            const orden =
                Array.isArray(payload)
                    ? payload[0]
                    : payload;

            status = orden?.status ?? null;
        }

        if (!status) {
            return {
                pagado: false,
                error: false,
                status: null,
                mensaje:
                    'No se encontró la orden en PayU o no tiene estado'
            };
        }

        const pagado =
            ESTADOS_PAGADOS.includes(status);

        return {
            pagado,
            pendiente:
                ESTADOS_PENDIENTES.includes(status),
            status,
            error: false,
            mensaje: pagado
                ? `La orden está pagada (${status})`
                : `La orden no está pagada (${status})`
        };

    } catch (error) {
        return {
            pagado: false,
            error: true,
            status: null,
            mensaje:
                error?.message ||
                'Error al consultar PayU'
        };
    }
};

module.exports = {
    consultarEstadoOrdenPayu,
    extraerEstadoOrdenPayu,
    montoPagoCoincide,
    debeActualizarEstadoPago
};