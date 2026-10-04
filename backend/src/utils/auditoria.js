const historial = require('../models/historial.model');
async function registrarAuditoria(req, modulo, tipo, descripcion) {
    try {
        await historial.crear({ id_usuario: req.usuario.id_usuario, modulo,
            tipo_operacion: tipo, descripcion });
    } catch (error) {
        console.error('[historial] No se pudo registrar la operación:', error.message);
    }
}
module.exports = { registrarAuditoria };
