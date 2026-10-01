// ============================================================
// DETECCIÓN DE TIPO DE IMAGEN POR MAGIC BYTES
// ============================================================
// No confía en el mimetype ni en la extensión del archivo
// original: valida el contenido real del buffer.
// Soporta: JPEG, PNG y WebP.
// ============================================================

// ========================================
// DETECTAR IMAGEN
// Devuelve { tipo, extension } o null si no es imagen.
// ========================================
const detectarImagen = (buffer) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        return null;
    }

    // JPEG: FF D8 FF
    if (
        buffer.length >= 3 &&
        buffer[0] === 0xFF &&
        buffer[1] === 0xD8 &&
        buffer[2] === 0xFF
    ) {
        return {
            tipo: 'image/jpeg',
            extension: '.jpg'
        };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4E &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0D &&
        buffer[5] === 0x0A &&
        buffer[6] === 0x1A &&
        buffer[7] === 0x0A
    ) {
        return {
            tipo: 'image/png',
            extension: '.png'
        };
    }

    // WebP: 'RIFF' + tamaño + 'WEBP'
    if (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return {
            tipo: 'image/webp',
            extension: '.webp'
        };
    }

    return null;
};

// ========================================
// DETECTAR VIDEO POR MAGIC BYTES
// No confía en el mimetype ni en la extensión: valida el
// contenido real del buffer, como con las imágenes.
//
// MP4 y MOV shareen el mismo contenedor ISO-BMFF: en los bytes 4..8
// está la caja 'ftyp' y detrás el brand (isom, mp42, qt, M4V...).
// Por eso se aceptan juntos y se distinguen por la extensión.
//
// WebM y MKV son EBML: empiezan con 1A 45 DF A3.
// ========================================
const detectarVideo = (buffer) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        return null;
    }

    // MP4 / MOV: caja 'ftyp' en el offset 4
    if (
        buffer.length >= 12 &&
        buffer.toString('ascii', 4, 8) === 'ftyp'
    ) {
        // Las marcas miden 4 bytes y algunas llevan espacios al final
        // ('M4V ', 'qt  '): se comparan recortadas.
        const marca =
            buffer.toString('ascii', 8, 12).trim();

        const marcasIso =
            [
                'isom', 'iso2', 'iso4', 'iso5',
                'iso6', 'mp41', 'mp42', 'avc1',
                'dash', 'mmp4', 'M4V', 'f4v',
                '3gp4', '3gp5', '3gp6'
            ];

        // Los MOV de Apple siguen siendo ftyp con brand 'qt  '.
        if (
            marcasIso.includes(marca) ||
            /^qt/.test(marca)
        ) {
            return {
                tipo: /^qt/.test(marca)
                    ? 'video/quicktime'
                    : 'video/mp4',
                extension: /^qt/.test(marca)
                    ? '.mov'
                    : '.mp4'
            };
        }
    }

    // WebM / MKV: cabecera EBML
    if (
        buffer.length >= 4 &&
        buffer[0] === 0x1A &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xDF &&
        buffer[3] === 0xA3
    ) {
        return {
            tipo: 'video/webm',
            extension: '.webm'
        };
    }

    return null;
};

module.exports = {
    detectarImagen,
    detectarVideo
};