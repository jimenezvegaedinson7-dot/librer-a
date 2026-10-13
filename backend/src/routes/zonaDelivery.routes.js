const express = require('express');
const router = express.Router();
const { listarZonas, listarTodasZonas, crearZona, actualizarZona } = require('../controllers/zonaDelivery.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

router.use(verificarToken);
router.get('/', listarZonas);
router.get('/todos', verificarRol('administrador'), listarTodasZonas);
router.post('/', verificarRol('administrador'), crearZona);
router.put('/:id', verificarRol('administrador'), actualizarZona);
// Solo se edita la tarifa única; se conservan las referencias históricas.
module.exports = router;
