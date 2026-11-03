const express = require('express');

const router = express.Router();

const { obtenerVentas, obtenerVenta, obtenerMisVentas, actualizarEstadoVenta, obtenerPagoVenta, reembolsarVenta } = require('../controllers/venta.controller');
const { generarComprobante } = require('../controllers/comprobante.controller');
const verificarToken = require('../middlewares/auth.middleware');
const { verificarRol, verificarPanel } = require('../middlewares/rol.middleware');
const { ROLES } = require('../utils/roles');

router.use(verificarToken);
router.get('/mis-ventas', obtenerMisVentas);

router.post('/', (req, res) => {
    res.status(405).json({ success: false, mensaje: 'La creación manual de ventas está deshabilitada. ' + 'Las ventas se generan únicamente desde la app con pago PayU.' });
});

router.get('/', verificarPanel, obtenerVentas);
router.get('/:id', obtenerVenta);
router.get('/:id/pago', obtenerPagoVenta);
router.put('/:id/estado', verificarPanel, actualizarEstadoVenta);
router.post('/:id/comprobante', verificarPanel, generarComprobante);
router.post('/:id/reembolso', verificarRol(ROLES.ADMINISTRADOR), reembolsarVenta);

module.exports = router;
