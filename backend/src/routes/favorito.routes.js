const express = require('express');

const router = express.Router();

const verificarToken = require('../middlewares/auth.middleware');
const { listarMisFavoritos, estadoFavorito, agregarFavorito, quitarFavorito } = require('../controllers/favorito.controller');

router.use(verificarToken);
router.get('/', listarMisFavoritos);
router.get('/:idLibro', estadoFavorito);
router.post('/:idLibro', agregarFavorito);
router.delete('/:idLibro', quitarFavorito);

module.exports = router;
