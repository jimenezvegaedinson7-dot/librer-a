// ========================================
// CONSULTAR ESTADO DE UNA ORDEN EN MERCADO PAGO
// ========================================
// Usado por el job de limpieza (cancelarOrdenesAbandonadas) para
// NO liberar el stock de ventas que en realidad ya están pagadas
// en Mercado Pago aunque el webhook aún no haya llegado a la BD.
//
// Firma: consultarEstadoOrdenMP({ externalReference, orderId })
//
// Devuelve SIEMPRE un objeto (no lanza):
//   { pagado: true/false, status, error: false, mensaje }
//   { pagado: false, status, error: true, mensaje }  (API caída)
//
// El job consulta por id de orden (mp_preference_id) cuando existe;
// si no, intenta localizar pagos por external_reference.
// ========================================

const { Order, Payment } = require('mercadopago');
const { cliente } = require('../config/mercadopago');

const ESTADOS_PAGADOS = [
    'approved',
    'closed',
    'paid'
];

const ESTADOS_CANCELADOS = [
    'cancelled',
    'canceled',
    'rejected',
    'refunded',
    'charged_back'
];

const ESTADOS_PENDIENTES = [
    'pending',
    'in_process',
    'authorized',
    'processed',
    'action_required'
];

const normalizarEstado = (estado) => {
    return typeof estado === 'string'
        ? estado.toLowerCase().trim()
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
    const reversiones = ['refunded', 'charged_back'];

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

// La API de Orders ubica el estado real del cobro dentro de
// transactions.payments. Ese valor tiene prioridad sobre el estado
// operativo de la orden (created/processed/cancelled).
const extraerEstadoOrdenMP = (orden) => {
    const pagosAnidados = Array.isArray(
        orden?.transactions?.payments
    )
        ? orden.transactions.payments
        : [];
    const pagosDirectos = Array.isArray(orden?.payments)
        ? orden.payments
        : [];
    const pagos = pagosAnidados.length > 0
        ? pagosAnidados
        : pagosDirectos;

    const pagoConfirmado = pagos.find((pago) =>
        ESTADOS_PAGADOS.includes(
            normalizarEstado(pago?.status)
        )
    );
    const pagoPendiente = pagos.find((pago) =>
        ESTADOS_PENDIENTES.includes(
            normalizarEstado(pago?.status)
        )
    );
    const pago =
        pagoConfirmado ||
        pagoPendiente ||
        pagos[0] ||
        null;
    const paymentStatus =
        normalizarEstado(pago?.status) ||
        normalizarEstado(orden?.payment_status);
    const orderStatus = normalizarEstado(orden?.status);
    const status = paymentStatus || orderStatus;

    return {
        status,
        orderStatus,
        paymentStatus,
        paymentStatusDetail:
            pago?.status_detail ||
            orden?.payment_status_detail ||
            null,
        paymentId: pago?.id ? String(pago.id) : null,
        amount:
            pago?.transaction_amount ??
            pago?.total_paid_amount ??
            pago?.amount ??
            orden?.transaction_amount ??
            orden?.total_amount ??
            null,
        pagado: ESTADOS_PAGADOS.includes(status),
        cancelado: ESTADOS_CANCELADOS.includes(status),
        pendiente: ESTADOS_PENDIENTES.includes(status)
    };
};

const consultarEstadoOrdenMP = async ({
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
                    'Mercado Pago no está configurado en el servidor'
            };
        }

        let status = null;

        // ========================================
        // 1) POR ID DE ORDEN (mp_preference_id)
        // ========================================
        if (orderId) {
            const order = new Order(cliente);

            const orden =
                await order.get({ id: orderId });

            status = extraerEstadoOrdenMP(orden).status;
        } else if (externalReference) {
            // ========================================
            // 2) POR REFERENCIA EXTERNA (búsqueda de pagos)
            // ========================================
            const payment =
                new Payment(cliente);

            const busqueda =
                await payment.search({
                    options: {
                        limit: 1,
                        external_reference:
                            String(externalReference)
                    }
                });

            const resultados =
                busqueda?.results ||
                busqueda?.response?.results ||
                [];

            status =
                resultados[0]?.status ||
                null;
        }

        if (!status) {
            return {
                pagado: false,
                error: false,
                status: null,
                mensaje:
                    'No se encontró la orden en Mercado Pago o no tiene estado'
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
        // API caída / token inválido: devolver error sin lanzar
        // para NO tumbar el job de limpieza.
        return {
            pagado: false,
            error: true,
            status: null,
            mensaje:
                error?.message ||
                'Error al consultar Mercado Pago'
        };
    }
};

module.exports = {
    consultarEstadoOrdenMP,
    extraerEstadoOrdenMP,
    montoPagoCoincide,
    debeActualizarEstadoPago
};
