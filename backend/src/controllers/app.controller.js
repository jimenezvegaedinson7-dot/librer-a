const appVersionService = require('../services/appVersion.service');

const obtenerVersion = (_req, res) => {
    try {
        const { datos, error } = appVersionService.obtenerConfiguracion();
        if (error) {
            console.error('[app-version] Configuración inválida:', error);
            return res.status(503).json({ success: false, mensaje: 'Información de versión no disponible' });
        }
        res.set('Cache-Control', 'no-store');
        return res.status(200).json(datos);
    } catch (error) {
        console.error('[app-version] Error al leer la versión:', error.message);
        return res.status(503).json({ success: false, mensaje: 'Información de versión no disponible' });
    }
};

module.exports = { obtenerVersion };
