const express = require('express');

const router = express.Router();

const {
    listarComprobantes,
    obtenerComprobante,
    enviarComprobanteEmail,
    registrarSunat,
    anularComprobante
} = require('../controllers/comprobante.controller');

const comprobanteModel = require('../models/comprobante.model');

const verificarToken = require('../middlewares/auth.middleware');
const {
    verificarRol,
    verificarPanel,
} = require('../middlewares/rol.middleware');
const { ROLES } = require('../utils/roles');

// ========================================
// TODAS LAS RUTAS REQUIEREN JWT
// ========================================
router.use(verificarToken);

// ========================================
// ADMINISTRADOR O CAJERO — consulta y envío
// ========================================

// LISTAR COMPROBANTES
router.get('/', verificarPanel, listarComprobantes);

// ========================================
// RESUMEN GLOBAL (COUNT por tipo + ingresos)
// Declarado ANTES de /:id para que "resumen"
// no sea interpretado como un id.
// ========================================
router.get('/resumen', verificarPanel, async (req, res) => {
    try {
        const resumen =
            await comprobanteModel.listarResumen();

        return res.json({
            success: true,
            boletas: resumen.boletas,
            facturas: resumen.facturas,
            ingresos: resumen.ingresos,
            anulados: resumen.anulados
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
router.post(
    '/:id/enviar-email',
    verificarPanel,
    enviarComprobanteEmail
);

// ========================================
// OBTENER COMPROBANTE POR ID
// ========================================
router.get('/:id', verificarPanel, obtenerComprobante);

// ========================================
// SOLO ADMINISTRADOR
// ========================================

// COMPROBANTE ELECTRÓNICO SUNAT (serie-número)
// Y NOTA DE CRÉDITO
// ========================================
router.put(
    '/:id/sunat',
    verificarRol(ROLES.ADMINISTRADOR),
    registrarSunat
);

// ========================================
// ANULAR COMPROBANTE (datos errados; la
// venta sigue vigente y se puede reemitir)
// ========================================
router.post(
    '/:id/anular',
    verificarRol(ROLES.ADMINISTRADOR),
    anularComprobante
);

module.exports = router;