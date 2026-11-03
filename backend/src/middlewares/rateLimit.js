const rateLimit = require('express-rate-limit');

const config = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, mensaje: 'Demasiadas peticiones. Intenta de nuevo más tarde.' }
};

const limiteGeneral = Number(process.env.RATE_LIMIT_GENERAL) || 300;
const baseLimiter = rateLimit({ ...config, limit: limiteGeneral });
const loginLimiter = rateLimit({ ...config, limit: 10 });
const registroLimiter = rateLimit({ ...config, limit: 5 });
const verificacionLimiter = rateLimit({ ...config, limit: 10 });
const twoFaLimiter = rateLimit({ ...config, limit: 10 });
const webhookLimit = rateLimit({ ...config, windowMs: 5 * 60 * 1000, limit: 60 });
const reclamacionLimiter = rateLimit({ ...config, limit: 5 });

module.exports = { reclamacionLimiter, baseLimiter, loginLimiter, registroLimiter, verificacionLimiter, twoFaLimiter, webhookLimit };
