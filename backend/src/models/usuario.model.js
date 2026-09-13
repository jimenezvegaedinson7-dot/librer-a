const pool = require('../config/database');

// ========================================
// BUSCAR USUARIO POR EMAIL
// (para login: incluye password y 2FA)
// ========================================
const buscarPorEmail = async (email) => {
    const [rows] = await pool.query(
        `
        SELECT
            id_usuario,
            nombre,
            apellido,
            email,
            telefono,
            foto_perfil,
            password,
            rol,
            estado,
            fecha_registro,
            two_factor_enabled,
            two_factor_secret,
            email_verified_at,
            email_verification_code,
            email_verification_expires
        FROM usuarios
        WHERE email = ?
        LIMIT 1
        `,
        [email]
    );

    return rows[0];
};

// ========================================
// LISTAR TODOS LOS USUARIOS
// (para administración, sin contraseña)
// ========================================
const listarTodos = async () => {
    const [rows] = await pool.query(
        `
        SELECT
            id_usuario,
            nombre,
            apellido,
            email,
            telefono,
            foto_perfil,
            rol,
            estado,
            fecha_registro,
            email_verified_at
        FROM usuarios
        ORDER BY fecha_registro DESC, id_usuario DESC
        `
    );

    return rows;
};

// ========================================
// LISTAR USUARIOS CON TOTAL DE COMPRAS
// ========================================
const listarConCompras = async () => {
    const [rows] = await pool.query(
        `
        SELECT
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.email,
            u.telefono,
            u.foto_perfil,
            u.rol,
            u.estado,
            u.fecha_registro,
            u.email_verified_at,
            COUNT(v.id_venta) AS total_compras,
            COALESCE(SUM(v.total), 0) AS total_gastado
        FROM usuarios u
        LEFT JOIN ventas v
            ON v.id_usuario = u.id_usuario
        GROUP BY
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.email,
            u.telefono,
            u.foto_perfil,
            u.rol,
            u.estado,
            u.fecha_registro,
            u.email_verified_at
        ORDER BY u.fecha_registro DESC, u.id_usuario DESC
        `
    );

    return rows;
};

// ========================================
// BUSCAR USUARIO POR ID
// SIN DEVOLVER CONTRASEÑA
// ========================================
const buscarPorId = async (id) => {
    const [rows] = await pool.query(
        `
        SELECT
            id_usuario,
            nombre,
            apellido,
            email,
            telefono,
            foto_perfil,
            rol,
            estado,
            fecha_registro
        FROM usuarios
        WHERE id_usuario = ?
        LIMIT 1
        `,
        [id]
    );

    return rows[0];
};

// ========================================
// BUSCAR USUARIO POR ID
// PARA VALIDAR CONTRASEÑA
// ========================================
const buscarPorIdConPassword = async (id) => {
    const [rows] = await pool.query(
        `
        SELECT
            id_usuario,
            nombre,
            apellido,
            email,
            telefono,
            foto_perfil,
            password,
            rol,
            estado,
            two_factor_enabled
        FROM usuarios
        WHERE id_usuario = ?
        LIMIT 1
        `,
        [id]
    );

    return rows[0];
};

// ========================================
// CREAR USUARIO
// ========================================
const crear = async (usuario) => {
    const {
        nombre,
        apellido,
        email,
        password,
        telefono,
        foto_perfil
    } = usuario;

    const [resultado] = await pool.query(
        `
        INSERT INTO usuarios
        (
            nombre,
            apellido,
            email,
            telefono,
            foto_perfil,
            password,
            rol,
            estado
        )
        VALUES (?, ?, ?, ?, ?, ?, 'cliente', 1)
        `,
        [
            nombre,
            apellido,
            email,
            telefono ?? null,
            foto_perfil ?? null,
            password
        ]
    );

    return resultado.insertId;
};

// ========================================
// VERIFICAR EMAIL DUPLICADO
// ========================================
const existeEmail = async (
    email,
    idUsuario
) => {
    const [rows] = await pool.query(
        `
        SELECT id_usuario
        FROM usuarios
        WHERE email = ?
        AND id_usuario <> ?
        LIMIT 1
        `,
        [
            email,
            idUsuario
        ]
    );

    return rows.length > 0;
};

// ========================================
// ACTUALIZAR PERFIL
// ========================================
const actualizarPerfil = async (
    idUsuario,
    usuario
) => {
    const {
        nombre,
        apellido,
        email,
        telefono,
        foto_perfil
    } = usuario;

    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET
            nombre = COALESCE(?, nombre),
            apellido = COALESCE(?, apellido),
            email = COALESCE(?, email),
            telefono = COALESCE(?, telefono),
            foto_perfil = COALESCE(?, foto_perfil)
        WHERE id_usuario = ?
        `,
        [
            nombre ?? null,
            apellido ?? null,
            email ?? null,
            telefono ?? null,
            foto_perfil ?? null,
            idUsuario
        ]
    );

    return resultado.affectedRows;
};

// ========================================
// ACTUALIZAR FOTO DE PERFIL
// ========================================
const actualizarFotoPerfil = async (
    idUsuario,
    fotoPerfil
) => {
    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET foto_perfil = ?
        WHERE id_usuario = ?
        `,
        [
            fotoPerfil,
            idUsuario
        ]
    );

    return resultado.affectedRows;
};

// ========================================
// ACTUALIZAR CONTRASEÑA
// ========================================
const actualizarPassword = async (
    idUsuario,
    password
) => {
    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET password = ?
        WHERE id_usuario = ?
        `,
        [
            password,
            idUsuario
        ]
    );

    return resultado.affectedRows;
};

// ========================================
// GUARDAR SECRETO 2FA (TOTP)
// ========================================
const guardarSecreto2FA = async (
    idUsuario,
    secretoCifrado
) => {
    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET two_factor_secret = ?
        WHERE id_usuario = ?
        `,
        [
            secretoCifrado,
            idUsuario
        ]
    );

    return resultado.affectedRows;
};

// ========================================
// ACTIVAR 2FA
// ========================================
const activar2FA = async (
    idUsuario,
    secretoCifrado
) => {
    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET
            two_factor_enabled = 1,
            two_factor_secret = ?
        WHERE id_usuario = ?
        `,
        [
            secretoCifrado,
            idUsuario
        ]
    );

    return resultado.affectedRows;
};

// ========================================
// DESACTIVAR 2FA
// ========================================
const desactivar2FA = async (
    idUsuario
) => {
    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET
            two_factor_enabled = 0,
            two_factor_secret = NULL
        WHERE id_usuario = ?
        `,
        [idUsuario]
    );

    return resultado.affectedRows;
};

// ========================================
// OBTENER SECRETO 2FA
// ========================================
const obtenerSecreto2FA = async (
    idUsuario
) => {
    const [rows] = await pool.query(
        `
        SELECT two_factor_secret
        FROM usuarios
        WHERE id_usuario = ?
        LIMIT 1
        `,
        [idUsuario]
    );

    return rows[0]?.two_factor_secret ?? null;
};

// ========================================
// GUARDAR CÓDIGO DE VERIFICACIÓN DE EMAIL
// ========================================
const guardarCodigoVerificacion = async (
    idUsuario,
    codigoHash,
    expira
) => {
    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET
            email_verification_code = ?,
            email_verification_expires = ?
        WHERE id_usuario = ?
        `,
        [
            codigoHash,
            expira,
            idUsuario
        ]
    );

    return resultado.affectedRows;
};

// ========================================
// MARCAR EMAIL COMO VERIFICADO Y LIMPIAR CÓDIGO
// ========================================
const marcarEmailVerificado = async (
    idUsuario
) => {
    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET
            email_verified_at = NOW(),
            email_verification_code = NULL,
            email_verification_expires = NULL
        WHERE id_usuario = ?
        `,
        [idUsuario]
    );

    return resultado.affectedRows;
};

// ========================================
// LIMPIAR CÓDIGO DE VERIFICACIÓN (reintento)
// ========================================
const limpiarCodigoVerificacion = async (
    idUsuario
) => {
    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET
            email_verification_code = NULL,
            email_verification_expires = NULL
        WHERE id_usuario = ?
        `,
        [idUsuario]
    );

    return resultado.affectedRows;
};

// ========================================
// ACTUALIZAR ESTADO Y/O ROL (ADMIN)
// Solo aplica los campos enviados; no pisa
// el otro valor (COALESCE con null).
// ========================================
const actualizarEstadoRol = async (
    idUsuario,
    datos
) => {
    const { estado, rol } = datos;

    const [resultado] = await pool.query(
        `
        UPDATE usuarios
        SET
            estado = COALESCE(?, estado),
            rol = COALESCE(?, rol)
        WHERE id_usuario = ?
        `,
        [
            estado === undefined ? null : estado,
            rol ?? null,
            idUsuario
        ]
    );

    return resultado.affectedRows;
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    buscarPorEmail,
    buscarPorId,
    listarTodos,
    listarConCompras,
    buscarPorIdConPassword,
    crear,
    existeEmail,
    actualizarPerfil,
    actualizarFotoPerfil,
    actualizarPassword,
    actualizarEstadoRol,
    guardarSecreto2FA,
    activar2FA,
    desactivar2FA,
    obtenerSecreto2FA,
    guardarCodigoVerificacion,
    marcarEmailVerificado,
    limpiarCodigoVerificacion
};