const express = require('express');

const router = express.Router();

const { obtenerEmpresa, actualizarEmpresa } = require('../controllers/empresa.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

router.get('/', obtenerEmpresa);
router.put('/', verificarToken, verificarRol('administrador'), actualizarEmpresa);

module.exports = router;
