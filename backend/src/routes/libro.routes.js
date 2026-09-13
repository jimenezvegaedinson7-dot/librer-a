const express = require('express');

const router = express.Router();

const {
    obtenerLibros,
    obtenerLibro,
    crearLibro,
    actualizarLibro,
    eliminarLibro
} = require('../controllers/libro.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');
const upload = require('../middlewares/upload.middleware');

// ========================================
// CONSULTAR LIBROS
// ========================================

// Obtener todos los libros
router.get('/', obtenerLibros);

// Obtener un libro por ID
router.get('/:id', obtenerLibro);

// ========================================
// ADMINISTRADOR
// ========================================

// Crear un libro
router.post(
    '/',
    verificarToken,
    verificarRol('administrador'),
    upload.single('portada'),
    crearLibro
);

// Actualizar un libro
router.put(
    '/:id',
    verificarToken,
    verificarRol('administrador'),
    upload.single('portada'),
    actualizarLibro
);

// Eliminar un libro
router.delete(
    '/:id',
    verificarToken,
    verificarRol('administrador'),
    eliminarLibro
);

module.exports = router;