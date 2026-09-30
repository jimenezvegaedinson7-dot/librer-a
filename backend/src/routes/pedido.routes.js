const express = require('express');
const router = express.Router();
const {
    obtenerPedidos,
    obtenerPedido,
    obtenerMisPedidos,
    actualizarEstadoPedido
} = require('../controllers/pedido.controller');
const verificarToken = require('../middlewares/auth.middleware');
const { verificarPanel } = require('../middlewares/rol.middleware');

// Todas las rutas de pedidos requieren token
router.use(verificarToken);

// ========================================
// LISTAR TODOS LOS PEDIDOS (ADMIN)
// ========================================
router.get('/', verificarPanel, obtenerPedidos);

// ========================================
// OBTENER MIS PEDIDOS (CLIENTE)
// (debe declararse antes de /:id)
// ========================================
router.get('/usuario/:id_usuario', obtenerMisPedidos);

// ========================================
// OBTENER PEDIDO POR ID (ADMIN)
// ========================================
router.get('/:id', verificarPanel, obtenerPedido);

// ========================================
// ACTUALIZAR ESTADO DE PEDIDO (ADMIN)
// ========================================
router.put('/:id/estado', verificarPanel, actualizarEstadoPedido);

module.exports = router;