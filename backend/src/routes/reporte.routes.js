const express = require('express');

const router = express.Router();

const {
    obtenerResumenGeneral,
    obtenerLibrosMasVendidos,
    obtenerVentasPorEstado,
    obtenerVentasPorMes,
    obtenerVentasPorDia,
    obtenerIndicadoresVentas
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
// Todos los agregados, estadísticas y series requieren administrador.
// El backend aplica el permiso aunque se acceda directamente por URL.
// ============================================================
router.use(verificarToken);

// ============================================================
// SOLO ADMINISTRADOR — indicadores operativos
// ============================================================
// Conteos por estado para el dashboard y el panel de notificaciones.
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
// CONTRATO RETIRADO: SIN CONSULTAS NI ESTADÍSTICAS DE RESERVAS
// ========================================
router.use(
    '/reservas-por-estado',
    (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' })
);

// ============================================================
// SOLO ADMINISTRADOR — estadísticas administrativas
// ============================================================
// Consumidas por el dashboard y protegidas también en el backend.
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
