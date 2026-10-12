// Los identificadores se leen de la venta bajo bloqueo, nunca del formulario.
const tienePagoPayU = venta => venta?.origen === 'app' && !venta.id_reserva && venta.metodo_pago === 'payu' &&
    ['external_reference', 'payu_order_id', 'payu_payment_id'].every(campo =>
        typeof venta[campo] === 'string' && venta[campo].trim().length > 0);
const esReembolsoElegible = venta => tienePagoPayU(venta) && venta.estado !== 'reembolsada' &&
    venta.estado_reembolso !== 'confirmado' && ['APPROVED', 'CAPTURED', 'REFUNDED', 'CHARGED_BACK'].includes(venta.payu_payment_status) &&
    (['pagada', 'entregada'].includes(venta.estado) ||
        (venta.estado === 'cancelada' && venta.pago_revision_motivo === 'aprobacion_tardia'));
// Una reversión conocida sigue en revisión hasta su cierre documental, incluso
// en filas anteriores que no tengan motivo. Una devolución ya cerrada no revive.
const requiereRevisionPago = venta => Boolean(venta?.pago_revision_motivo) ||
    (venta?.estado !== 'reembolsada' && venta?.estado_reembolso !== 'confirmado' &&
        ['REFUNDED', 'CHARGED_BACK'].includes(venta?.payu_payment_status));
module.exports = { tienePagoPayU, esReembolsoElegible, requiereRevisionPago };
