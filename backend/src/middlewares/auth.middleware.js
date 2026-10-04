const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { esRolValido } = require('../utils/roles');

// ========================================
// El estado, rol y email se consultan en cada request para que una
// desactivación o cambio de privilegios tenga efecto inmediato.
// ========================================
const obtenerEstadoUsuario = async (idUsuario) => {
    if (!idUsuario) {
        return null;
    }

    try {
        const [rows] = await pool.query(
            `
            SELECT
                id_usuario,
                estado,
                rol,
                email,
                fecha_eliminacion,
                sesion_version
            FROM usuarios
            WHERE id_usuario = ?
            LIMIT 1
            `,
            [idUsuario]
        );

        const datos = rows[0]
            ? {
                estado: Number(rows[0].estado),
                eliminada: Boolean(rows[0].fecha_eliminacion),
                rol: rows[0].rol || null,
                email: rows[0].email || null,
                versionSesion: Number(rows[0].sesion_version ?? 0)
            }
            : null;

        return datos;

    } catch (error) {
        console.error(
            '[auth] Error al consultar estado del usuario:',
            error.message
        );

        throw Object.assign(error, { status: 503 });
    }
};

const verificarToken = async (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                mensaje: 'Token no proporcionado'
            });
        }

        const partes = authHeader.split(' ');

        if (partes.length !== 2 || partes[0] !== 'Bearer') {
            return res.status(401).json({
                success: false,
                mensaje: 'Formato de token inválido'
            });
        }

        const token = partes[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Un desafío de 2FA tiene firma válida, pero todavía no es una
        // sesión. Solo el endpoint de verificación OTP puede consumirlo.
        if (!decoded || typeof decoded !== 'object' ||
            Object.prototype.hasOwnProperty.call(decoded, 'proposito')) {
            return res.status(401).json({
                success: false,
                codigo: 'TOKEN_NO_ES_SESION',
                mensaje: 'Completa la verificación de acceso antes de continuar'
            });
        }

        // ========================================
        // REVALIDAR ESTADO Y ROL CONTRA LA BD
        // El token puede tener privilegios residuales (p. ej.
        // un admin degradado a cliente): aquí se sobrescriben
        // `rol` y `estado` con los valores frescos de MySQL.
        // ========================================
        const datosUsuario =
            await obtenerEstadoUsuario(
                decoded.id_usuario
            );

        if (
            !datosUsuario ||
            datosUsuario.estado === null || !esRolValido(datosUsuario.rol)
        ) {
            return res.status(401).json({
                success: false,
                mensaje: 'Token inválido'
            });
        }

        if (datosUsuario.estado !== 1 || datosUsuario.eliminada) {
            return res.status(401).json({
                success: false,
                mensaje: 'Cuenta desactivada'
            });
        }

        if (Number(decoded.sesion_version ?? 0) !== datosUsuario.versionSesion) {
            return res.status(401).json({ success: false, codigo: 'SESSION_REVOKED',
                mensaje: 'Tu contraseña cambió. Inicia sesión nuevamente.' });
        }

        req.usuario = {
            ...decoded,
            rol:
                datosUsuario.rol ??
                decoded.rol,
            estado:
                datosUsuario.estado,
            email:
                datosUsuario.email ??
                decoded.email ??
                null
        };

        next();

    } catch (error) {

        if (error.status === 503) return res.status(503).json({
            success: false,
            mensaje: 'No se pudo comprobar tu sesión en este momento. Reintenta.'
        });

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                mensaje: 'El token ha expirado'
            });
        }

        return res.status(401).json({
            success: false,
            mensaje: 'Token inválido'
        });
    }
};

module.exports = verificarToken;
