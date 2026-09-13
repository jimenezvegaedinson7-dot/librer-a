// ========================================
// MIDDLEWARE GLOBAL DE ERRORES
// ========================================
// Maneja:
//   - Multer (archivo demasiado grande, tipo no permitido)
//   - JSON inválido
//   - Errores inesperados
// No expone stack completo al cliente.
// ========================================

const manejarErrores = (error, req, res, next) => {
    // ========================================
    // ERRORES DE MULTER
    // ========================================
    if (error instanceof Error && error.name === 'MulterError') {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                mensaje: 'El archivo supera el tamaño máximo permitido (5 MB)'
            });
        }

        return res.status(400).json({
            success: false,
            mensaje: `Error al subir el archivo: ${error.message}`
        });
    }

    // ========================================
    // TIPO DE ARCHIVO NO PERMITIDO
    // ========================================
    if (
        error instanceof Error &&
        error.message &&
        error.message.includes('Solo se permiten imágenes')
    ) {
        return res.status(400).json({
            success: false,
            mensaje: error.message
        });
    }

    // ========================================
    // JSON INVÁLIDO
    // ========================================
    if (
        error instanceof SyntaxError &&
        error.status === 400 &&
        'body' in error
    ) {
        return res.status(400).json({
            success: false,
            mensaje: 'JSON inválido en el cuerpo de la petición'
        });
    }

    // ========================================
    // ERROR INESPERADO
    // ========================================
    console.error('Error no controlado:', error);

    const respuesta = {
        success: false,
        mensaje: 'Error interno del servidor'
    };

    return res.status(500).json(respuesta);
};

module.exports = manejarErrores;
