const express = require('express');

const router = express.Router();

const { listarComprobantes, obtenerComprobante, enviarComprobanteEmail, anularComprobante } = require('../controllers/comprobante.controller');
const comprobanteModel = require('../models/comprobante.model');
const verificarToken = require('../middlewares/auth.middleware');
const { verificarRol, verificarPanel } = require('../middlewares/rol.middleware');
const { ROLES } = require('../utils/roles');

router.use(verificarToken);
router.get('/', verificarPanel, listarComprobantes);

router.get('/resumen', verificarPanel, async (req, res) => {
    try {
        const resumen = await comprobanteModel.listarResumen();

        return res.json({ success: true, boletas: resumen.boletas, facturas: resumen.facturas, ingresos: resumen.ingresos, anulados: resumen.anulados });
    } catch (error) {
        console.error('Error al obtener el resumen de comprobantes:', error);

        return res.status(500).json({ success: false, mensaje: 'Error al obtener el resumen de comprobantes' });
    }
});

router.post('/:id/enviar-email', verificarPanel, enviarComprobanteEmail);
router.get('/:id', verificarPanel, obtenerComprobante);
router.post('/:id/anular', verificarRol(ROLES.ADMINISTRADOR), anularComprobante);

module.exports = router;
