import { correoVisible } from '../../lib/utils/cuentas';
import { textoMetodoPago, textoOrigen } from '../ventas/metodosPago';

// ============================================================
// PRESENTACIÓN DE PAGOS (tabla, detalle y CSV usan lo mismo)
// ------------------------------------------------------------
// /api/pagos solo describe el pago en línea (PayU): no trae el origen de la
// venta, el método de cobro en tienda ni el cliente anotado en mostrador.
// Esos datos vienen de /api/ventas y se unen por id_venta.
// ============================================================

export const ESTADOS_VENTA = {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    pagada: { texto: 'Pagada', color: 'success' },
    entregada: { texto: 'Entregada', color: 'info' },
    cancelada: { texto: 'Cancelada', color: 'danger' },
    reembolsada: { texto: 'Reembolsada', color: 'neutral' },
};

export const ESTADOS_PAGO = {
    approved: { texto: 'Aprobado', color: 'success' },
    pending: { texto: 'Pendiente', color: 'warning' },
    in_process: { texto: 'En proceso', color: 'warning' },
    rejected: { texto: 'Rechazado', color: 'danger' },
    declined: { texto: 'Rechazado', color: 'danger' },
    expired: { texto: 'Expirado', color: 'neutral' },
    refunded: { texto: 'Reembolsado', color: 'warning' },
    cancelled: { texto: 'Cancelado', color: 'neutral' },
    // Estados derivados cuando PayU no aplica o aún no informó.
    tienda: { texto: 'Cobrado en tienda', color: 'success' },
    tienda_devuelto: { texto: 'Devuelto', color: 'neutral' },
    confirmado: { texto: 'Confirmado', color: 'success' },
    sin_confirmar: { texto: 'Sin confirmar', color: 'warning' },
    sin_pago: { texto: 'Sin pago', color: 'neutral' },
};

export const configEstadoVenta = (estado) =>
    ESTADOS_VENTA[estado] || { texto: estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Sin estado', color: 'neutral' };

export const configEstadoPago = (estado) =>
    ESTADOS_PAGO[estado] || ESTADOS_PAGO[String(estado || '').toLowerCase()] || { texto: estado || 'Sin pago', color: 'neutral' };

const COBRADAS = ['pagada', 'entregada'];

// Une el pago con su venta y deja listos los textos a mostrar.
export function enriquecerPago(pago, venta) {
    const origen = venta?.origen || (pago.external_reference ? 'app' : 'panel');
    const enTienda = origen === 'panel' || origen === 'reserva';
    const estadoVenta = pago.estado_venta;
    const cliente = pago.cliente || {};

    const nombre = origen === 'panel'
        ? venta?.cliente_nombre || 'Cliente de mostrador'
        : venta?.cliente_nombre || cliente.nombre_completo || 'Sin nombre';
    const correo = origen === 'panel'
        ? correoVisible(venta?.correo_compra)
        : correoVisible(venta?.correo_compra) || correoVisible(cliente.email);

    let estadoPago;
    if (enTienda) {
        if (estadoVenta === 'reembolsada') estadoPago = 'tienda_devuelto';
        else estadoPago = COBRADAS.includes(estadoVenta) ? 'tienda' : 'sin_pago';
    } else if (pago.estado_pago) {
        estadoPago = pago.estado_pago;
    } else if ([...COBRADAS, 'reembolsada'].includes(estadoVenta)) {
        estadoPago = 'confirmado';
    } else {
        estadoPago = estadoVenta === 'cancelada' ? 'sin_pago' : 'sin_confirmar';
    }

    return {
        ...pago,
        origen,
        origen_texto: textoOrigen({ origen, id_reserva: venta?.id_reserva }),
        cliente: { ...cliente, nombre_completo: nombre, email: correo },
        metodo_pago: enTienda ? textoMetodoPago(venta?.metodo_pago) || 'Cobro en tienda' : 'PayU',
        referencia_pago: enTienda ? venta?.referencia_pago || null : null,
        estado_pago: estadoPago,
    };
}
