const express = require('express');
const helmet = require('helmet');
const path = require('path');
const crearCors = require('../config/cors');
const { baseLimiter } = require('../middlewares/rateLimit');
const manejarErrores = require('../middlewares/error.middleware');
const { montarRutas } = require('./rutas');

function crearApp() {
    const app = express();
    app.set('trust proxy', ['1', 'true'].includes(String(process.env.TRUST_PROXY || '').toLowerCase()) ? 1 : false);
    app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use(crearCors());
    app.use(express.json({ limit: '1mb' }));
    app.use(baseLimiter);
    app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

    montarRutas(app);

    app.use((req, res) => {
        res.status(404).json({ success: false, mensaje: 'Ruta no encontrada' });
    });
    app.use(manejarErrores);
    return app;
}

module.exports = { crearApp };
