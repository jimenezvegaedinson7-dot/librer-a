const express = require('express');

const router = express.Router();

const { obtenerAutores, obtenerAutor, crearAutor, actualizarAutor, eliminarAutor } = require('../controllers/autor.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

router.get('/', obtenerAutores);
router.get('/:id', obtenerAutor);
router.post('/', verificarToken, verificarRol('administrador'), crearAutor);
router.put('/:id', verificarToken, verificarRol('administrador'), actualizarAutor);
router.delete('/:id', verificarToken, verificarRol('administrador'), eliminarAutor);

module.exports = router;
