const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { detectarVideo } = require('../utils/fileType');
const {
    subirVideo,
    eliminarRecurso,
    configurado: cloudinaryConfigurado
} = require('../utils/cloudinary');

// ========================================
// SUBIDA DE VIDEOS DE PUBLICIDAD
//
// Va aparte de upload.middleware.js a propósito: los videos pesan
// mucho más que una portada, van a un endpoint distinto de
// Cloudinary (video/upload) y borrarlos usa otro resource_type.
// Mezclarlos en un solo middleware obligaría a que cada campo
// importara el límite del otro.
// ========================================

const carpetaVideos = path.join(
    __dirname,
    '../../uploads/videos'
);

if (!fs.existsSync(carpetaVideos)) {
    fs.mkdirSync(carpetaVideos, {
        recursive: true
    });
}

// 50 MB: suficiente para un anuncio corto en 1080p y por debajo
// del límite de la API de Cloudinary para el plan gratuito.
const LIMITE_MB = 50;
const LIMITE_BYTES = LIMITE_MB * 1024 * 1024;

const MENS_AJENO =
    'El archivo no es un video válido. Sube un MP4, WebM o MOV.';

// El fileFilter rechaza con el error ya redactado; manejarErrorDeSubida lo
// traduce a un 400. Si se limitara a cb(null, false), multer dejaria pasar
// la peticion sin archivo y el controlador responderia "debes subir un
// video", que no dice que el archivo que subio no era un video.
const fileFilter = (req, file, cb) => {
    const permitidos = [
        'video/mp4',
        'video/webm',
        'video/quicktime'
    ];

    if (permitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(MENS_AJENO), false);
    }
};

const uploadBase = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: LIMITE_BYTES
    }
});

// ========================================
// ERRORES DE MULTER
//
// multer no responde: llama a next(error) y, si nadie lo intercepta, el
// manejador global devuelve un 500 "Error interno del servidor". Eso
// convierte "subiste un .txt" en un error de servidor, y deja al admin
// sin saber que cambiar. Este envoltorio traduce cada caso a su
// codigo y su mensaje.
// ========================================
const manejarErrorDeSubida = (subir) => (req, res, next) => {
    subir(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                mensaje: `El video no puede superar los ${LIMITE_MB} MB`
            });
        }

        // El unico error propio es el del fileFilter, que ya trae su
        // mensaje. Cualquier otro se loguea y se responde generico.
        if (error.message === MENS_AJENO) {
            return res.status(400).json({
                success: false,
                mensaje: MENS_AJENO
            });
        }

        console.error('[videos] Error de subida:', error.message);

        return res.status(500).json({
            success: false,
            mensaje: 'No se pudo procesar el video'
        });
    });
};

// ========================================
// DESHACER UNA SUBIDA QUE TERMINO EN ERROR
//
// El archivo se sube antes de que el controlador valide el resto (titulo,
// estado). Si esa validacion falla, el archivo ya esta en disco o en
// Cloudinary y no lo referencia nadie: 50 MB de disco, o cuota de
// Cloudinary, por una peticion que el navegador rechazo.
//
// Se vigila el cierre de la respuesta: si el controlador termino
// responding con error, se deshace lo que se subio. Es la unica forma de
// cubrir todas las salidas tempranas sin repetir la limpieza en cada una.
// ========================================
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
            eliminarRecurso(publicId, 'video').catch((error) =>
                console.error(
                    '[videos] No se pudo revertir la subida en Cloudinary:',
                    error.message
                )
            );
            return;
        }

        if (filename) {
            try {
                fs.unlinkSync(path.join(carpetaVideos, filename));
            } catch (error) {
                console.error(
                    '[videos] No se pudo revertir la subida local:',
                    error.message
                );
            }
        }
    });
};

// ========================================
// VALIDAR CONTENIDO REAL Y SUBIR
// El mimetype lo declara el navegador y se puede falsear, así que
// además de fileFilter se leen los magic bytes del buffer.
// ========================================
const validarYSubir = async (
    req,
    res,
    next
) => {
    try {
        if (!req.file) {
            return next();
        }

        const detectado = detectarVideo(
            req.file.buffer
        );

        if (!detectado) {
            return res.status(400).json({
                success: false,
                mensaje: MENS_AJENO
            });
        }

        const esMov = detectado.tipo === 'video/quicktime';

        if (esMov && !cloudinaryConfigurado) {
            return res.status(400).json({
                success: false,
                mensaje: 'Los videos MOV necesitan Cloudinary para convertirse a MP4. Sube un MP4 o un WebM.'
            });
        }

        if (cloudinaryConfigurado) {
            const resultado = await subirVideo(
                req.file.buffer,
                { carpeta: 'libreria/videos' }
            );

            // Un MOV (iPhone) se entrega como MP4: Cloudinary lo convierte
            // al pedir la misma URL con extensión .mp4, y así se reproduce
            // en cualquier navegador.
            req.file.cloudinaryUrl = esMov
                ? resultado.url.replace(/\.mov$/i, '.mp4')
                : resultado.url;
            req.file.publicId = resultado.publicId;
        } else {
            // Fallback local para desarrollo.
            const nombreArchivo =
                `anuncio-${Date.now()}-${Math.round(
                    Math.random() * 1E9
                )}${detectado.extension}`;

            fs.writeFileSync(
                path.join(carpetaVideos, nombreArchivo),
                req.file.buffer
            );

            req.file.filename = nombreArchivo;
            req.file.path = path.join(
                carpetaVideos,
                nombreArchivo
            );
        }

        vigilarError(req, res);

        return next();
    } catch (error) {
        const esLimite =
            error?.code === 'LIMIT_FILE_SIZE';

        return res.status(esLimite ? 413 : 500).json({
            success: false,
            mensaje: esLimite
                ? `El video no puede superar los ${LIMITE_MB} MB`
                : 'No se pudo procesar el video'
        });
    }
};

const uploadVideo = {
    single: (nombreCampo) => [
        manejarErrorDeSubida(
            uploadBase.single(nombreCampo)
        ),
        validarYSubir
    ]
};

module.exports = uploadVideo;
module.exports.LIMITE_MB = LIMITE_MB;
module.exports.MENS_AJENO = MENS_AJENO;
// Se exporta para que el controlador borre el archivo del disco cuando se
// reemplaza un anuncio, en vez de tener la ruta escrita en dos sitios.
module.exports.carpetaVideos = carpetaVideos;
