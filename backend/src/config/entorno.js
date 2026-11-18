function cargarEntorno() {
    require('dotenv').config();

    const clave2FA = process.env.TWO_FACTOR_ENCRYPTION_KEY;
    if (!clave2FA || String(clave2FA).length < 16) {
        throw new Error('TWO_FACTOR_ENCRYPTION_KEY debe existir y tener al menos 16 caracteres');
    }
}

module.exports = { cargarEntorno };
