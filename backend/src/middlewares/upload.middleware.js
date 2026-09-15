const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { detectarImagen } = require('../utils/fileType');
const {
    subirImagen,
    configurado: cloudinaryConfigurado
} = require('../utils/cloudinary');

const carpetaPortadas = path.join(
    __dirname,
    '../../uploads/portadas'
);

if (!fs.existsSync(carpetaPortadas)) {
    fs.mkdirSync(carpetaPortadas, {
        recursive: true
    });
}

const fileFilter = (req, file, cb) => {
    const tiposPermitidos = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                'Solo se permiten imágenes JPG, PNG o WEBP'
            ),
            false
        );
    }
};

// ========================================
// SE USA MEMORIA: la imagen se sube a
// Cloudinary (o se escribe en disco si no
// hay credenciales). Nada queda en el
// disco efímero de Render en producción.
// ========================================
const uploadBase = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// ========================================
// VALIDAR CONTENIDO REAL DE LA IMAGEN
// y subirla (Cloudinary o fallback local)
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

        const detectado =
            detectarImagen(req.file.buffer);

        if (!detectado) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Solo se permiten imágenes JPG, PNG o WEBP'
            });
        }

        if (cloudinaryConfigurado) {
            const resultado =
                await subirImagen(
                    req.file.buffer,
                    {
                        carpeta:
                            'libreria/portadas'
                    }
                );

            req.file.cloudinaryUrl =
                resultado.url;
            req.file.publicId =
                resultado.publicId;
            req.file.extension =
                detectado.extension;
        } else {
            // Fallback local para desarrollo
            const nombreArchivo =
                `portada-${Date.now()}-${Math.round(
                    Math.random() * 1E9
                )}${detectado.extension}`;

            fs.writeFileSync(
                path.join(
                    carpetaPortadas,
                    nombreArchivo
                ),
                req.file.buffer
            );

            req.file.filename =
                nombreArchivo;
            req.file.path =
                path.join(
                    carpetaPortadas,
                    nombreArchivo
                );
        }

        return next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            mensaje:
                'No se pudo procesar la imagen'
        });
    }
};

const upload = {
    single: (nombreCampo) => [
        uploadBase.single(nombreCampo),
        validarYSubir
    ]
};

module.exports = upload;