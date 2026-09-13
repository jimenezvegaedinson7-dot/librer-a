const express = require('express');

const router = express.Router();

const {
    obtenerAutores,
    obtenerAutor,
    crearAutor,
    actualizarAutor,
    eliminarAutor
} = require('../controllers/autor.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// CONSULTAR AUTORES
// ========================================

// Obtener todos los autores
router.get('/', obtenerAutores);

// Obtener un autor por ID
router.get('/:id', obtenerAutor);

// ========================================
// ADMINISTRADOR
// ========================================

// Crear autor
router.post(
    '/',
    verificarToken,
    verificarRol('administrador'),
    crearAutor
);

// Actualizar autor
router.put(
    '/:id',
    verificarToken,
    verificarRol('administrador'),
    actualizarAutor
);

// Eliminar autor
router.delete(
    '/:id',
    verificarToken,
    verificarRol('administrador'),
    eliminarAutor
);

module.exports = router;