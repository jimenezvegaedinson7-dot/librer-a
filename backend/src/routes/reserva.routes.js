const express = require('express');

const router = express.Router();

const verificarToken = require('../middlewares/auth.middleware');
const { verificarPanel } = require('../middlewares/rol.middleware');

const {
    obtenerReservas,
    obtenerReserva,
    obtenerMisReservas,
    crearReserva,
    actualizarEstado,
    cancelarReserva
} = require('../controllers/reserva.controller');

// ========================================
// TODAS LAS RUTAS REQUIEREN JWT
// ========================================
router.use(verificarToken);

// ========================================
// CLIENTE / USUARIO AUTENTICADO
// ========================================

// Obtener mis propias reservas
router.get('/mis-reservas', obtenerMisReservas);

// Contrato retirado: siempre 405, incluso para clientes antiguos.
router.post('/', crearReserva);

// Cancelar mi reserva (solo el dueño)
router.delete('/:id', cancelarReserva);

// ========================================
// SOLO ADMINISTRADOR
// ========================================

// Obtener todas las reservas
router.get(
    '/',
    verificarPanel,
    obtenerReservas
);

// Obtener una reserva por ID (dueño o personal del panel; valida el controller)
router.get(
    '/:id',
    obtenerReserva
);

// Actualizar estado de una reserva
// Solo cancelar una reserva histórica activa; cualquier cobro se rechaza.
router.put(
    '/:id/estado',
    verificarPanel,
    actualizarEstado
);

module.exports = router;
