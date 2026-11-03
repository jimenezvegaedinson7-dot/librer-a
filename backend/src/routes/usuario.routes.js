const express = require('express');

const router = express.Router();

const verificarToken = require('../middlewares/auth.middleware');
const uploadPerfil = require('../middlewares/uploadPerfil.middleware');
const { listarUsuarios, adminUpdateUsuario, obtenerPerfil, actualizarPerfil, subirFotoPerfil, cambiarPassword, eliminarMiCuenta } = require('../controllers/usuario.controller');
const verificarRol = require('../middlewares/rol.middleware');

router.use(verificarToken);
router.get('/', verificarRol('administrador'), listarUsuarios);
router.get('/perfil', obtenerPerfil);
router.put('/perfil', actualizarPerfil);
router.put('/foto', uploadPerfil.single('foto'), subirFotoPerfil);
router.put('/password', cambiarPassword);
router.delete('/cuenta', eliminarMiCuenta);
router.patch('/:id', verificarRol('administrador'), adminUpdateUsuario);

module.exports = router;
