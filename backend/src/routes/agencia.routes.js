const express = require('express');

const router = express.Router();

const {
    listarAgencias,
    listarTodasAgencias,
    obtenerAgencia,
    crearAgencia,
    actualizarAgencia
} = require('../controllers/agencia.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// CONSULTAR AGENCIAS (REQUIEREN JWT)
// ========================================

// Listar agencias activas (clientes)
router.get(
    '/activas',
    verificarToken,
    listarAgencias
);

// Listar todas las agencias (solo admin)
router.get(
    '/',
    verificarToken,
    verificarRol('administrador'),
    listarTodasAgencias
);

// Obtener una agencia por ID
router.get(
    '/:id',
    verificarToken,
    obtenerAgencia
);

// ========================================
// ADMINISTRADOR (gestionar agencias)
// ========================================

// Crear agencia
router.post(
    '/',
    verificarToken,
    verificarRol('administrador'),
    crearAgencia
);

// Actualizar agencia
router.put(
    '/:id',
    verificarToken,
    verificarRol('administrador'),
    actualizarAgencia
);

module.exports = router;