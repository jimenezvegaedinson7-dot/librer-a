const { ROLES, esPersonalInterno, normalizar, esRolValido } = require('../utils/roles');

const SIN_AUTENTICAR = 'Usuario no autenticado';
const SIN_PERMISOS = 'No tienes permisos para realizar esta acción.';

const verificarRol = (...rolesPermitidos) => {
    const permitidos = rolesPermitidos.map((rol) => normalizar(rol)).filter(esRolValido);

    const middleware = (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ success: false, mensaje: SIN_AUTENTICAR });
        }

        if (permitidos.length === 0) {
            console.error('[rol] verificarRol() sin roles definidos en', req.originalUrl);

            return res.status(403).json({ success: false, mensaje: SIN_PERMISOS });
        }

        if (!permitidos.includes(normalizar(req.usuario.rol))) {
            return res.status(403).json({ success: false, mensaje: SIN_PERMISOS });
        }

        next();
    };

    middleware.rolesPermitidos = permitidos;

    return middleware;
};

const verificarPanel = verificarRol(ROLES.ADMINISTRADOR);

module.exports = verificarRol;
module.exports.verificarRol = verificarRol;
module.exports.verificarPanel = verificarPanel;
module.exports.esPersonalInterno = esPersonalInterno;
