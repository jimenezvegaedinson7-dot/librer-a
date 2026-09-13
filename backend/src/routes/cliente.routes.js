const express = require('express');

const router = express.Router();

const {
    listarClientes
} = require('../controllers/cliente.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// TODAS LAS RUTAS REQUIEREN JWT
// ========================================
router.use(verificarToken);

// ========================================
// ADMINISTRADOR
// ========================================

// Listar clientes con resumen de compras
router.get(
    '/',
    verificarRol('administrador'),
    listarClientes
);

module.exports = router;