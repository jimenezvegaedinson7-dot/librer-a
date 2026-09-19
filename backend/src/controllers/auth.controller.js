const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const usuarioModel = require('../models/usuario.model');
const { esEmailValido } = require('../utils/validaciones');
const { datosPublicos } = require('./auth2fa.controller');
const {
    enviarCodigoVerificacion,
    enviarCodigoReseteo,
    smtpConfigurado
} = require('../utils/mailer');

// ========================================
// GENERAR CÓDIGO DE VERIFICACIÓN DE 6 DÍGITOS
// ========================================
function generarCodigoVerificacion() {
    return crypto.randomInt(100000, 1000000).toString();
}

// ========================================
// POLÍTICA DE CONTRASEÑAS
// Mínimo 8 caracteres, al menos una letra y un número.
// Devuelve true si es válida o un mensaje de error.
// ========================================
function validarPassword(password) {
    const texto = String(password || '');

    if (texto.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!/[a-zA-Z]/.test(texto)) {
        return 'La contraseña debe contener al menos una letra';
    }

    if (!/\d/.test(texto)) {
        return 'La contraseña debe contener al menos un número';
    }

    return true;
}

// ========================================
// REGISTRO (con verificación de email)
// ========================================
const registrar = async (req, res) => {
    try {

        const {
            nombre,
            apellido,
            email,
            password
        } = req.body;

        // ========================================
        // VALIDACIONES
        // ========================================
        if (
            !nombre ||
            !String(nombre).trim() ||
            !apellido ||
            !String(apellido).trim() ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'Todos los campos son obligatorios'
            });
        }

        if (!esEmailValido(email)) {
            return res.status(400).json({
                success: false,
                mensaje: 'El correo electrónico no es válido'
            });
        }

        // ========================================
        // POLÍTICA DE CONTRASEÑAS
        // ========================================
        const resultadoPassword =
            validarPassword(password);

        if (resultadoPassword !== true) {
            return res.status(400).json({
                success: false,
                mensaje: resultadoPassword
            });
        }

        // ========================================
        // NORMALIZAR EMAIL
        // ========================================
        const emailNormalizado = String(email).trim().toLowerCase();

        // Comprobar si existe
        const usuarioExistente =
            await usuarioModel.buscarPorEmail(emailNormalizado);

        if (usuarioExistente) {
            return res.status(409).json({
                success: false,
                mensaje: 'El correo ya está registrado'
            });
        }

        // Encriptar contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Crear usuario (el modelo SIEMPRE asigna rol = cliente)
        const idUsuario = await usuarioModel.crear({
            nombre: String(nombre).trim(),
            apellido: String(apellido).trim(),
            email: emailNormalizado,
            password: passwordHash
        });

        // ========================================
        // GENERAR Y GUARDAR CÓDIGO DE VERIFICACIÓN
        // ========================================
        const codigo = generarCodigoVerificacion();
        const codigoHash = await bcrypt.hash(codigo, 10);
        const expira = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        await usuarioModel.guardarCodigoVerificacion(
            idUsuario,
            codigoHash,
            expira
        );

        // Enviar el código por correo (fire-and-forget, no bloquear la respuesta)
        enviarCodigoVerificacion({
            destinatario: emailNormalizado,
            codigo,
            nombre: String(nombre).trim(),
        }).catch(errorCorreo => {
            console.error('No se pudo enviar el código de verificación:', errorCorreo.message);
        });

        res.status(201).json({
            success: true,
            mensaje: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.',
            id_usuario: idUsuario,
            requiere_verificacion_email: true
        });

    } catch (error) {

        console.error('Error en registro:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al registrar usuario'
        });
    }
};

// ========================================
// VERIFICAR EMAIL (activar cuenta)
// ========================================
const verificarEmail = async (req, res) => {
    try {

        const {
            email,
            codigo
        } = req.body;

        if (!email || !codigo) {
            return res.status(400).json({
                success: false,
                mensaje: 'Email y código son obligatorios'
            });
        }

        const emailNormalizado = String(email).trim().toLowerCase();

        if (!/^\d{6}$/.test(String(codigo))) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código debe tener 6 dígitos'
            });
        }

        // Buscar usuario por email
        const usuario =
            await usuarioModel.buscarPorEmail(emailNormalizado);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'No se encontró un usuario con ese correo'
            });
        }

        // Si ya estaba verificado
        if (usuario.email_verified_at) {
            return res.status(400).json({
                success: false,
                mensaje: 'El correo ya fue verificado. Ya puedes iniciar sesión.'
            });
        }

        // Debe existir un código guardado
        if (!usuario.email_verification_code || !usuario.email_verification_expires) {
            return res.status(400).json({
                success: false,
                mensaje: 'No hay un código pendiente. Vuélvete a registrar o solicita un nuevo código.'
            });
        }

        // Verificar expiración
        const expira = new Date(usuario.email_verification_expires);
        if (expira < new Date()) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código ha expirado. Solicita uno nuevo.'
            });
        }

        // Comparar el código (hash)
        const codigoCorrecto =
            await bcrypt.compare(String(codigo), usuario.email_verification_code);

        if (!codigoCorrecto) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código es incorrecto'
            });
        }

        // Marcar como verificado
        await usuarioModel.marcarEmailVerificado(usuario.id_usuario);

        res.json({
            success: true,
            mensaje: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.'
        });

    } catch (error) {

        console.error('Error al verificar email:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al verificar el correo'
        });
    }
};

// ========================================
// REENVIAR CÓDIGO DE VERIFICACIÓN
// ========================================
const reenviarCodigo = async (req, res) => {
    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                mensaje: 'El correo es obligatorio'
            });
        }

        const emailNormalizado = String(email).trim().toLowerCase();

        const usuario =
            await usuarioModel.buscarPorEmail(emailNormalizado);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'No se encontró un usuario con ese correo'
            });
        }

        if (usuario.email_verified_at) {
            return res.status(400).json({
                success: false,
                mensaje: 'El correo ya fue verificado'
            });
        }

        const codigo = generarCodigoVerificacion();
        const codigoHash = await bcrypt.hash(codigo, 10);
        const expira = new Date(Date.now() + 10 * 60 * 1000);

        await usuarioModel.guardarCodigoVerificacion(
            usuario.id_usuario,
            codigoHash,
            expira
        );

        // Enviar el código por correo (fire-and-forget, no bloquear la respuesta)
        enviarCodigoVerificacion({
            destinatario: emailNormalizado,
            codigo,
            nombre: usuario.nombre || ''
        }).catch(errorCorreo => {
            console.error('No se pudo reenviar el código de verificación:', errorCorreo.message);
        });

        res.json({
            success: true,
            mensaje: 'Se envió un nuevo código a tu correo.'
        });

    } catch (error) {

        console.error('Error al reenviar código:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al reenviar el código'
        });
    }
};

// ========================================
// SOLICITAR CÓDIGO PARA RESTABLECER CONTRASEÑA
// ========================================
// Envía un código de 6 dígitos al correo del usuario. No requiere JWT.
// Respuesta genérica intencional (no revela si el correo existe) para
// evitar enumeración de cuentas.
// ========================================
const solicitarReseteo = async (req, res) => {
    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                mensaje: 'El correo es obligatorio'
            });
        }

        const emailNormalizado = String(email).trim().toLowerCase();

        const usuario =
            await usuarioModel.buscarPorEmail(emailNormalizado);

        // Respuesta genérica: tanto si el correo no existe como si la cuenta
        // no está verificada, no generamos código ni filtramos la existencia.
        const respuestaGenerica = {
            success: true,
            mensaje: 'Si el correo está registrado, recibirás un código para restablecer tu contraseña.'
        };

        if (!usuario || !usuario.email_verified_at) {
            return res.json(respuestaGenerica);
        }

        const codigo = generarCodigoVerificacion();
        const codigoHash = await bcrypt.hash(codigo, 10);
        const expira = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        // Reutiliza las columnas del código de verificación: una cuenta ya
        // verificada ya no usa ese campo, por lo que no hay conflicto.
        await usuarioModel.guardarCodigoVerificacion(
            usuario.id_usuario,
            codigoHash,
            expira
        );

        // Enviar el código por correo (fire-and-forget, no bloquear la respuesta)
        enviarCodigoReseteo({
            destinatario: emailNormalizado,
            codigo,
            nombre: usuario.nombre || ''
        }).catch(errorCorreo => {
            console.error('No se pudo enviar el código de reseteo:', errorCorreo.message);
        });

        return res.json(respuestaGenerica);

    } catch (error) {

        console.error('Error al solicitar reseteo:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al solicitar el restablecimiento'
        });
    }
};

// ========================================
// RESTABLECER CONTRASEÑA (validar código + nueva clave)
// ========================================
// Valida el código de 6 dígitos enviado por correo y actualiza la
// contraseña. No requiere JWT: la posesión del código recibido en el
// correo del usuario es la prueba de control de la cuenta.
// ========================================
const reestablecerContrasena = async (req, res) => {
    try {

        const {
            email,
            codigo,
            password
        } = req.body;

        if (!email || !codigo || !password) {
            return res.status(400).json({
                success: false,
                mensaje: 'Email, código y nueva contraseña son obligatorios'
            });
        }

        // Validar primero la política de contraseñas para dar errores claros.
        const resultadoPassword =
            validarPassword(password);

        if (resultadoPassword !== true) {
            return res.status(400).json({
                success: false,
                mensaje: resultadoPassword
            });
        }

        const emailNormalizado = String(email).trim().toLowerCase();

        if (!/^\d{6}$/.test(String(codigo))) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código debe tener 6 dígitos'
            });
        }

        const usuario =
            await usuarioModel.buscarPorEmail(emailNormalizado);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje: 'No se encontró un usuario con ese correo'
            });
        }

        if (!usuario.email_verified_at) {
            return res.status(400).json({
                success: false,
                mensaje: 'La cuenta no está verificada. Verifica tu correo primero.'
            });
        }

        // Debe existir un código pendiente
        if (!usuario.email_verification_code || !usuario.email_verification_expires) {
            return res.status(400).json({
                success: false,
                mensaje: 'No hay un código pendiente. Solicita uno nuevo.'
            });
        }

        // Verificar expiración
        const expira = new Date(usuario.email_verification_expires);
        if (expira < new Date()) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código ha expirado. Solicita uno nuevo.'
            });
        }

        // Comparar el código (hash)
        const codigoCorrecto =
            await bcrypt.compare(String(codigo), usuario.email_verification_code);

        if (!codigoCorrecto) {
            return res.status(400).json({
                success: false,
                mensaje: 'El código es incorrecto'
            });
        }

        // Actualizar contraseña y limpiar el código usado.
        const passwordHash = await bcrypt.hash(password, 10);

        await usuarioModel.actualizarPassword(
            usuario.id_usuario,
            passwordHash
        );

        await usuarioModel.limpiarCodigoVerificacion(
            usuario.id_usuario
        );

        res.json({
            success: true,
            mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'
        });

    } catch (error) {

        console.error('Error al restablecer contraseña:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al restablecer la contraseña'
        });
    }
};

// ========================================
// LOGIN
// ========================================
const login = async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                mensaje: 'Email y password son obligatorios'
            });
        }

        // Buscar usuario
        const usuario =
            await usuarioModel.buscarPorEmail(
                String(email).trim().toLowerCase()
            );

        if (!usuario) {
            return res.status(401).json({
                success: false,
                mensaje: 'Email o contraseña incorrectos'
            });
        }

        // Verificar estado
        if (!usuario.estado) {
            return res.status(403).json({
                success: false,
                mensaje: 'El usuario está desactivado'
            });
        }

        // Verificar correo activado (cuenta creada pendiente de verificación)
        if (!usuario.email_verified_at) {
            return res.status(403).json({
                success: false,
                mensaje: 'Debes verificar tu correo antes de iniciar sesión'
            });
        }

        // Comparar contraseña
        const passwordCorrecta =
            await bcrypt.compare(
                password,
                usuario.password
            );

        if (!passwordCorrecta) {
            return res.status(401).json({
                success: false,
                mensaje: 'Email o contraseña incorrectos'
            });
        }

        // ========================================
        // CASO A: Sin 2FA (comportamiento actual)
        // ========================================
        if (Number(usuario.two_factor_enabled) !== 1) {
            const token = jwt.sign(
                {
                    id_usuario: usuario.id_usuario,
                    rol: usuario.rol
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: '24h'
                }
            );

            return res.json({
                success: true,
                mensaje: 'Login exitoso',
                data: datosPublicos(usuario),
                token
            });
        }

        // ========================================
        // CASO B: Con 2FA - pedir OTP
        // ========================================
        const twoFactorToken = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                rol: usuario.rol,
                proposito: '2fa_login'
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '5m'
            }
        );

        return res.json({
            success: true,
            requires_2fa: true,
            mensaje: 'Se requiere código de doble factor',
            two_factor_token: twoFactorToken
        });

    } catch (error) {

        console.error('Error en login:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al iniciar sesión'
        });
    }
};

module.exports = {
    registrar,
    login,
    verificarEmail,
    reenviarCodigo,
    solicitarReseteo,
    reestablecerContrasena,
    validarPassword
};