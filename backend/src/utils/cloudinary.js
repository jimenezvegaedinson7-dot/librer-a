const crypto = require('crypto');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const configurado = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

const firmar = (params) => {
    const claves = Object.keys(params).sort();
    const cadena = claves.map((clave) => `${clave}=${params[clave]}`).join('&');

    return crypto
        .createHash('sha1')
        .update(cadena + API_SECRET)
        .digest('hex');
};

const subirImagen = async (buffer, { carpeta = 'libreria' } = {}) => {
    if (!configurado) {
        throw new Error('Cloudinary no está configurado');
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const params = { folder: carpeta, timestamp };

    const body = new FormData();
    body.append('file', new Blob([buffer]), 'imagen');
    body.append('folder', carpeta);
    body.append('timestamp', String(timestamp));
    body.append('api_key', API_KEY);
    body.append('signature', firmar(params));

    const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body });

    const json = await respuesta.json().catch(() => null);

    if (!respuesta.ok || !json || !json.secure_url) {
        throw new Error(json?.error?.message || 'Error al subir imagen a Cloudinary');
    }

    return { url: json.secure_url, publicId: json.public_id };
};

const subirVideo = async (buffer, { carpeta = 'libreria' } = {}) => {
    if (!configurado) {
        throw new Error('Cloudinary no está configurado');
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const params = { folder: carpeta, timestamp };

    const body = new FormData();
    body.append('file', new Blob([buffer]), 'video');
    body.append('folder', carpeta);
    body.append('timestamp', String(timestamp));
    body.append('api_key', API_KEY);
    body.append('signature', firmar(params));

    const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, { method: 'POST', body });

    const json = await respuesta.json().catch(() => null);

    if (!respuesta.ok || !json || !json.secure_url) {
        throw new Error(json?.error?.message || 'Error al subir el video a Cloudinary');
    }

    return { url: json.secure_url, publicId: json.public_id };
};

const eliminarRecurso = async (publicId, tipo = 'image') => {
    if (!configurado) {
        return false;
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const params = { public_id: publicId, timestamp };

    const body = new FormData();
    body.append('public_id', publicId);
    body.append('timestamp', String(timestamp));
    body.append('api_key', API_KEY);
    body.append('signature', firmar(params));

    const recurso = ['video', 'raw'].includes(tipo) ? tipo : 'image';
    const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${recurso}/destroy`, { method: 'POST', body });

    const json = await respuesta.json().catch(() => null);

    return json?.result === 'ok';
};

const eliminarImagen = (publicId) => eliminarRecurso(publicId, 'image');

const publicIdDesdeUrl = (url) => {
    if (!url || !url.includes('res.cloudinary.com')) {
        return null;
    }

    const recurso = '(image|video|raw)';

    const versionado = url.match(new RegExp(`/${recurso}/upload/v\\d+/(.+)$`));

    if (versionado) {
        return versionado[1].replace(/\.[a-z0-9]+$/i, '');
    }

    const directo = url.match(new RegExp(`/${recurso}/upload/(.+)$`));

    if (directo) {
        return directo[1].replace(/\.[a-z0-9]+$/i, '');
    }

    return null;
};

const tipoDesdeUrl = (url) => {
    if (!url || !url.includes('res.cloudinary.com')) {
        return null;
    }

    const encontrado = url.match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\//);

    return encontrado ? encontrado[1] : null;
};

module.exports = { subirImagen, subirVideo, eliminarImagen, eliminarRecurso, publicIdDesdeUrl, tipoDesdeUrl, configurado };
