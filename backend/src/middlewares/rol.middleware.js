const {
    ROLES,
    esPersonalInterno,
    normalizar,
} = require('../utils/roles');

// ============================================================
// PERMISOS POR ROL
// Uso:
//   verificarRol(ROLES.ADMINISTRADOR)
//   verificarRol(ROLES.ADMINISTRADOR, ROLES.CAJERO)
// Acepta uno o varios roles; si el usuario tiene cualquiera de
// ellos, la petición continúa. `req.usuario` lo arma
// auth.middleware.js releyendo rol y estado desde la base, así que
// un cambio de rol surte efecto en la petición siguiente.
// ============================================================

const SIN_AUTENTICAR = 'Usuario no autenticado';
const SIN_PERMISOS = 'No tienes permisos para realizar esta acción.';

const verificarRol = (...rolesPermitidos) => {
    const permitidos = rolesPermitidos
        .map((rol) => normalizar(rol))
        .filter(Boolean);

    const middleware = (req, res, next) => {

        if (!req.usuario) {
            return res.status(401).json({
                success: false,
                mensaje: SIN_AUTENTICAR
            });
        }

        if (permitidos.length === 0) {
            // Configuración incorrecta de la ruta: se rechaza
            // en vez de dejar pasar la petición.
            console.error(
                '[rol] verificarRol() sin roles definidos en',
                req.originalUrl
            );

            return res.status(403).json({
                success: false,
                mensaje: SIN_PERMISOS
            });
        }

        if (
            !permitidos.includes(
                normalizar(req.usuario.rol)
            )
        ) {
            return res.status(403).json({
                success: false,
                mensaje: SIN_PERMISOS
            });
        }

        next();
    };

    // Se expone qué roles admite cada middleware. No cambia el
    // comportamiento: sirve para inspeccionar las rutas en las
    // pruebas y para depurar permisos.
    middleware.rolesPermitidos = permitidos;

    return middleware;
};

// Atajo para el panel: SOLO administrador (contrato actual: el
// cajero y el cliente reciben 403 en todas las rutas del panel).
const verificarPanel = verificarRol(ROLES.ADMINISTRADOR);

module.exports = verificarRol;
module.exports.verificarRol = verificarRol;
module.exports.verificarPanel = verificarPanel;
module.exports.esPersonalInterno = esPersonalInterno;
