const express = require('express');

const router = express.Router();

const {
    obtenerInventario,
    obtenerInventarioPorLibro,
    crearInventario,
    actualizarStock,
    actualizarInventario,
    obtenerStockBajo,
    listarMovimientos
} = require('../controllers/inventario.controller');

const verificarToken = require('../middlewares/auth.middleware');
const { verificarRol, verificarPanel } = require('../middlewares/rol.middleware');
const { ROLES } = require('../utils/roles');

router.get('/', verificarToken, verificarPanel, obtenerInventario);
router.get('/stock-bajo', verificarToken, verificarPanel, obtenerStockBajo);
router.get('/movimientos', verificarToken, verificarPanel, listarMovimientos);
router.get('/libro/:id', verificarToken, verificarPanel, obtenerInventarioPorLibro);
router.post('/', verificarToken, verificarRol(ROLES.ADMINISTRADOR), crearInventario);
router.put('/libro/:id/stock', verificarToken, verificarRol(ROLES.ADMINISTRADOR), actualizarStock);
router.put('/libro/:id', verificarToken, verificarRol(ROLES.ADMINISTRADOR), actualizarInventario);

module.exports = router;
