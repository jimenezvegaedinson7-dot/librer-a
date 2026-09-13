const jwt = require('jsonwebtoken');
const pool = require('../config/database');

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
                email
            FROM usuarios
            WHERE id_usuario = ?
            LIMIT 1
            `,
            [idUsuario]
        );

        const datos = rows[0]
            ? {
                estado: Number(rows[0].estado),
                rol: rows[0].rol || null,
                email: rows[0].email || null
            }
            : null;

        return datos;

    } catch (error) {
        console.error(
            '[auth] Error al consultar estado del usuario:',
            error.message
        );

        return null;
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
            datosUsuario.estado === null
        ) {
            return res.status(401).json({
                success: false,
                mensaje: 'Token inválido'
            });
        }

        if (datosUsuario.estado === 0) {
            return res.status(401).json({
                success: false,
                mensaje: 'Cuenta desactivada'
            });
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
