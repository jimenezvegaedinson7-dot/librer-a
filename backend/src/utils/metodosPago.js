// Etiquetas para lectura histórica exclusivamente. No autorizan cobros.
const METODOS_PAGO_TIENDA = {
    efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin',
    tarjeta: 'Tarjeta (POS)', transferencia: 'Transferencia'
};
const validarCobroTienda = () => ({ ok: false,
    mensaje: 'Los cobros manuales están retirados. Solo se admite el flujo PayU.' });
module.exports = { METODOS_PAGO_TIENDA, validarCobroTienda };
