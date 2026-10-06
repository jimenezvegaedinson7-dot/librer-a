// Los identificadores se leen de la venta bajo bloqueo, nunca del formulario.
const tienePagoPayU = venta => venta?.origen === 'app' && !venta.id_reserva && venta.metodo_pago === 'payu' &&
    ['external_reference', 'payu_order_id', 'payu_payment_id'].every(campo =>
        typeof venta[campo] === 'string' && venta[campo].trim().length > 0);
const esReembolsoElegible = venta => tienePagoPayU(venta) && venta.estado !== 'reembolsada' &&
    venta.estado_reembolso !== 'confirmado' && ['APPROVED', 'CAPTURED', 'REFUNDED'].includes(venta.payu_payment_status) &&
    (['pagada', 'entregada'].includes(venta.estado) ||
        (venta.estado === 'cancelada' && venta.pago_revision_motivo === 'aprobacion_tardia'));
module.exports = { tienePagoPayU, esReembolsoElegible };
