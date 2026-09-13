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

const cliente = PAYU_CONFIG.apiLogin && PAYU_CONFIG.apiKey
    ? PAYU_CONFIG
    : null;

if (!cliente) {
    console.warn(
        '[payu] Credenciales PayU no configuradas. El pago real estará deshabilitado.'
    );
}

module.exports = { cliente: PAYU_CONFIG, PAYU_API_BASE };