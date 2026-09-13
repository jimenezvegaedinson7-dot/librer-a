const express = require('express');

const router = express.Router();

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

const {
    obtenerHistorial,
    obtenerMiHistorial,
    crearHistorial
} = require('../controllers/historial.controller');

// ========================================
// TODAS LAS RUTAS REQUIEREN JWT
// ========================================
router.use(verificarToken);

// ========================================
// CLIENTE / USUARIO AUTENTICADO
// ========================================

// Obtener mi historial
router.get(
    '/mi-historial',
    obtenerMiHistorial
);

// Crear registro de historial (SOLO ADMIN)
router.post(
    '/',
    verificarRol('administrador'),
    crearHistorial
);

// ========================================
// ADMINISTRADOR
// ========================================

// Obtener todo el historial
router.get(
    '/',
    verificarRol('administrador'),
    obtenerHistorial
);

module.exports = router;