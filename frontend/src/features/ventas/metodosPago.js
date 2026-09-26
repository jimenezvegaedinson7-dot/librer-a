
// Medios de cobro en tienda (ventas de mostrador y reservas recogidas).
// Los pedidos de la app se cobran con PayU. Mismo listado que el backend
// (backend/src/utils/metodosPago.js).
export const METODOS_PAGO = [
    { valor: 'efectivo', texto: 'Efectivo' },
    { valor: 'yape', texto: 'Yape' },
    { valor: 'plin', texto: 'Plin' },
    { valor: 'tarjeta', texto: 'Tarjeta (POS)' },
    { valor: 'transferencia', texto: 'Transferencia' },
];

export const textoMetodoPago = (valor) =>
    METODOS_PAGO.find((m) => m.valor === valor)?.texto || (valor ? String(valor) : '');

// De dónde viene la venta: pedido de la app (PayU), mostrador o reserva.
export const textoOrigen = (venta) => {
    if (venta?.origen === 'panel') return 'Mostrador';
    if (venta?.origen === 'reserva') return venta?.id_reserva ? `Reserva #${venta.id_reserva}` : 'Reserva';
    return 'App (PayU)';
};
