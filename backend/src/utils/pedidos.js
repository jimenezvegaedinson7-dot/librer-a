const { normalizarEstadoEntrega, esTipoEntregaValido, esVentaHistorica } = require('./transiciones');
const { requiereRevisionPago } = require('./devoluciones');

const esPedidoEcommerce = venta => venta?.origen === 'app' && !esVentaHistorica(venta) &&
    Boolean(venta.external_reference || venta.payu_order_id);
const pagoConfirmadoPedido = venta => ['pagada', 'entregada'].includes(venta?.estado) &&
    (!venta.payu_payment_status || ['APPROVED', 'CAPTURED'].includes(venta.payu_payment_status)) &&
    venta.requiere_revision !== true && !requiereRevisionPago(venta) && venta.estado_reembolso !== 'confirmado';
const estadoContabilizable = venta => {
    if (!esPedidoEcommerce(venta) || !pagoConfirmadoPedido(venta) || venta.estado_reembolso === 'pendiente_verificacion' || !esTipoEntregaValido(venta.tipo_entrega)) return null;
    const estado = normalizarEstadoEntrega(venta.estado_entrega);
    if (estado === 'listo_recojo' && venta.tipo_entrega !== 'tienda' || estado === 'en_camino' && venta.tipo_entrega !== 'domicilio') return null;
    return ['pendiente', 'listo_recojo', 'en_camino', 'entregado'].includes(estado) ? estado : null;
};

// Una sola categoría por ID. Denominador: pedidos ecommerce pagados vigentes,
// con logística compatible; excluye cancelaciones, reembolsos y revisiones.
function resumirPedidos(pedidos) {
    const conteos = { pendiente: 0, listo_recojo: 0, en_camino: 0, entregado: 0 };
    const vistos = new Set();
    for (const pedido of pedidos) {
        if (pedido?.id_venta == null) continue;
        const id = String(pedido.id_venta);
        if (vistos.has(id)) continue;
        vistos.add(id);
        const estado = estadoContabilizable(pedido);
        if (estado) conteos[estado]++;
    }
    const total = Object.values(conteos).reduce((s, n) => s + n, 0);
    const partes = Object.entries(conteos).map(([estado, cantidad], orden) => {
        const exacto = total ? cantidad * 1000 / total : 0;
        return { estado, orden, unidades: Math.floor(exacto), resto: exacto - Math.floor(exacto) };
    });
    let faltan = total ? 1000 - partes.reduce((s, p) => s + p.unidades, 0) : 0;
    for (const parte of [...partes].sort((a, b) => b.resto - a.resto || a.orden - b.orden)) if (faltan-- > 0) parte.unidades++;
    return { total, conteos, porcentajes: Object.fromEntries(partes.map(p => [p.estado, p.unidades / 10])),
        criterio: 'Pedidos ecommerce pagados y vigentes, sin cancelación, reembolso ni revisión; distribución exclusiva por estado logístico.' };
}
module.exports = { esPedidoEcommerce, pagoConfirmadoPedido, estadoContabilizable, resumirPedidos };
