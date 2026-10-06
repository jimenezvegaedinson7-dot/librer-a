const express = require('express');

const router = express.Router();

const {
    obtenerVentas,
    obtenerVenta,
    obtenerMisVentas,
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

// ========================================
// VENTA DE MOSTRADOR: RETIRADA
// ----------------------------------------
// El local es 100% virtual: no hay caja, ni punto de venta, ni venta
// de mostrador. El administrador NO puede crear ventas ni falsificar
// el origen 'app'.
//
// Toda venta nueva nace del flujo real: APP -> PayU -> venta online
// (ver src/controllers/pago.controller.js, que es el único que crea
// ventas desde la aplicación).
//
// Las ventas históricas con origen 'panel' o 'reserva' se conservan
// intactas y siguen visibles exclusivamente para consulta.
//
// Se responde 405 y no 404 a propósito: la ruta no existe, pero el
// método se documenta para que quede claro que es una retirada
// deliberada y no un descuido.
// ========================================
router.post('/', (req, res) => {
    res.status(405).json({
        success: false,
        mensaje:
            'La creación manual de ventas está deshabilitada. ' +
            'Las ventas se generan únicamente desde la app con pago PayU.'
    });
});

// ========================================
// SOLO ADMINISTRADOR (panel ecommerce)
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

// Retirada: responde 409. Entregas exclusivamente desde Pedidos.
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

// Solicitar devolución PayU o confirmar documentalmente la devolución externa.
// Solo confirmar con evidencia puede afectar stock y comprobante.
router.post(
    '/:id/reembolso',
    verificarRol(ROLES.ADMINISTRADOR),
    reembolsarVenta
);

module.exports = router;
