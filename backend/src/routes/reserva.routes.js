const express = require('express');

const router = express.Router();

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

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
// ADMINISTRADOR
// ========================================

// Obtener todas las reservas
router.get(
    '/',
    verificarRol('administrador'),
    obtenerReservas
);

// Obtener una reserva por ID (dueño o administrador; valida el controller)
router.get(
    '/:id',
    obtenerReserva
);

// Actualizar estado de una reserva
router.put(
    '/:id/estado',
    verificarRol('administrador'),
    actualizarEstado
);

module.exports = router;
