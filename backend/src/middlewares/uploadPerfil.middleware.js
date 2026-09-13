const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { detectarImagen } = require('../utils/fileType');

// ========================================
// CARPETA DE FOTOS DE PERFIL
// ========================================
const carpetaPerfiles = path.join(
    __dirname,
    '../../uploads/perfiles'
);

// ========================================
// CREAR CARPETA SI NO EXISTE
// ========================================
if (!fs.existsSync(carpetaPerfiles)) {
    fs.mkdirSync(carpetaPerfiles, {
        recursive: true
    });
}

// ========================================
// CONFIGURACIÓN DE ALMACENAMIENTO
// ========================================
const storage = multer.diskStorage({

    destination: (
        req,
        file,
        cb
    ) => {
        cb(
            null,
            carpetaPerfiles
        );
    },

    filename: (
        req,
        file,
        cb
    ) => {
        const extension =
            path.extname(
                file.originalname
            ).toLowerCase();

        const idUsuario =
            req.usuario?.id_usuario ||
            'usuario';

        const nombreArchivo =
            `perfil-${idUsuario}-${Date.now()}${extension}`;

        cb(
            null,
            nombreArchivo
        );
    }

});

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
// CONFIGURAR MULTER
// ========================================
const uploadBase = multer({

    storage,

    fileFilter,

    limits: {
        fileSize:
            5 * 1024 * 1024
    }

});

// ========================================
// VALIDAR CONTENIDO REAL DE LA IMAGEN
// y renombrar con la extensión DETECTADA
// ========================================
const validarYRenombrar = (
    req,
    res,
    next
) => {
    if (!req.file) {
        return next();
    }

    let buffer = null;

    try {
        buffer =
            fs.readFileSync(req.file.path);
    } catch (error) {
        return res.status(400).json({
            success: false,
            mensaje:
                'El archivo no es una imagen válida'
        });
    }

    const detectado =
        detectarImagen(buffer);

    if (!detectado) {
        try {
            if (
                req.file.path &&
                fs.existsSync(req.file.path)
            ) {
                fs.unlinkSync(req.file.path);
            }
        } catch (error) {
            // ignorar error al limpiar
        }

        return res.status(400).json({
            success: false,
            mensaje:
                'Solo se permiten imágenes JPG, PNG o WEBP'
        });
    }

    // ========================================
    // USAR LA EXTENSIÓN DETECTADA
    // ========================================
    const extensionActual =
        path.extname(req.file.filename);

    if (
        extensionActual !==
        detectado.extension
    ) {
        const nombreBase =
            path.basename(
                req.file.filename,
                extensionActual
            );

        const nombreArchivo =
            `${nombreBase}${detectado.extension}`;

        const rutaNueva = path.join(
            path.dirname(req.file.path),
            nombreArchivo
        );

        try {
            fs.renameSync(
                req.file.path,
                rutaNueva
            );

            req.file.filename =
                nombreArchivo;
            req.file.path =
                rutaNueva;
        } catch (error) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El archivo no es una imagen válida'
            });
        }
    }

    return next();
};

const uploadPerfil = {
    single: (nombreCampo) => [
        uploadBase.single(nombreCampo),
        validarYRenombrar
    ]
};

// ========================================
// EXPORTAR
// ========================================
module.exports = uploadPerfil;