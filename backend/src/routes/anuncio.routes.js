const express = require('express');

const router = express.Router();

const { listarAnuncios, obtenerAnuncioActivo, crearAnuncio, actualizarAnuncio, eliminarAnuncio } = require('../controllers/anuncio.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');
const uploadVideo = require('../middlewares/uploadVideo.middleware');
const carrusel = require('../controllers/carrusel.controller');
const portada = require('../controllers/portada.controller');
const { recibir } = require('../middlewares/uploadCarrusel.middleware');

router.get('/', obtenerAnuncioActivo);
router.get('/carrusel', carrusel.listarPublico);
router.get('/protagonista', portada.obtenerPublico);
router.get('/protagonista/panel', verificarToken, verificarRol('administrador'), portada.obtenerPanel);
router.put('/protagonista', verificarToken, verificarRol('administrador'), portada.guardar);
router.get('/carrusel/todos', verificarToken, verificarRol('administrador'), carrusel.listarPanel);
router.post('/carrusel', verificarToken, verificarRol('administrador'), recibir, carrusel.crear);
router.put('/carrusel/orden', verificarToken, verificarRol('administrador'), carrusel.reordenar);
router.put('/carrusel/:id', verificarToken, verificarRol('administrador'), recibir, carrusel.actualizar);
router.delete('/carrusel/:id', verificarToken, verificarRol('administrador'), carrusel.eliminar);
router.get('/todos', verificarToken, verificarRol('administrador'), listarAnuncios);
router.post('/', verificarToken, verificarRol('administrador'), uploadVideo.single('video'), crearAnuncio);
router.put('/:id', verificarToken, verificarRol('administrador'), uploadVideo.single('video'), actualizarAnuncio);
router.delete('/:id', verificarToken, verificarRol('administrador'), eliminarAnuncio);

module.exports = router;
