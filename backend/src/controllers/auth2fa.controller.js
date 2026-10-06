const otplib = require('otplib');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const usuarioModel = require('../models/usuario.model');
const { cifrar, descifrar } = require('../utils/crypto');
const { validarId } = require('../utils/validaciones');

// ========================================
// CONFIGURACIÓN TOTP
// ========================================
// Nota (otplib v13): la opción legacy `window` ya no se aplica, por lo que
// la tolerancia temporal se configura con `epochTolerance` (en segundos).
// Período actual de 30s y ±1 período. El paso aceptado se consume en BD.
const TOTP_WINDOW = 30;

// ========================================
// GENERAR NOMBRE DE APLICACIÓN PARA OTPAUTH
// ========================================
const getAppName = () => {
    // Sin acentos para máxima compatibilidad
    // con Google Authenticator.
    return 'Libreria';
};

// ========================================
// VALIDAR CÓDIGO OTP (6 dígitos)
// ========================================
const esCodigoValido = (codigo) => {
    return (
        codigo &&
        /^\d{6}$/.test(String(codigo))
    );
};

// ========================================
// VERIFICAR TOTP CONTRA EL SECRETO
// ========================================
const verificarTOTP = (codigo, secreto) => {
    try {
        const resultado = otplib.verifySync({
            token: String(codigo),
            secret: secreto,
            epochTolerance: TOTP_WINDOW
        });

        return resultado.valid === true && Number.isSafeInteger(resultado.timeStep) ? resultado : null;
    } catch (error) {
        console.error('Error al verificar TOTP:', error.message);
        return null;
    }
};

// ========================================
// SANITIZAR DATOS DE USUARIO
// Nunca devolver password ni secreto 2FA
// ========================================
const datosPublicos = (usuario) => {
    return {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono,
        foto_perfil: usuario.foto_perfil,
        rol: usuario.rol,
        estado: usuario.estado,
        fecha_registro: usuario.fecha_registro,
        two_factor_enabled: usuario.two_factor_enabled
    };
};

// ========================================
// PASO 1: SETUP - GENERAR SECRETO + QR
// Requiere JWT. NO activa 2FA todavía.
// ========================================
const setup = async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;

        const { password } = req.body || {};
        if (typeof password !== 'string' || !password) {
            return res.status(400).json({ success: false, mensaje: 'Confirma tu contraseña actual para activar el doble factor' });
        }
        const usuario = await usuarioModel.buscarPorIdConPassword(idUsuario);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        const estado2FA =
            Number(usuario.two_factor_enabled);

        // Si ya tiene 2FA activo, rechazar
        if (estado2FA === 1) {
            return res.status(409).json({
                success: false,
                mensaje: 'Ya tienes el doble factor de autenticación activado'
            });
        }

        if (!await bcrypt.compare(password, usuario.password)) {
            return res.status(400).json({ success: false, mensaje: 'La contraseña actual es incorrecta' });
        }

        // Generar secreto TOTP (Base32)
        const secreto = otplib.generateSecret();

        // Guardar secreto provisional (cifrado)
        const guardado = await usuarioModel.guardarSecreto2FA(
            idUsuario,
            cifrar(secreto),
            Number(usuario.sesion_version ?? 0)
        );
        if (!guardado) return res.status(409).json({ success: false, mensaje: 'La sesión o la configuración cambió. Intenta nuevamente.' });
        const setupToken = jwt.sign({ id_usuario: idUsuario, proposito: '2fa_setup',
            sesion_version: Number(usuario.sesion_version ?? 0),
            secreto_hash: crypto.createHash('sha256').update(secreto).digest('hex') },
            process.env.JWT_SECRET, { expiresIn: '5m' });

        // Generar otpauth URL
        const otpauthUrl = otplib.generateURI({
            issuer: getAppName(),
            label: usuario.email,
            secret: secreto
        });

        // Generar QR (data URL)
        const qrCode = await QRCode.toDataURL(otpauthUrl);

        return res.json({
            success: true,
            mensaje: 'Escanea el código QR con Google Authenticator',
            data: {
                secret: secreto,
                setup_token: setupToken,
                otpauth_url: otpauthUrl,
                qr: qrCode,
                app: getAppName(),
                email: usuario.email,
                two_factor_enabled: 0
            }
        });

    } catch (error) {
        console.error('Error en setup 2FA:', error);

        return res.status(500).json({
            success: false,
            mensaje: 'Error al configurar el doble factor'
        });
    }
};

// ========================================
// PASO 2: CONFIRMAR - VALIDAR OTP Y ACTIVAR
// Requiere JWT.
// ========================================
const confirmar = async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;
        const { codigo, setup_token: setupToken } = req.body;
        let autorizacion;
        try { autorizacion = jwt.verify(setupToken, process.env.JWT_SECRET); }
        catch { return res.status(400).json({ success: false, mensaje: 'Confirma nuevamente tu contraseña para iniciar la configuración' }); }
        if (autorizacion.proposito !== '2fa_setup' || Number(autorizacion.id_usuario) !== Number(idUsuario)) {
            return res.status(400).json({ success: false, mensaje: 'La autorización de configuración no es válida' });
        }

        if (!esCodigoValido(codigo)) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código OTP debe tener 6 dígitos'
            });
        }

        const usuario = await buscarUsuarioConSecreto(idUsuario);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        if (Number(usuario.two_factor_enabled) === 1) {
            return res.status(409).json({
                success: false,
                mensaje: 'Ya tienes el doble factor activado'
            });
        }

        if (!usuario.secreto) {
            return res.status(400).json({
                success: false,
                mensaje: 'Primero debes iniciar la configuración del doble factor'
            });
        }

        // La prueba de contraseña está vinculada a este secreto y versión.
        if (Number(autorizacion.sesion_version) !== Number(usuario.sesion_version ?? 0) ||
            autorizacion.secreto_hash !== crypto.createHash('sha256').update(usuario.secreto).digest('hex')) {
            return res.status(409).json({ success: false, mensaje: 'La configuración cambió. Confirma tu contraseña nuevamente.' });
        }
        const otp = verificarTOTP(codigo, usuario.secreto);
        if (!otp) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código OTP es incorrecto o ha expirado'
            });
        }

        // Activar 2FA de forma definitiva
        const activado = await usuarioModel.activar2FA(
            idUsuario,
            usuario.secretoCifrado,
            otp.timeStep,
            Number(usuario.sesion_version ?? 0)
        );
        if (!activado) return res.status(409).json({ success: false, mensaje: 'La configuración cambió. Intenta nuevamente.' });

        return res.json({
            success: true,
            mensaje: 'Doble factor activado correctamente'
        });

    } catch (error) {
        console.error('Error en confirmar 2FA:', error);

        return res.status(500).json({
            success: false,
            mensaje: 'Error al confirmar el doble factor'
        });
    }
};

// ========================================
// VERIFICAR LOGIN CON OTP
// Requiere two_factor_token temporal.
// ========================================
const verificarLogin = async (req, res) => {
    try {
        const {
            two_factor_token,
            codigo
        } = req.body;

        if (!two_factor_token || !codigo) {
            return res.status(400).json({
                success: false,
                mensaje: 'two_factor_token y codigo son obligatorios'
            });
        }

        if (!esCodigoValido(codigo)) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código OTP debe tener 6 dígitos'
            });
        }

        // Verificar token temporal
        let payload;

        try {
            payload = jwt.verify(
                two_factor_token,
                process.env.JWT_SECRET
            );
        } catch (error) {
            return res.status(401).json({
                success: false,
                mensaje: 'El token temporal es inválido o ha expirado'
            });
        }

        // Verificar propósito 2FA
        if (payload.proposito !== '2fa_login') {
            return res.status(401).json({
                success: false,
                mensaje: 'Token temporal no válido para este proceso'
            });
        }

        const idUsuario = validarId(payload.id_usuario);

        if (!idUsuario) {
            return res.status(401).json({
                success: false,
                mensaje: 'Token temporal inválido'
            });
        }

        // Buscar usuario con secreto
        const usuario = await buscarUsuarioConSecreto(idUsuario);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        // Verificar estado
        if (Number(payload.sesion_version ?? 0) !== Number(usuario.sesion_version ?? 0)) {
            return res.status(401).json({ success: false, mensaje: 'Tu contraseña cambió. Inicia sesión nuevamente.' });
        }
        if (!usuario.estado) {
            return res.status(403).json({
                success: false,
                mensaje: 'El usuario está desactivado'
            });
        }

        // Verificar que tenga 2FA activo
        if (Number(usuario.two_factor_enabled) !== 1 || !usuario.secreto) {
            return res.status(400).json({
                success: false,
                mensaje: 'Este usuario no tiene el doble factor activado'
            });
        }

        // Validar y consumir OTP antes de emitir una sesión.
        const otp = verificarTOTP(codigo, usuario.secreto);
        if (!otp || !await usuarioModel.consumirOtp2FA(idUsuario, usuario.secretoCifrado, otp.timeStep, Number(usuario.sesion_version ?? 0))) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código OTP es incorrecto o ha expirado'
            });
        }

        // Generar JWT definitivo
        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                sesion_version: Number(usuario.sesion_version ?? 0),
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const pub = datosPublicos(usuario);

        return res.json({
            success: true,
            mensaje: 'Login exitoso',
            data: pub,
            token
        });

    } catch (error) {
        console.error('Error en verificarLogin 2FA:', error);

        return res.status(500).json({
            success: false,
            mensaje: 'Error al verificar el código de doble factor'
        });
    }
};

// ========================================
// DESACTIVAR 2FA
// Requiere JWT + password + codigo OTP.
// ========================================
const desactivar = async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;

        const {
            password,
            codigo
        } = req.body;

        if (!password || !codigo) {
            return res.status(400).json({
                success: false,
                mensaje: 'password y codigo son obligatorios'
            });
        }

        if (!esCodigoValido(codigo)) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código OTP debe tener 6 dígitos'
            });
        }

        const usuario = await usuarioModel.buscarPorIdConPassword(idUsuario);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        if (Number(usuario.two_factor_enabled) !== 1) {
            return res.status(400).json({
                success: false,
                mensaje: 'No tienes el doble factor activado'
            });
        }

        // Verificar contraseña
        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                success: false,
                mensaje: 'La contraseña es incorrecta'
            });
        }

        // Obtener secreto descifrado y validar OTP
        const secretoCifrado =
            await usuarioModel.obtenerSecreto2FA(idUsuario);

        const secreto = descifrar(secretoCifrado);

        if (!secreto) {
            return res.status(400).json({
                success: false,
                mensaje: 'No se encontró el secreto de doble factor'
            });
        }

        const otp = verificarTOTP(codigo, secreto);
        if (!otp || !await usuarioModel.consumirOtp2FA(idUsuario, secretoCifrado, otp.timeStep, Number(usuario.sesion_version ?? 0))) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código OTP es incorrecto o ha expirado'
            });
        }

        // Desactivar 2FA
        await usuarioModel.desactivar2FA(idUsuario);

        return res.json({
            success: true,
            mensaje: 'Doble factor desactivado correctamente'
        });

    } catch (error) {
        console.error('Error en desactivar 2FA:', error);

        return res.status(500).json({
            success: false,
            mensaje: 'Error al desactivar el doble factor'
        });
    }
};
const buscarUsuarioConSecreto = async (idUsuario) => {
    const usuarioConPassword =
        await usuarioModel.buscarPorIdConPassword(idUsuario);

    if (!usuarioConPassword) {
        return null;
    }

    const secretoCifrado =
        await usuarioModel.obtenerSecreto2FA(idUsuario);

    return {
        ...usuarioConPassword,
        secretoCifrado,
        secreto: descifrar(secretoCifrado)
    };
};
module.exports = {
    setup,
    confirmar,
    verificarLogin,
    desactivar,
    datosPublicos
};
