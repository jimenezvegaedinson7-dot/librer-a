const express = require('express');
const router = express.Router();
const { obtenerPedidos, obtenerPedido, obtenerMisPedidos, actualizarEstadoPedido } = require('../controllers/pedido.controller');
const verificarToken = require('../middlewares/auth.middleware');
const { verificarPanel } = require('../middlewares/rol.middleware');

router.use(verificarToken);
router.get('/', verificarPanel, obtenerPedidos);
router.get('/usuario/:id_usuario', obtenerMisPedidos);
router.get('/:id', verificarPanel, obtenerPedido);
router.put('/:id/estado', verificarPanel, actualizarEstadoPedido);

module.exports = router;
