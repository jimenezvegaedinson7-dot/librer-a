const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { detectarVideo } = require('../utils/fileType');
const { subirVideo, eliminarRecurso, configurado: cloudinaryConfigurado } = require('../utils/cloudinary');

const carpetaVideos = path.join(__dirname, '../../uploads/videos');
const LIMITE_MB = 50;
const LIMITE_BYTES = LIMITE_MB * 1024 * 1024;
const MENS_AJENO = 'El archivo no es un video válido. Sube un MP4, WebM o MOV.';

const fileFilter = (req, file, cb) => {
    const permitidos = ['video/mp4', 'video/webm', 'video/quicktime'];

    if (permitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(MENS_AJENO), false);
    }
};

const uploadBase = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: LIMITE_BYTES } });

const manejarErrorDeSubida = (subir) => (req, res, next) => {
    subir(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ success: false, mensaje: `El video no puede superar los ${LIMITE_MB} MB` });
        }

        if (error.message === MENS_AJENO) {
            return res.status(400).json({ success: false, mensaje: MENS_AJENO });
        }

        console.error('[videos] Error de subida:', error.message);

        return res.status(500).json({ success: false, mensaje: 'No se pudo procesar el video' });
    });
};

const vigilarError = (req, res) => {
    if (req._vigilandoRespuesta) {
        return;
    }

    req._vigilandoRespuesta = true;

    res.on('finish', () => {
        if (res.statusCode < 400 || !req.file) {
            return;
        }

        const { publicId, filename } = req.file;

        if (publicId) {
            eliminarRecurso(publicId, 'video').catch((error) => console.error('[videos] No se pudo revertir la subida en Cloudinary:', error.message));
            return;
        }

        if (filename) {
            try {
                fs.unlinkSync(path.join(carpetaVideos, filename));
            } catch (error) {
                console.error('[videos] No se pudo revertir la subida local:', error.message);
            }
        }
    });
};

const validarYSubir = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        const detectado = detectarVideo(req.file.buffer);

        if (!detectado) {
            return res.status(400).json({ success: false, mensaje: MENS_AJENO });
        }

        const esMov = detectado.tipo === 'video/quicktime';

        if (esMov && !cloudinaryConfigurado) {
            return res.status(400).json({ success: false, mensaje: 'Los videos MOV necesitan Cloudinary para convertirse a MP4. Sube un MP4 o un WebM.' });
        }

        if (cloudinaryConfigurado) {
            const resultado = await subirVideo(req.file.buffer, { carpeta: 'libreria/videos' });

            req.file.cloudinaryUrl = esMov ? resultado.url.replace(/\.mov$/i, '.mp4') : resultado.url;
            req.file.publicId = resultado.publicId;
        } else {
            fs.mkdirSync(carpetaVideos, { recursive: true });

            const nombreArchivo = `anuncio-${Date.now()}-${Math.round(Math.random() * 1e9)}${detectado.extension}`;

            fs.writeFileSync(path.join(carpetaVideos, nombreArchivo), req.file.buffer);

            req.file.filename = nombreArchivo;
            req.file.path = path.join(carpetaVideos, nombreArchivo);
        }

        vigilarError(req, res);

        return next();
    } catch (error) {
        const esLimite = error?.code === 'LIMIT_FILE_SIZE';

        return res.status(esLimite ? 413 : 500).json({ success: false, mensaje: esLimite ? `El video no puede superar los ${LIMITE_MB} MB` : 'No se pudo procesar el video' });
    }
};

const uploadVideo = { single: (nombreCampo) => [manejarErrorDeSubida(uploadBase.single(nombreCampo)), validarYSubir] };

module.exports = uploadVideo;
module.exports.LIMITE_MB = LIMITE_MB;
module.exports.MENS_AJENO = MENS_AJENO;

module.exports.carpetaVideos = carpetaVideos;
