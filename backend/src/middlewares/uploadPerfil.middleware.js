const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { detectarImagen } = require('../utils/fileType');
const {
    subirImagen,
    configurado: cloudinaryConfigurado
} = require('../utils/cloudinary');

// ========================================
// CARPETA DE FOTOS DE PERFIL
// (solo usada como fallback en desarrollo)
// ========================================
const carpetaPerfiles = path.join(
    __dirname,
    '../../uploads/perfiles'
);

if (!fs.existsSync(carpetaPerfiles)) {
    fs.mkdirSync(carpetaPerfiles, {
        recursive: true
    });
}

// ========================================
// FILTRAR ARCHIVOS
// ========================================
const fileFilter = (
    req,
    file,
    cb
) => {
    const tiposPermitidos = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (
        tiposPermitidos.includes(
            file.mimetype
        )
    ) {
        cb(
            null,
            true
        );

        return;
    }

    cb(
        new Error(
            'Solo se permiten imágenes JPG, PNG o WEBP'
        ),
        false
    );
};

// ========================================
// CONFIGURAR MULTER (MEMORIA)
// ========================================
const uploadBase = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize:
            5 * 1024 * 1024
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
                            'libreria/perfiles'
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
            const idUsuario =
                req.usuario?.id_usuario ||
                'usuario';

            const nombreArchivo =
                `perfil-${idUsuario}-${Date.now()}${detectado.extension}`;

            fs.writeFileSync(
                path.join(
                    carpetaPerfiles,
                    nombreArchivo
                ),
                req.file.buffer
            );

            req.file.filename =
                nombreArchivo;
            req.file.path =
                path.join(
                    carpetaPerfiles,
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

const uploadPerfil = {
    single: (nombreCampo) => [
        uploadBase.single(nombreCampo),
        validarYSubir
    ]
};

module.exports = uploadPerfil;