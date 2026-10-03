const express = require('express');

const router = express.Router();

const {
    listarAnuncios,
    obtenerAnuncioActivo,
    crearAnuncio,
    actualizarAnuncio,
    eliminarAnuncio
} = require('../controllers/anuncio.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');
const uploadVideo = require('../middlewares/uploadVideo.middleware');
const carrusel = require('../controllers/carrusel.controller');
const { recibir } = require('../middlewares/uploadCarrusel.middleware');

// ========================================
// WEB PÚBLICA (sin token)
// ========================================

// Anuncio activo. Es lo único que consume la portada: la web
// pública no necesita el listado ni los public_id.
router.get('/', obtenerAnuncioActivo);
router.get('/carrusel', carrusel.listarPublico);
router.get('/carrusel/todos', verificarToken, verificarRol('administrador'), carrusel.listarPanel);
router.post('/carrusel', verificarToken, verificarRol('administrador'), recibir, carrusel.crear);
router.put('/carrusel/orden', verificarToken, verificarRol('administrador'), carrusel.reordenar);
router.put('/carrusel/:id', verificarToken, verificarRol('administrador'), recibir, carrusel.actualizar);
router.delete('/carrusel/:id', verificarToken, verificarRol('administrador'), carrusel.eliminar);

// ========================================
// ADMINISTRADOR
// ========================================

router.get(
    '/todos',
    verificarToken,
    verificarRol('administrador'),
    listarAnuncios
);

router.post(
    '/',
    verificarToken,
    verificarRol('administrador'),
    uploadVideo.single('video'),
    crearAnuncio
);

router.put(
    '/:id',
    verificarToken,
    verificarRol('administrador'),
    uploadVideo.single('video'),
    actualizarAnuncio
);

router.delete(
    '/:id',
    verificarToken,
    verificarRol('administrador'),
    eliminarAnuncio
);

module.exports = router;
