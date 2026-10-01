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

// ========================================
// WEB PÚBLICA (sin token)
// ========================================

// Anuncio activo. Es lo único que consume la portada: la web
// pública no necesita el listado ni los public_id.
router.get('/', obtenerAnuncioActivo);

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
