const express = require('express');

const router = express.Router();

const authController = require('../controllers/auth.controller');
const auth2faController = require('../controllers/auth2fa.controller');
const verificarToken = require('../middlewares/auth.middleware');
const { loginLimiter, registroLimiter, verificacionLimiter, twoFaLimiter } = require('../middlewares/rateLimit');

router.post('/registro', registroLimiter, authController.registrar);
router.post('/login', loginLimiter, authController.login);
router.post('/verificar-email', verificacionLimiter, authController.verificarEmail);
router.post('/reenviar-codigo', verificacionLimiter, authController.reenviarCodigo);
router.post('/solicitar-reseteo', verificacionLimiter, authController.solicitarReseteo);
router.post('/verificar-reseteo', verificacionLimiter, authController.verificarReseteo);
router.post('/reestablecer-contrasena', verificacionLimiter, authController.reestablecerContrasena);
router.post('/2fa/verify-login', twoFaLimiter, auth2faController.verificarLogin);
router.post('/2fa/setup', verificarToken, twoFaLimiter, auth2faController.setup);
router.post('/2fa/confirm', verificarToken, twoFaLimiter, auth2faController.confirmar);
router.post('/2fa/disable', verificarToken, twoFaLimiter, auth2faController.desactivar);

module.exports = router;
