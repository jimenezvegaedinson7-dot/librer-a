const express = require('express');

const router = express.Router();

const { obtenerLibros, obtenerLibro, obtenerRelacionados, obtenerRecomendados, crearLibro, actualizarLibro, eliminarLibro } = require('../controllers/libro.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/', obtenerLibros);
router.get('/recomendados', verificarToken, verificarRol('cliente'), obtenerRecomendados);
router.get('/:id/relacionados', obtenerRelacionados);
router.get('/:id', obtenerLibro);
router.post('/', verificarToken, verificarRol('administrador'), upload.single('portada'), crearLibro);
router.put('/:id', verificarToken, verificarRol('administrador'), upload.single('portada'), actualizarLibro);
router.delete('/:id', verificarToken, verificarRol('administrador'), eliminarLibro);

module.exports = router;
