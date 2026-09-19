const express = require('express');

const router = express.Router();

const verificarToken = require('../middlewares/auth.middleware');

const {
    listarMisFavoritos,
    estadoFavorito,
    agregarFavorito,
    quitarFavorito
} = require('../controllers/favorito.controller');

// ========================================
// TODAS LAS RUTAS REQUIEREN JWT
// (solo cliente autenticado)
// ========================================
router.use(verificarToken);

// Listar mis favoritos (lista de deseos)
router.get('/', listarMisFavoritos);

// Consultar si un libro es favorito
router.get('/:idLibro', estadoFavorito);

// Agregar un libro a favoritos
router.post('/:idLibro', agregarFavorito);

// Quitar un libro de favoritos
router.delete('/:idLibro', quitarFavorito);

module.exports = router;