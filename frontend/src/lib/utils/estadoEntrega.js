// Contrato compartido por Pedidos y Mis compras. 'preparando' es solo un alias
// de lectura del tramo inicial; nunca implica salida ni pedido listo.
export const PASOS_ENTREGA = {
    tienda: [['pendiente', 'Por preparar'], ['listo_recojo', 'Listo para recoger'], ['entregado', 'Entregado']],
    domicilio: [['pendiente', 'Por preparar'], ['en_camino', 'En camino'], ['entregado', 'Entregado']],
};
export const normalizarEstadoEntrega = estado => estado === 'preparando' ? 'pendiente'
    : ['pendiente', 'listo_recojo', 'en_camino', 'entregado', 'cancelado'].includes(estado) ? estado : null;
export const esTipoEntregaValido = tipo => typeof tipo === 'string' && Object.hasOwn(PASOS_ENTREGA, tipo);
export const pagoEnRevision = p => p?.requiere_revision === true || Boolean(p?.pago_revision_motivo)
    || (p?.estado !== 'reembolsada' && p?.estado_reembolso !== 'confirmado' && ['REFUNDED', 'CHARGED_BACK'].includes(p?.payu_payment_status));
export const pagoConfirmadoPedido = p => ['pagada', 'entregada'].includes(p?.estado)
    && (!p.payu_payment_status || ['APPROVED', 'CAPTURED'].includes(p.payu_payment_status))
    && !pagoEnRevision(p) && p.estado_reembolso !== 'confirmado';
export const esPedidoEcommerce = p => p?.origen === 'app' && !p.id_reserva && Boolean(p.external_reference || p.payu_order_id);
export function estadoContabilizable(p) {
    if (!esPedidoEcommerce(p) || !pagoConfirmadoPedido(p) || p.estado_reembolso === 'pendiente_verificacion' || !esTipoEntregaValido(p.tipo_entrega)) return null;
    const estado = normalizarEstadoEntrega(p.estado_entrega);
    if (estado === 'listo_recojo' && p.tipo_entrega !== 'tienda' || estado === 'en_camino' && p.tipo_entrega !== 'domicilio') return null;
    return ['pendiente', 'listo_recojo', 'en_camino', 'entregado'].includes(estado) ? estado : null;
}
export function resumirPedidos(pedidos) {
    const conteos = { pendiente: 0, listo_recojo: 0, en_camino: 0, entregado: 0 }, vistos = new Set();
    for (const p of pedidos) {
        if (p?.id_venta == null || vistos.has(String(p.id_venta))) continue;
        vistos.add(String(p.id_venta));
        const estado = estadoContabilizable(p);
        if (estado) conteos[estado]++;
    }
    const total = Object.values(conteos).reduce((s, n) => s + n, 0);
    const partes = Object.entries(conteos).map(([estado, cantidad], orden) => {
        const exacto = total ? cantidad * 1000 / total : 0;
        return { estado, orden, unidades: Math.floor(exacto), resto: exacto - Math.floor(exacto) };
    });
    let faltan = total ? 1000 - partes.reduce((s, p) => s + p.unidades, 0) : 0;
    for (const parte of [...partes].sort((a, b) => b.resto - a.resto || a.orden - b.orden)) if (faltan-- > 0) parte.unidades++;
    return { total, conteos, porcentajes: Object.fromEntries(partes.map(p => [p.estado, p.unidades / 10])) };
}
