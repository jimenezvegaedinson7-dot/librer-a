const CULQI_SECRET_KEY = process.env.CULQI_SECRET_KEY;

const cliente = CULQI_SECRET_KEY
    ? { secretKey: CULQI_SECRET_KEY }
    : null;

if (!cliente) {
    console.warn(
        '[culqi] CULQI_SECRET_KEY no configurado. El pago real estará deshabilitado.'
    );
}

module.exports = { cliente };