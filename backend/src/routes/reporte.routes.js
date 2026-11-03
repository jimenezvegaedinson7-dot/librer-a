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
const { verificarRol, verificarPanel } = require('../middlewares/rol.middleware');
const { ROLES } = require('../utils/roles');

const soloAdmin = verificarRol(ROLES.ADMINISTRADOR);

router.use(verificarToken);
router.get('/ventas-por-estado', verificarPanel, obtenerVentasPorEstado);
router.use('/reservas-por-estado', (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }));
router.get('/resumen', soloAdmin, obtenerResumenGeneral);
router.get('/libros-mas-vendidos', soloAdmin, obtenerLibrosMasVendidos);
router.get('/ventas-por-mes', soloAdmin, obtenerVentasPorMes);
router.get('/ventas-por-dia', soloAdmin, obtenerVentasPorDia);
router.get('/indicadores-ventas', soloAdmin, obtenerIndicadoresVentas);

module.exports = router;
