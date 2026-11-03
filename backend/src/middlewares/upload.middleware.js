const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { detectarImagen } = require('../utils/fileType');
const { subirImagen, configurado: cloudinaryConfigurado } = require('../utils/cloudinary');

const carpetaPortadas = path.join(__dirname, '../../uploads/portadas');

const fileFilter = (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
    }
};

const uploadBase = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const validarYSubir = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        const detectado = detectarImagen(req.file.buffer);

        if (!detectado) {
            return res.status(400).json({ success: false, mensaje: 'Solo se permiten imágenes JPG, PNG o WEBP' });
        }

        if (cloudinaryConfigurado) {
            const resultado = await subirImagen(req.file.buffer, { carpeta: 'libreria/portadas' });

            req.file.cloudinaryUrl = resultado.url;
            req.file.publicId = resultado.publicId;
            req.file.extension = detectado.extension;
        } else {
            fs.mkdirSync(carpetaPortadas, { recursive: true });

            const nombreArchivo = `portada-${Date.now()}-${Math.round(Math.random() * 1e9)}${detectado.extension}`;

            fs.writeFileSync(path.join(carpetaPortadas, nombreArchivo), req.file.buffer);

            req.file.filename = nombreArchivo;
            req.file.path = path.join(carpetaPortadas, nombreArchivo);
        }

        return next();
    } catch {
        return res.status(500).json({ success: false, mensaje: 'No se pudo procesar la imagen' });
    }
};

const upload = { single: (nombreCampo) => [uploadBase.single(nombreCampo), validarYSubir] };

module.exports = upload;
