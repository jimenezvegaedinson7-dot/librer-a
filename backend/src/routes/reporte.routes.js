const express = require('express');

const router = express.Router();

const {
    obtenerResumenGeneral,
    obtenerLibrosMasVendidos,
    obtenerVentasPorEstado,
    obtenerReservasPorEstado,
    obtenerStockBajo,
    obtenerVentasPorMes,
    obtenerVentasPorDia,
    obtenerIndicadoresVentas
} = require('../controllers/reporte.controller');

const verificarToken = require('../middlewares/auth.middleware');

const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// TODAS LAS RUTAS REQUIEREN JWT
// ========================================
router.use(verificarToken);

// ========================================
// SOLO ADMINISTRADOR
// ========================================
router.use(verificarRol('administrador'));

// ========================================
// RESUMEN GENERAL
// ========================================
router.get(
    '/resumen',
    obtenerResumenGeneral
);

// ========================================
// LIBROS MÁS VENDIDOS
// ========================================
router.get(
    '/libros-mas-vendidos',
    obtenerLibrosMasVendidos
);

// ========================================
// VENTAS POR ESTADO
// ========================================
router.get(
    '/ventas-por-estado',
    obtenerVentasPorEstado
);

// ========================================
// RESERVAS POR ESTADO
// ========================================
router.get(
    '/reservas-por-estado',
    obtenerReservasPorEstado
);

// ========================================
// STOCK BAJO
// ========================================
router.get(
    '/stock-bajo',
    obtenerStockBajo
);

// ========================================
// VENTAS POR MES
// ========================================
router.get(
    '/ventas-por-mes',
    obtenerVentasPorMes
);

// ========================================
// VENTAS POR DÍA
// ========================================
router.get(
    '/ventas-por-dia',
    obtenerVentasPorDia
);

// ========================================
// INDICADORES DE VENTAS
// ========================================
router.get(
    '/indicadores-ventas',
    obtenerIndicadoresVentas
);

module.exports = router;