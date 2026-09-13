// ========================================
// CONSULTAR ESTADO DE UNA ORDEN EN CULQI
// ========================================
// Usado por el job de limpieza (cancelarOrdenesAbandonadas) para
// NO liberar el stock de ventas que en realidad ya están pagadas
// en Culqi aunque el webhook aún no haya llegado a la BD.
//
// Firma: consultarEstadoOrdenCulqi({ externalReference, orderId })
//
// Devuelve SIEMPRE un objeto (no lanza):
//   { pagado: true/false, status, error: false, mensaje }
//   { pagado: false, status, error: true, mensaje }  (API caída)
//
// El job consulta por id de orden (culqi_order_id) cuando existe;
// si no, intenta localizar pagos por external_reference.
// ========================================

const { cliente } = require('../config/culqi');
const CULQI_API_BASE = 'https://api.culqi.com/v2';

const ESTADOS_PAGADOS = [
    'paid'
];

const ESTADOS_CANCELADOS = [
    'failed',
    'cancelled',
    'expired'
];

const ESTADOS_PENDIENTES = [
    'pending',
    'created'
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

const extraerEstadoOrdenCulqi = (orden) => {
    const status = orden?.status || 'desconocido';
    const amount = orden?.amount ? orden.amount / 100 : null;
    const paymentId = orden?.charge_id || orden?.id || null;

    const pagado = ESTADOS_PAGADOS.includes(status);
    const cancelado = ESTADOS_CANCELADOS.includes(status);
    const pendiente = ESTADOS_PENDIENTES.includes(status);

    return {
        status,
        orderStatus: status,
        paymentStatus: status,
        paymentStatusDetail: orden?.status_detail || null,
        paymentId,
        amount,
        pagado,
        cancelado,
        pendiente
    };
};

const consultarEstadoOrdenCulqi = async ({
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
                    'Culqi no está configurado en el servidor'
            };
        }

        let status = null;
        let orden = null;

        // 1) POR ID DE ORDEN (culqi_order_id)
        if (orderId) {
            const headers = {
                'Authorization': `Bearer ${cliente.secretKey}`
            };

            const response = await fetch(`${CULQI_API_BASE}/orders/${orderId}`, {
                method: 'GET',
                headers
            });

            if (response.ok) {
                orden = await response.json();
                status = orden.status;
            }
        } else if (externalReference) {
            // 2) POR REFERENCIA EXTERNA (búsqueda de orders)
            const headers = {
                'Authorization': `Bearer ${cliente.secretKey}`
            };

            const response = await fetch(`${CULQI_API_BASE}/orders?order_number=${encodeURIComponent(String(externalReference))}&limit=1`, {
                method: 'GET',
                headers
            });

            if (response.ok) {
                const data = await response.json();
                const resultados = data?.data || [];
                if (resultados.length > 0) {
                    orden = resultados[0];
                    status = orden.status;
                }
            }
        }

        if (!status) {
            return {
                pagado: false,
                error: false,
                status: null,
                mensaje:
                    'No se encontró la orden en Culqi o no tiene estado'
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
                'Error al consultar Culqi'
        };
    }
};

module.exports = {
    consultarEstadoOrdenCulqi,
    extraerEstadoOrdenCulqi,
    montoPagoCoincide,
    debeActualizarEstadoPago
};