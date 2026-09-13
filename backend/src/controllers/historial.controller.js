const historialModel = require('../models/historial.model');

// ========================================
// OBTENER TODO EL HISTORIAL
// ========================================
const obtenerHistorial = async (req, res) => {
    try {
        const historial = await historialModel.obtenerTodos();

        res.json({
            success: true,
            data: historial
        });

    } catch (error) {
        console.error('Error al obtener historial:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener el historial'
        });
    }
};

// ========================================
// OBTENER MI HISTORIAL
// ========================================
const obtenerMiHistorial = async (req, res) => {
    try {
        const id_usuario = req.usuario.id_usuario;

        const historial = await historialModel.obtenerPorUsuario(id_usuario);

        res.json({
            success: true,
            data: historial
        });

    } catch (error) {
        console.error('Error al obtener historial del usuario:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener tu historial'
        });
    }
};

// ========================================
// CREAR REGISTRO DE HISTORIAL
// ========================================
const crearHistorial = async (req, res) => {
    try {
        const {
            tipo_operacion,
            modulo,
            descripcion
        } = req.body;

        const id_usuario = req.usuario?.id_usuario ?? null;

        if (!tipo_operacion || !modulo || !descripcion) {
            return res.status(400).json({
                success: false,
                mensaje: 'Faltan datos obligatorios'
            });
        }

        const id = await historialModel.crear({
            id_usuario,
            tipo_operacion,
            modulo,
            descripcion
        });

        res.status(201).json({
            success: true,
            mensaje: 'Historial registrado correctamente',
            id_historial: id
        });

    } catch (error) {
        console.error('Error al crear historial:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al registrar el historial'
        });
    }
};

// ========================================
// EXPORTAR
// ========================================
module.exports = {
    obtenerHistorial,
    obtenerMiHistorial,
    crearHistorial
};