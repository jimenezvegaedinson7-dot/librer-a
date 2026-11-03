const express = require('express');

const router = express.Router();

const { listarAgencias, listarTodasAgencias, obtenerAgencia, crearAgencia, actualizarAgencia } = require('../controllers/agencia.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

router.get('/activas', verificarToken, listarAgencias);
router.get('/', verificarToken, verificarRol('administrador'), listarTodasAgencias);
router.get('/:id', verificarToken, obtenerAgencia);
router.post('/', verificarToken, verificarRol('administrador'), crearAgencia);
router.put('/:id', verificarToken, verificarRol('administrador'), actualizarAgencia);

module.exports = router;
