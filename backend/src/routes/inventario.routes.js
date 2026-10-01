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
const {
    verificarRol,
    verificarPanel,
} = require('../middlewares/rol.middleware');
const { ROLES } = require('../utils/roles');

// ========================================
// CONSULTAR INVENTARIO (SOLO ADMINISTRADOR)
// ========================================

// Obtener todo el inventario
router.get(
    '/',
    verificarToken,
    verificarPanel,
    obtenerInventario
);

// Obtener libros con stock bajo
router.get(
    '/stock-bajo',
    verificarToken,
    verificarPanel,
    obtenerStockBajo
);

// Obtener movimientos de inventario (kardex)
// Declarada antes de '/libro/:id' para que el segmento
// 'movimientos' no sea interpretado como ':id'.
router.get(
    '/movimientos',
    verificarToken,
    verificarPanel,
    listarMovimientos
);

// Obtener inventario de un libro
router.get(
    '/libro/:id',
    verificarToken,
    verificarPanel,
    obtenerInventarioPorLibro
);

// ========================================
// SOLO ADMINISTRADOR: cualquier modificación de stock
// ========================================

// Crear registro de inventario
router.post(
    '/',
    verificarToken,
    verificarRol(ROLES.ADMINISTRADOR),
    crearInventario
);

// Actualizar solamente el stock
router.put(
    '/libro/:id/stock',
    verificarToken,
    verificarRol(ROLES.ADMINISTRADOR),
    actualizarStock
);

// Actualizar inventario completo
router.put(
    '/libro/:id',
    verificarToken,
    verificarRol(ROLES.ADMINISTRADOR),
    actualizarInventario
);

module.exports = router;
