const express = require('express');

const router = express.Router();

const {
    obtenerVentas,
    obtenerVenta,
    obtenerMisVentas,
    crearVenta,
    actualizarEstadoVenta,
    obtenerPagoVenta
} = require('../controllers/venta.controller');

const {
    generarComprobante
} = require('../controllers/comprobante.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// TODAS LAS RUTAS REQUIEREN JWT
// ========================================
router.use(verificarToken);

// ========================================
// CLIENTE / USUARIO AUTENTICADO
// ========================================

// Obtener mis propias ventas
router.get(
    '/mis-ventas',
    obtenerMisVentas
);

// Crear una venta (solo administrador: confirma cobro)
router.post(
    '/',
    verificarRol('administrador'),
    crearVenta
);

// ========================================
// ADMINISTRADOR
// ========================================

// Obtener todas las ventas
router.get(
    '/',
    verificarRol('administrador'),
    obtenerVentas
);

// Obtener una venta por ID
// (dueño de la venta o administrador; el controlador valida)
router.get(
    '/:id',
    obtenerVenta
);

// Obtener datos de pago de una venta
// (dueño de la venta o administrador)
router.get(
    '/:id/pago',
    obtenerPagoVenta
);

// Actualizar estado de una venta
router.put(
    '/:id/estado',
    verificarRol('administrador'),
    actualizarEstadoVenta
);

// Generar comprobante de pago (boleta/factura)
router.post(
    '/:id/comprobante',
    verificarRol('administrador'),
    generarComprobante
);

module.exports = router;
