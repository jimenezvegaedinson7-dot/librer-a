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
    obtenerIndicadoresVentas,
    obtenerCierreCaja
} = require('../controllers/reporte.controller');

const verificarToken = require('../middlewares/auth.middleware');

const {
    verificarRol,
    verificarPanel,
} = require('../middlewares/rol.middleware');
const { ROLES } = require('../utils/roles');

const soloAdmin = verificarRol(ROLES.ADMINISTRADOR);

// ============================================================
// Todas las rutas requieren JWT y son de solo lectura.
//
// El permiso NO es global: se decide endpoint por endpoint.
//
// Cajero: solo los agregados operativos que necesita para atender
// el mostrador (pendientes, stock y cierre del día).
// Administrador: además, estadísticas globales, rankings y series
// históricas del dashboard. Ocultarlos en la interfaz no basta:
// si el cajero conoce la URL debe recibir 403.
// ============================================================
router.use(verificarToken);

// ============================================================
// ADMINISTRADOR O CAJERO — indicators operativos del mostrador
// ============================================================
// Uso del cajero: /punto-venta y el panel de notificaciones.
// Son conteos por estado y avisos de stock, no estadísticas globales.
// ============================================================

// ========================================
// VENTAS POR ESTADO
// ========================================
router.get(
    '/ventas-por-estado',
    verificarPanel,
    obtenerVentasPorEstado
);

// ========================================
// RESERVAS POR ESTADO
// ========================================
router.get(
    '/reservas-por-estado',
    verificarPanel,
    obtenerReservasPorEstado
);

// ========================================
// STOCK BAJO
// ========================================
router.get(
    '/stock-bajo',
    verificarPanel,
    obtenerStockBajo
);

// ========================================
// CIERRE DE CAJA DEL DÍA
// (totales y cobros del día, por medio de pago)
// ========================================
router.get(
    '/cierre-caja',
    verificarPanel,
    obtenerCierreCaja
);

// ============================================================
// SOLO ADMINISTRADOR — estadísticas administrativas
// ============================================================
// Consumidas únicamente por el dashboard. Un cajero que conozca
// estas URL recibe 403 aunque el frontend no las use nunca.
// ============================================================

// ========================================
// RESUMEN GENERAL
// (totales históricos y conteo de usuarios)
// ========================================
router.get(
    '/resumen',
    soloAdmin,
    obtenerResumenGeneral
);

// ========================================
// LIBROS MÁS VENDIDOS
// (ranking histórico)
// ========================================
router.get(
    '/libros-mas-vendidos',
    soloAdmin,
    obtenerLibrosMasVendidos
);

// ========================================
// VENTAS POR MES
// (serie histórica)
// ========================================
router.get(
    '/ventas-por-mes',
    soloAdmin,
    obtenerVentasPorMes
);

// ========================================
// VENTAS POR DÍA
// (serie histórica)
// ========================================
router.get(
    '/ventas-por-dia',
    soloAdmin,
    obtenerVentasPorDia
);

// ========================================
// INDICADORES DE VENTAS
// (totales históricos, ticket promedio, mejor mes y mejor día)
// ========================================
router.get(
    '/indicadores-ventas',
    soloAdmin,
    obtenerIndicadoresVentas
);

module.exports = router;