import { correoVisible } from '../lib/utils/cuentas';
import { textoMetodoPago, textoOrigen } from '../ventas/metodosPago';

export const ESTADOS_PAGO = {
    approved: { texto: 'Aprobado', color: 'success' },
    captured: { texto: 'Cobrado', color: 'success' },
    authorized: { texto: 'Autorizado', color: 'info' },
    pending: { texto: 'Pendiente', color: 'warning' },
    in_process: { texto: 'En proceso', color: 'warning' },
    rejected: { texto: 'Rechazado', color: 'danger' },
    declined: { texto: 'Rechazado', color: 'danger' },
    expired: { texto: 'Expirado', color: 'neutral' },
    refunded: { texto: 'Reembolsado', color: 'warning' },
    cancelled: { texto: 'Cancelado', color: 'neutral' },

    tienda: { texto: 'Cobrado en tienda', color: 'success' },
    tienda_devuelto: { texto: 'Devuelto', color: 'neutral' },
    confirmado: { texto: 'Confirmado', color: 'success' },
    sin_confirmar: { texto: 'Sin confirmar', color: 'warning' },
    sin_pago: { texto: 'Sin pago', color: 'neutral' },
    en_revision: { texto: 'En revisión', color: 'warning' }
};

export const configEstadoPago = (estado) => ESTADOS_PAGO[estado] || ESTADOS_PAGO[String(estado || '').toLowerCase()] || { texto: estado || 'Sin pago', color: 'neutral' };

const COBRADAS = ['pagada', 'entregada'];

function enriquecerPago(pago, venta) {
    const origen = venta?.origen || pago.origen || (pago.external_reference ? 'app' : 'panel');
    const idReservaHistorica = venta?.id_reserva ?? pago.id_reserva;
    const enTienda = origen === 'panel' || origen === 'reserva' || Boolean(idReservaHistorica);
    const estadoVenta = pago.estado_venta;
    const cliente = pago.cliente || {};

    const nombre = origen === 'panel' ? venta?.cliente_nombre || 'Cliente de mostrador' : venta?.cliente_nombre || cliente.nombre_completo || 'Sin nombre';
    const correo = origen === 'panel' ? correoVisible(venta?.correo_compra) : correoVisible(venta?.correo_compra) || correoVisible(cliente.email);

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
        canal_compra: pago.canal_compra ?? venta?.canal_compra,
        cobertura_entrega: pago.cobertura_entrega ?? venta?.cobertura_entrega,
        zona_delivery_nombre: pago.zona_delivery_nombre ?? venta?.zona_delivery_nombre,
        costo_envio: pago.costo_envio ?? venta?.costo_envio,
        direccion: pago.direccion ?? venta?.direccion,
        referencia: pago.referencia ?? venta?.referencia,
        distrito: venta?.distrito,
        provincia: venta?.provincia,
        agencia: venta?.agencia,
        origen,
        origen_texto: textoOrigen({ origen, id_reserva: idReservaHistorica, canal_compra: pago.canal_compra ?? venta?.canal_compra }),
        cliente: { ...cliente, nombre_completo: nombre, email: correo },
        metodo_pago: enTienda ? textoMetodoPago(venta?.metodo_pago) || 'Cobro en tienda' : 'PayU',
        referencia_pago: enTienda ? venta?.referencia_pago || null : null,
        estado_pago: estadoPago
    };
}

export function pagoDesdeVenta(venta) {
    const pago = enriquecerPago(
        {
            id_venta: venta.id_venta,
            id_pago: venta.payu_payment_id,
            external_reference: venta.external_reference,
            payu_order_id: venta.payu_order_id,
            estado_venta: venta.estado,
            estado_pago: venta.payu_payment_status,
            monto_total: Number(venta.total || 0),
            fecha_creacion: venta.fecha_venta,
            tipo_entrega: venta.tipo_entrega,
            cliente: { id_usuario: venta.id_usuario, nombre_completo: `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.trim(), email: venta.correo_usuario }
        },
        venta
    );
    return venta.pago_revision_motivo ? { ...pago, estado_pago: 'en_revision' } : pago;
}
