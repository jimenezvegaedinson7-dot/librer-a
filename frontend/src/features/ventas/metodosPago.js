
// Etiquetas exclusivamente históricas: no alimentan selectores de cobro.
const METODOS_PAGO_HISTORICOS = [
    { valor: 'efectivo', texto: 'Efectivo' },
    { valor: 'yape', texto: 'Yape' },
    { valor: 'plin', texto: 'Plin' },
    { valor: 'tarjeta', texto: 'Tarjeta (POS)' },
    { valor: 'transferencia', texto: 'Transferencia' },
];

export const textoMetodoPago = (valor) =>
    METODOS_PAGO_HISTORICOS.find((m) => m.valor === valor)?.texto || (valor ? String(valor) : '');

// De dónde viene la venta: pedido de la app (PayU), mostrador o reserva.
export const textoOrigen = (venta) => {
    if (venta?.origen === 'panel') return 'Mostrador';
    if (venta?.origen === 'reserva') return venta?.id_reserva ? `Reserva #${venta.id_reserva}` : 'Reserva';
    if (venta?.canal_compra === 'web') return 'Web (PayU)';
    return 'App (PayU)';
};
