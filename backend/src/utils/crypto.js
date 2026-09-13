const crypto = require('crypto');

// ========================================
// CIFRADO/DESCIFRADO PARA 2FA
// ========================================
// Protege el secreto TOTP antes de guardarlo
// en MySQL. Usa la clave TWO_FACTOR_ENCRYPTION_KEY
// desde el .env (NO hardcodeada).
//
// FAIL-SECURE: si la clave falta o el cifrado/
// descifrado falla, lanza una excepción en lugar de
// guardar/devolver el texto sin cifrar.
// ========================================

const getClave = () => {
    const clave =
        process.env.TWO_FACTOR_ENCRYPTION_KEY;

    if (!clave) {
        throw new Error(
            'TWO_FACTOR_ENCRYPTION_KEY no está configurada'
        );
    }

    // Normalizar a 32 bytes (256 bits)
    return crypto
        .createHash('sha256')
        .update(String(clave))
        .digest('base64')
        .slice(0, 32);
};

// ========================================
// CIFRAR TEXTO
// ========================================
const cifrar = (texto) => {
    if (!texto) {
        return texto;
    }

    const clave = getClave();

    try {
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(
            'aes-256-cbc',
            Buffer.from(clave, 'utf8'),
            iv
        );

        let cifrado = cipher.update(
            texto,
            'utf8',
            'hex'
        );

        cifrado += cipher.final('hex');

        return `${iv.toString('hex')}:${cifrado}`;
    } catch (error) {
        throw new Error(
            `Error al cifrar el secreto 2FA: ${error.message}`
        );
    }
};

// ========================================
// DESCIFRAR TEXTO
// ========================================
const descifrar = (textoCifrado) => {
    if (!textoCifrado) {
        return textoCifrado;
    }

    const clave = getClave();

    try {
        const partes =
            String(textoCifrado).split(':');

        if (partes.length !== 2) {
            throw new Error(
                'Formato de secreto cifrado inválido'
            );
        }

        const iv = Buffer.from(
            partes[0],
            'hex'
        );

        const decipher =
            crypto.createDecipheriv(
                'aes-256-cbc',
                Buffer.from(clave, 'utf8'),
                iv
            );

        let descifrado =
            decipher.update(
                partes[1],
                'hex',
                'utf8'
            );

        descifrado +=
            decipher.final('utf8');

        return descifrado;
    } catch (error) {
        throw new Error(
            `Error al descifrar el secreto 2FA: ${error.message}`
        );
    }
};

module.exports = {
    cifrar,
    descifrar
};