// ============================================================
// RATE LIMITING (express-rate-limit)
// ============================================================
// Protege el API contra abuso y fuerza bruta:
//   - baseLimiter: límite general para todo el API.
//   - loginLimiter: intentos de login.
//   - registroLimiter: creaciones de cuenta.
//   - verificacionLimiter: verificar/reenviar código de email.
//   - twoFaLimiter: endpoints de configuración/verificación 2FA.
// Ventana de 15 minutos para todos los limitadores.
// ============================================================

const rateLimit = require('express-rate-limit');

const config = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        mensaje: 'Demasiadas peticiones. Intenta de nuevo más tarde.'
    }
};

// ========================================
// LÍMITE GENERAL (300 peticiones / 15 min)
// ========================================
const baseLimiter = rateLimit({
    ...config,
    limit: 300
});

// ========================================
// LOGIN (10 intentos / 15 min)
// ========================================
const loginLimiter = rateLimit({
    ...config,
    limit: 10
});

// ========================================
// REGISTRO (5 intentos / 15 min)
// ========================================
const registroLimiter = rateLimit({
    ...config,
    limit: 5
});

// ========================================
// VERIFICAR / REENVIAR CÓDIGO (10 / 15 min)
// ========================================
const verificacionLimiter = rateLimit({
    ...config,
    limit: 10
});

// ========================================
// 2FA (10 / 15 min)
// ========================================
const twoFaLimiter = rateLimit({
    ...config,
    limit: 10
});

// ========================================
// WEBHOOK MERCADO PAGO (60 / 5 min por IP)
// El webhook es público; se limita por IP para
// mitigar abuso/refuerzo sin romper retries legítimos.
// ========================================
const webhookLimit = rateLimit({
    ...config,
    windowMs: 5 * 60 * 1000,
    limit: 60
});

module.exports = {
    baseLimiter,
    loginLimiter,
    registroLimiter,
    verificacionLimiter,
    twoFaLimiter,
    webhookLimit
};