const detectarImagen = (buffer) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        return null;
    }

    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { tipo: 'image/jpeg', extension: '.jpg' };
    }

    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return { tipo: 'image/png', extension: '.png' };
    }

    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return { tipo: 'image/webp', extension: '.webp' };
    }

    return null;
};

const detectarVideo = (buffer) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        return null;
    }

    if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
        const marca = buffer.toString('ascii', 8, 12).trim();

        const marcasIso = ['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'dash', 'mmp4', 'M4V', 'f4v', '3gp4', '3gp5', '3gp6'];

        if (marcasIso.includes(marca) || /^qt/.test(marca)) {
            return { tipo: /^qt/.test(marca) ? 'video/quicktime' : 'video/mp4', extension: /^qt/.test(marca) ? '.mov' : '.mp4' };
        }
    }

    if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
        return { tipo: 'video/webm', extension: '.webm' };
    }

    return null;
};

module.exports = { detectarImagen, detectarVideo };
