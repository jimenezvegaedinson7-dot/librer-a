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
const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// CONSULTAR INVENTARIO
// ========================================

// Obtener todo el inventario (SOLO ADMIN)
router.get(
    '/',
    verificarToken,
    verificarRol('administrador'),
    obtenerInventario
);

// Obtener libros con stock bajo (SOLO ADMIN)
router.get(
    '/stock-bajo',
    verificarToken,
    verificarRol('administrador'),
    obtenerStockBajo
);

// Obtener movimientos de inventario (kardex)
// Declarada antes de '/libro/:id' para que el segmento
// 'movimientos' no sea interpretado como ':id'.
router.get(
    '/movimientos',
    verificarToken,
    verificarRol('administrador'),
    listarMovimientos
);

// Obtener inventario de un libro (SOLO ADMIN)
router.get(
    '/libro/:id',
    verificarToken,
    verificarRol('administrador'),
    obtenerInventarioPorLibro
);

// ========================================
// ADMINISTRADOR
// ========================================

// Crear registro de inventario
router.post(
    '/',
    verificarToken,
    verificarRol('administrador'),
    crearInventario
);

// Actualizar solamente el stock
router.put(
    '/libro/:id/stock',
    verificarToken,
    verificarRol('administrador'),
    actualizarStock
);

// Actualizar inventario completo
router.put(
    '/libro/:id',
    verificarToken,
    verificarRol('administrador'),
    actualizarInventario
);

module.exports = router;