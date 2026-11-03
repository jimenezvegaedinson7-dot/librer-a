const express = require('express');

const router = express.Router();

const { crearOrden, obtenerOrden, webhookPago, renderCheckoutPage, renderRespuestaPage, listarPagosAdmin, obtenerCapacidadesCompra } = require('../controllers/pago.controller');
const pagoModel = require('../models/pago.model');
const verificarToken = require('../middlewares/auth.middleware');
const { verificarPanel } = require('../middlewares/rol.middleware');
const { webhookLimit } = require('../middlewares/rateLimit');

router.get('/checkout/:externalReference', renderCheckoutPage);
router.get('/respuesta/:externalReference', renderRespuestaPage);
router.get('/capacidades', obtenerCapacidadesCompra);
router.post('/webhook', webhookLimit, express.urlencoded({ extended: false }), express.json(), webhookPago);
router.use(verificarToken);
router.get('/', verificarPanel, listarPagosAdmin);

router.get('/resumen', verificarPanel, async (req, res) => {
    try {
        const resumen = await pagoModel.listarResumen();

        return res.json({ success: true, pagado: resumen.pagado, pendiente: resumen.pendiente, cancelado: resumen.cancelado, ingresos: resumen.ingresos });
    } catch (error) {
        console.error('Error al obtener el resumen de pagos:', error);

        return res.status(500).json({ success: false, mensaje: 'Error al obtener el resumen de pagos' });
    }
});

router.post('/crear-orden', crearOrden);
router.get('/:orderId', obtenerOrden);

module.exports = router;
