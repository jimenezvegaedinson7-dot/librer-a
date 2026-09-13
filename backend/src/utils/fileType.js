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

module.exports = {
    detectarImagen
};