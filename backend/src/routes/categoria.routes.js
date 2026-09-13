const express = require('express');

const router = express.Router();

const {
    obtenerCategorias,
    obtenerCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
} = require('../controllers/categoria.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// CONSULTAR CATEGORÍAS
// ========================================

// Obtener todas las categorías
router.get('/', obtenerCategorias);

// Obtener categoría por ID
router.get('/:id', obtenerCategoria);

// ========================================
// ADMINISTRADOR
// ========================================

// Crear categoría
router.post(
    '/',
    verificarToken,
    verificarRol('administrador'),
    crearCategoria
);

// Actualizar categoría
router.put(
    '/:id',
    verificarToken,
    verificarRol('administrador'),
    actualizarCategoria
);

// Eliminar categoría
router.delete(
    '/:id',
    verificarToken,
    verificarRol('administrador'),
    eliminarCategoria
);

module.exports = router;