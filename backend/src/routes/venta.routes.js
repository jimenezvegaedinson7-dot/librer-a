const express = require('express');

const router = express.Router();

const {
    obtenerVentas,
    obtenerVenta,
    obtenerMisVentas,
    crearVenta,
    actualizarEstadoVenta,
    obtenerPagoVenta,
    reembolsarVenta
} = require('../controllers/venta.controller');

const {
    generarComprobante
} = require('../controllers/comprobante.controller');

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
// CLIENTE / USUARIO AUTENTICADO
// ========================================

// Obtener mis propias ventas
router.get(
    '/mis-ventas',
    obtenerMisVentas
);

// Crear venta de mostrador (administrador o cajero: confirma el cobro)
router.post(
    '/',
    verificarPanel,
    crearVenta
);

// ========================================
// ADMINISTRADOR Y CAJERO
// (operación diaria de caja)
// ========================================

// Obtener todas las ventas
router.get(
    '/',
    verificarPanel,
    obtenerVentas
);

// Obtener una venta por ID
// (dueño de la venta o personal del panel; el controlador valida)
router.get(
    '/:id',
    obtenerVenta
);

// Obtener datos de pago de una venta
// (dueño de la venta o personal del panel)
router.get(
    '/:id/pago',
    obtenerPagoVenta
);

// Actualizar estado de una venta.
// La máquina de transiciones ya impide cancelar una venta pagada
// (exige Reembolsar) y marcar como pagada una pendiente (solo PayU).
router.put(
    '/:id/estado',
    verificarPanel,
    actualizarEstadoVenta
);

// Generar comprobante de pago (boleta/factura)
router.post(
    '/:id/comprobante',
    verificarPanel,
    generarComprobante
);

// ========================================
// SOLO ADMINISTRADOR
// ========================================

// Reembolsar una venta pagada o entregada
// (devuelve stock y anula el comprobante emitido)
router.post(
    '/:id/reembolso',
    verificarRol(ROLES.ADMINISTRADOR),
    reembolsarVenta
);

module.exports = router;
