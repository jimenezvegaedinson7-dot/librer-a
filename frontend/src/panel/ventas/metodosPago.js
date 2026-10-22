
// Etiquetas exclusivamente históricas: no alimentan selectores de cobro.
const METODOS_PAGO_HISTORICOS = [
    { valor: 'efectivo', texto: 'Efectivo' },
    { valor: 'yape', texto: 'Yape' },
    { valor: 'plin', texto: 'Plin' },
    { valor: 'tarjeta', texto: 'Tarjeta (POS)' },
    { valor: 'transferencia', texto: 'Transferencia' },
    { valor: 'payu', texto: 'PayU (pago en línea)' },
];

export const textoMetodoPago = (valor) =>
    METODOS_PAGO_HISTORICOS.find((m) => m.valor === valor)?.texto || (valor ? String(valor) : '');

// Los vínculos antiguos solo identifican ventas históricas de solo lectura.
export const textoOrigen = (venta) => {
    if (venta?.origen === 'panel') return 'Mostrador';
    if (venta?.origen === 'reserva' || venta?.id_reserva) return 'Venta histórica';
    if (venta?.canal_compra === 'web') return 'Web (PayU)';
    return 'App (PayU)';
};
