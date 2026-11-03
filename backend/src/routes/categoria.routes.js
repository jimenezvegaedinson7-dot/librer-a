const express = require('express');

const router = express.Router();

const { obtenerCategorias, obtenerCategoria, crearCategoria, actualizarCategoria, eliminarCategoria } = require('../controllers/categoria.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

router.get('/', obtenerCategorias);
router.get('/:id', obtenerCategoria);
router.post('/', verificarToken, verificarRol('administrador'), crearCategoria);
router.put('/:id', verificarToken, verificarRol('administrador'), actualizarCategoria);
router.delete('/:id', verificarToken, verificarRol('administrador'), eliminarCategoria);

module.exports = router;
