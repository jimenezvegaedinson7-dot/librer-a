import { PASOS_ENTREGA, normalizarEstadoEntrega, pagoConfirmadoPedido, pagoEnRevision } from './estadoEntrega.js';

// Solo el estado logístico registrado determina los avances. El estado
// comercial antiguo 'entregada' confirma un pago histórico, no una entrega.
export function seguimientoPedido(v) {
    const flujo = PASOS_ENTREGA[v?.tipo_entrega];
    const estado = normalizarEstadoEntrega(v?.estado_entrega);
    if (estado === 'cancelado' || v?.estado === 'cancelada') return {
        titulo: 'Pedido cancelado', mensaje: 'La entrega se detuvo. El estado del pago y una posible devolución se consultan por separado.', pasos: [], tono: 'cancelado',
    };
    if (!flujo || estado === null || !flujo.some(([clave]) => clave === estado)) return {
        titulo: 'Estado de entrega no disponible', mensaje: 'No hay un estado logístico compatible registrado. No se supone una entrega ni un avance.', pasos: [], tono: 'espera',
    };
    const indiceRegistrado = flujo.findIndex(([clave]) => clave === estado);
    const indice = estado === 'pendiente' && !pagoConfirmadoPedido(v) ? -1 : indiceRegistrado;
    const pasos = flujo.map(([clave, etiqueta], i) => ({ clave, etiqueta, hecho: i < indice || indice === flujo.length - 1, actual: i === indice }));
    const etiqueta = flujo[indiceRegistrado][1];
    if (pagoEnRevision(v) || v.estado_reembolso === 'pendiente_verificacion') return {
        titulo: estado === 'entregado' ? 'Entregado' : 'Entrega detenida',
        mensaje: `Último estado registrado: ${etiqueta}. ${pagoEnRevision(v) ? 'El pago requiere revisión.' : 'Hay una devolución pendiente de verificación.'}`,
        pasos, tono: 'espera',
    };
    if (v.estado === 'reembolsada') return {
        titulo: estado === 'entregado' ? 'Entregado' : 'Entrega detenida', mensaje: `Último estado registrado: ${etiqueta}. Reembolso registrado para esta compra.`,
        pasos, tono: estado === 'entregado' ? 'listo' : 'espera',
    };
    if (!pagoConfirmadoPedido(v)) return {
        titulo: 'Esperando pago', mensaje: 'La preparación empieza cuando se confirme el pago. El pago no confirma la entrega.', pasos, tono: 'espera',
    };
    const mensaje = estado === 'pendiente' ? 'Tu pago está confirmado. El pedido todavía no está listo ni ha salido.'
        : estado === 'listo_recojo' ? `Acércate a la tienda con tu número de pedido #${v.id_venta ?? '—'} y tu DNI.`
        : estado === 'en_camino' ? 'El pedido salió con el repartidor hacia tu dirección.'
        : v.tipo_entrega === 'tienda' ? 'La entrega de tus libros en tienda fue confirmada.' : 'La entrega de tus libros a domicilio fue confirmada.';
    return { titulo: etiqueta, mensaje, pasos, tono: estado === 'entregado' ? 'listo' : 'proceso' };
}
