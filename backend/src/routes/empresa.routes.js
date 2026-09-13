const express = require('express');

const router = express.Router();

const {
    obtenerEmpresa,
    actualizarEmpresa
} = require('../controllers/empresa.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// OBTENER EMPRESA (PÚBLICO — SIN TOKEN)
// ========================================
router.get('/', obtenerEmpresa);

// ========================================
// ACTUALIZAR EMPRESA (SOLO ADMIN)
// ========================================
router.put(
    '/',
    verificarToken,
    verificarRol('administrador'),
    actualizarEmpresa
);

module.exports = router;