const express = require('express');

const router = express.Router();

const { listarClientes } = require('../controllers/cliente.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

router.use(verificarToken);
router.get('/', verificarRol('administrador'), listarClientes);

module.exports = router;
