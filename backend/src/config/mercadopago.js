const { MercadoPagoConfig } = require('mercadopago');

const accessToken =
    process.env.MERCADOPAGO_ACCESS_TOKEN;

const cliente = accessToken
    ? new MercadoPagoConfig({ accessToken })
    : null;

if (!cliente) {
    console.warn(
        '[mercadopago] MERCADOPAGO_ACCESS_TOKEN no configurado. El pago real estará deshabilitado.'
    );
}

module.exports = { cliente };
