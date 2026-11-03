const express = require('express');

const router = express.Router();

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');
const { obtenerHistorial, obtenerMiHistorial, crearHistorial } = require('../controllers/historial.controller');

router.use(verificarToken);
router.get('/mi-historial', obtenerMiHistorial);
router.post('/', verificarRol('administrador'), crearHistorial);
router.get('/', verificarRol('administrador'), obtenerHistorial);

module.exports = router;
