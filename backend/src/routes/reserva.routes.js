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

// Crear una reserva
router.post('/', crearReserva);

// Cancelar mi reserva (solo el dueño)
router.delete('/:id', cancelarReserva);

// ========================================
// ADMINISTRADOR Y CAJERO
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
// (confirmar, completar —exige método de cobro— o cancelar)
router.put(
    '/:id/estado',
    verificarPanel,
    actualizarEstado
);

module.exports = router;
