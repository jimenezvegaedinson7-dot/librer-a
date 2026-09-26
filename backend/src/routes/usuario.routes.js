const express = require('express');

const router = express.Router();

const verificarToken =
    require('../middlewares/auth.middleware');

const uploadPerfil =
    require('../middlewares/uploadPerfil.middleware');

const {
    listarUsuarios,
    adminUpdateUsuario,
    obtenerPerfil,
    actualizarPerfil,
    subirFotoPerfil,
    cambiarPassword,
    eliminarMiCuenta
} = require('../controllers/usuario.controller');

const verificarRol = require('../middlewares/rol.middleware');

// ========================================
// TODAS REQUIEREN JWT
// ========================================
router.use(verificarToken);

// ========================================
// LISTAR USUARIOS (SOLO ADMIN)
// ========================================
router.get(
    '/',
    verificarRol('administrador'),
    listarUsuarios
);

// ========================================
// OBTENER PERFIL
// ========================================
router.get(
    '/perfil',
    obtenerPerfil
);

// ========================================
// ACTUALIZAR PERFIL
// ========================================
router.put(
    '/perfil',
    actualizarPerfil
);

// ========================================
// ACTUALIZAR FOTO DE PERFIL
// ========================================
router.put(
    '/foto',
    uploadPerfil.single('foto'),
    subirFotoPerfil
);

// ========================================
// CAMBIAR CONTRASEÑA
// ========================================
router.put(
    '/password',
    cambiarPassword
);

// ========================================
// ELIMINAR MI CUENTA (derecho de cancelación)
// ========================================
router.delete(
    '/cuenta',
    eliminarMiCuenta
);

// ========================================
// ACTUALIZAR ESTADO / ROL DE UN USUARIO (SOLO ADMIN)
// ========================================
router.patch(
    '/:id',
    verificarRol('administrador'),
    adminUpdateUsuario
);

module.exports = router;