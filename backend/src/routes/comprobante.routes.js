const express = require('express');

const router = express.Router();

const {
    listarComprobantes,
    obtenerComprobante,
    enviarComprobanteEmail
} = require('../controllers/comprobante.controller');

const comprobanteModel = require('../models/comprobante.model');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// TODAS LAS RUTAS REQUIEREN JWT + ADMIN
// ========================================
router.use(verificarToken);
router.use(verificarRol('administrador'));

// ========================================
// LISTAR COMPROBANTES
// ========================================
router.get('/', listarComprobantes);

// ========================================
// RESUMEN GLOBAL (COUNT por tipo + ingresos)
// Declarado ANTES de /:id para que "resumen"
// no sea interpretado como un id.
// ========================================
router.get('/resumen', async (req, res) => {
    try {
        const resumen =
            await comprobanteModel.listarResumen();

        return res.json({
            success: true,
            boletas: resumen.boletas,
            facturas: resumen.facturas,
            ingresos: resumen.ingresos
        });

    } catch (error) {
        console.error(
            'Error al obtener el resumen de comprobantes:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener el resumen de comprobantes'
        });
    }
});

// ========================================
// ENVIAR COMPROBANTE POR CORREO
// ========================================
router.post('/:id/enviar-email', enviarComprobanteEmail);

// ========================================
// OBTENER COMPROBANTE POR ID
// ========================================
router.get('/:id', obtenerComprobante);

module.exports = router;