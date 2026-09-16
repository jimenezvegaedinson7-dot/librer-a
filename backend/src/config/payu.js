const PAYU_CONFIG = {
    accountId: process.env.PAYU_ACCOUNT_ID,
    merchantId: process.env.PAYU_MERCHANT_ID,
    apiLogin: process.env.PAYU_API_LOGIN,
    apiKey: process.env.PAYU_API_KEY,
    publicKey: process.env.PAYU_PUBLIC_KEY,
    test: process.env.PAYU_TEST === 'true'
};

const PAYU_API_BASE = PAYU_CONFIG.test
    ? 'https://sandbox.api.payulatam.com'
    : 'https://api.payulatam.com';

// Gateway de WebCheckout (formulario hospedado en PayU).
const PAYU_CHECKOUT_BASE = PAYU_CONFIG.test
    ? 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/'
    : 'https://checkout.payulatam.com/ppp-web-gateway-payu/';

// URL pública del backend (para construir las URL del checkout propio y de
// retorno). Fallback al origin de PAYU_NOTIFICATION_URL o localhost.
let PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || null;

if (!PUBLIC_BASE_URL && process.env.PAYU_NOTIFICATION_URL) {
    try {
        PUBLIC_BASE_URL =
            new URL(process.env.PAYU_NOTIFICATION_URL).origin;
    } catch (_) {
        PUBLIC_BASE_URL = null;
    }
}

PUBLIC_BASE_URL = PUBLIC_BASE_URL || 'http://localhost:3000';

const cliente = PAYU_CONFIG.apiLogin && PAYU_CONFIG.apiKey
    ? PAYU_CONFIG
    : null;

if (!cliente) {
    console.warn(
        '[payu] Credenciales PayU no configuradas. El pago real estará deshabilitado.'
    );
}

module.exports = {
    cliente: PAYU_CONFIG,
    PAYU_API_BASE,
    PAYU_CHECKOUT_BASE,
    PUBLIC_BASE_URL
};