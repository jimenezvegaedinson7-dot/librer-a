const express = require('express');

const router = express.Router();

const authController = require('../controllers/auth.controller');
const auth2faController = require('../controllers/auth2fa.controller');

const verificarToken = require('../middlewares/auth.middleware');

const {
    loginLimiter,
    registroLimiter,
    verificacionLimiter,
    twoFaLimiter
} = require('../middlewares/rateLimit');

// ========================================
// REGISTRO / LOGIN
// ========================================
router.post('/registro', registroLimiter, authController.registrar);

router.post('/login', loginLimiter, authController.login);

// ========================================
// VERIFICAR EMAIL (registro) - NO requiere JWT
// ========================================
router.post('/verificar-email', verificacionLimiter, authController.verificarEmail);

// Reenviar código de verificación
router.post('/reenviar-codigo', verificacionLimiter, authController.reenviarCodigo);

// ========================================
// VERIFICAR LOGIN CON OTP (2FA)
// Requiere two_factor_token temporal
// ========================================
router.post(
    '/2fa/verify-login',
    twoFaLimiter,
    auth2faController.verificarLogin
);

// ========================================
// CONFIGURACIÓN 2FA (requiere JWT)
// ========================================
router.post(
    '/2fa/setup',
    verificarToken,
    twoFaLimiter,
    auth2faController.setup
);

// ========================================
// CONFIRMAR 2FA (requiere JWT)
// ========================================
router.post(
    '/2fa/confirm',
    verificarToken,
    twoFaLimiter,
    auth2faController.confirmar
);

// ========================================
// DESACTIVAR 2FA (requiere JWT)
// ========================================
router.post(
    '/2fa/disable',
    verificarToken,
    twoFaLimiter,
    auth2faController.desactivar
);

module.exports = router;