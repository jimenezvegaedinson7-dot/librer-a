const cors = require('cors');

const crearCors = (env = process.env, logger = console) => {
    const permitidos = (env.FRONTEND_ORIGINS || 'http://localhost:5173')
        .split(',').map(origin => origin.trim()).filter(Boolean);
    let previews = null;
    try {
        previews = new RegExp(env.FRONTEND_ORIGINS_REGEX ||
            '^https://libreria-[a-z0-9-]+-jimenezvegaedinson7-dot\\.vercel\\.app$');
    } catch {
        // Fail-closed: regex inválida desactiva previews, conserva la lista
        // explícita. No se registra el valor de la variable.
        logger.error('[CORS] FRONTEND_ORIGINS_REGEX inválida: previews desactivados; se conserva FRONTEND_ORIGINS');
    }
    return cors({
        origin: (origin, callback) => callback(null,
            !origin || permitidos.includes(origin) || Boolean(previews && previews.test(origin)))
    });
};
module.exports = crearCors;
