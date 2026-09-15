// ============================================================
// CLOUDINARY
// ============================================================
// Sube y elimina imágenes usando la API REST de Cloudinary
// (upload + destroy) con firmas SHA-1. No requiere SDK:
// usa fetch/FormData/Blob nativos de Node >= 20.
//
// Si no hay credenciales configuradas, `configurado` es false
// y el sistema sigue usando el disco local como respaldo.
// ============================================================

const crypto = require('crypto');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const configurado = Boolean(
    CLOUD_NAME &&
    API_KEY &&
    API_SECRET
);

// ========================================
// FIRMA (SHA-1 sobre params ordenados)
// ========================================
const firmar = (params) => {
    const claves = Object.keys(params).sort();
    const cadena = claves
        .map((clave) => `${clave}=${params[clave]}`)
        .join('&');

    return crypto
        .createHash('sha1')
        .update(cadena + API_SECRET)
        .digest('hex');
};

// ========================================
// SUBIR IMAGEN
// Devuelve { url, publicId } o lanza error.
// ========================================
const subirImagen = async (
    buffer,
    { carpeta = 'libreria' } = {}
) => {
    if (!configurado) {
        throw new Error(
            'Cloudinary no está configurado'
        );
    }

    const timestamp =
        Math.floor(Date.now() / 1000);

    const params = {
        folder: carpeta,
        timestamp
    };

    const body = new FormData();
    body.append(
        'file',
        new Blob([buffer]),
        'imagen'
    );
    body.append('folder', carpeta);
    body.append('timestamp', String(timestamp));
    body.append('api_key', API_KEY);
    body.append(
        'signature',
        firmar(params)
    );

    const respuesta =
        await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body
            }
        );

    const json =
        await respuesta
            .json()
            .catch(() => null);

    if (
        !respuesta.ok ||
        !json ||
        !json.secure_url
    ) {
        throw new Error(
            json?.error?.message ||
            'Error al subir imagen a Cloudinary'
        );
    }

    return {
        url: json.secure_url,
        publicId: json.public_id
    };
};

// ========================================
// ELIMINAR IMAGEN POR PUBLIC_ID
// ========================================
const eliminarImagen = async (
    publicId
) => {
    if (!configurado) {
        return false;
    }

    const timestamp =
        Math.floor(Date.now() / 1000);

    const params = {
        public_id: publicId,
        timestamp
    };

    const body = new FormData();
    body.append('public_id', publicId);
    body.append('timestamp', String(timestamp));
    body.append('api_key', API_KEY);
    body.append(
        'signature',
        firmar(params)
    );

    const respuesta =
        await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
            {
                method: 'POST',
                body
            }
        );

    const json =
        await respuesta
            .json()
            .catch(() => null);

    return json?.result === 'ok';
};

// ========================================
// EXTRAER PUBLIC_ID DESDE UNA URL
// de https://res.cloudinary.com/<cloud>/
// image/upload/v<version>/<public_id>
// ========================================
const publicIdDesdeUrl = (url) => {
    if (
        !url ||
        !url.includes('res.cloudinary.com')
    ) {
        return null;
    }

    const versionado =
        url.match(
            /\/image\/upload\/v\d+\/(.+)$/
        );

    if (versionado) {
        return versionado[1].replace(
            /\.[a-z0-9]+$/i,
            ''
        );
    }

    const directo =
        url.match(
            /\/image\/upload\/(.+)$/
        );

    if (directo) {
        return directo[1].replace(
            /\.[a-z0-9]+$/i,
            ''
        );
    }

    return null;
};

module.exports = {
    subirImagen,
    eliminarImagen,
    publicIdDesdeUrl,
    configurado
};