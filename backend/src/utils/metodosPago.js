// ========================================
// MÉTODOS DE COBRO EN TIENDA
// ========================================
// Ventas de mostrador y reservas recogidas se cobran en el momento, por
// uno de estos medios. Los pedidos de la app se cobran con PayU.
// ========================================

const METODOS_PAGO_TIENDA = {
    efectivo: 'Efectivo',
    yape: 'Yape',
    plin: 'Plin',
    tarjeta: 'Tarjeta (POS)',
    transferencia: 'Transferencia'
};

// Valida `metodo_pago` y `referencia_pago` del cuerpo de la solicitud.
// Devuelve { ok, metodo, referencia } o { ok: false, mensaje }.
const validarCobroTienda = (metodoPago, referenciaPago) => {
    const metodo =
        typeof metodoPago === 'string'
            ? metodoPago.trim().toLowerCase()
            : '';

    if (!Object.prototype.hasOwnProperty.call(METODOS_PAGO_TIENDA, metodo)) {
        return {
            ok: false,
            mensaje: `Indica el método de pago: ${Object.values(METODOS_PAGO_TIENDA).join(', ')}`
        };
    }

    const referencia =
        typeof referenciaPago === 'string'
            ? referenciaPago.trim()
            : '';

    if (referencia.length > 100) {
        return {
            ok: false,
            mensaje: 'La referencia del pago no puede superar los 100 caracteres'
        };
    }

    return {
        ok: true,
        metodo,
        referencia: referencia || null
    };
};

module.exports = {
    METODOS_PAGO_TIENDA,
    validarCobroTienda
};
