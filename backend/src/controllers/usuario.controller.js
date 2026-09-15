const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = require('../config/database');

const usuarioModel = require('../models/usuario.model');
const {
    esEmailValido,
    esEstadoValido,
    validarId
} = require('../utils/validaciones');
const {
    validarPassword
} = require('./auth.controller');
const {
    eliminarImagen,
    publicIdDesdeUrl
} = require('../utils/cloudinary');

// ========================================
// ESTADO 2FA DEL USUARIO
// (misma fuente que usa auth2fa: columna two_factor_enabled)
// ========================================
const obtenerTwoFactorEnabled = async (idUsuario) => {
    const [filas] = await pool.query(`
        SELECT two_factor_enabled
        FROM usuarios
        WHERE id_usuario = ?
        LIMIT 1
    `, [idUsuario]);

    return filas.length > 0
        ? Number(filas[0].two_factor_enabled) === 1
        : false;
};

// ========================================
// LISTAR TODOS LOS USUARIOS (ADMIN)
// ========================================
const listarUsuarios = async (req, res) => {
    try {
        const incluirCompras = req.query.detalles === 'true';

        const usuarios =
            incluirCompras
                ? await usuarioModel.listarConCompras()
                : await usuarioModel.listarTodos();

        return res.json({
            success: true,
            data: usuarios
        });

    } catch (error) {
        console.error(
            'Error al listar usuarios:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al listar los usuarios',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// ACTUALIZAR ESTADO / ROL DE UN USUARIO (ADMIN)
// PATCH /api/usuarios/:id
// ========================================
const adminUpdateUsuario = async (req, res) => {
    try {
        const idUsuario =
            validarId(req.params.id);

        if (!idUsuario) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'ID de usuario inválido'
            });
        }

        // ========================================
        // VERIFICAR QUE EL USUARIO EXISTE
        // ========================================
        const usuario =
            await usuarioModel.buscarPorId(
                idUsuario
            );

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Usuario no encontrado'
            });
        }

        // ========================================
        // NADIE PUEDE MODIFICAR SU PROPIO ESTADO/ROL
        // ========================================
        if (
            Number(
                req.usuario.id_usuario
            ) === Number(idUsuario)
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'No puedes modificar tu propio estado o rol'
            });
        }

        const { estado, rol } =
            req.body;

        if (
            estado === undefined &&
            rol === undefined
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Debes enviar al menos un campo para actualizar (estado o rol)'
            });
        }

        // ========================================
        // VALIDAR ROL
        // ========================================
        if (
            rol !== undefined &&
            !['administrador', 'cliente'].includes(
                rol
            )
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El rol debe ser "administrador" o "cliente"'
            });
        }

        // ========================================
        // VALIDAR ESTADO (0 o 1)
        // ========================================
        if (
            estado !== undefined &&
            !esEstadoValido(estado)
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El estado debe ser 0 o 1'
            });
        }

        // ========================================
        // ACTUALIZAR
        // ========================================
        await usuarioModel.actualizarEstadoRol(
            idUsuario,
            {
                estado:
                    estado === undefined
                        ? undefined
                        : Number(estado),

                rol: rol === undefined
                    ? null
                    : rol
            }
        );

        const actualizado =
            await usuarioModel.buscarPorId(
                idUsuario
            );

        return res.json({
            success: true,
            mensaje:
                'Usuario actualizado correctamente',
            data: {
                id_usuario:
                    actualizado.id_usuario,
                nombre_completo:
                    `${actualizado.nombre} ${actualizado.apellido}`.trim(),
                email: actualizado.email,
                rol: actualizado.rol,
                estado: actualizado.estado,
                fecha_registro:
                    actualizado.fecha_registro
            }
        });

    } catch (error) {
        console.error(
            'Error al actualizar usuario (admin):',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al actualizar el usuario',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// OBTENER PERFIL DEL USUARIO AUTENTICADO
// ========================================
const obtenerPerfil = async (req, res) => {
    try {
        const idUsuario =
            req.usuario.id_usuario;

        const usuario =
            await usuarioModel.buscarPorId(
                idUsuario
            );

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Usuario no encontrado'
            });
        }

        const twoFactorEnabled =
            await obtenerTwoFactorEnabled(
                idUsuario
            );

        return res.json({
            success: true,
            data: {
                ...usuario,
                two_factor_enabled:
                    twoFactorEnabled
            }
        });

    } catch (error) {
        console.error(
            'Error al obtener perfil:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener el perfil',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// ACTUALIZAR PERFIL
// ========================================
const actualizarPerfil = async (req, res) => {
    try {
        const idUsuario =
            req.usuario.id_usuario;

        const {
            nombre,
            apellido,
            email,
            telefono
        } = req.body;

        // ========================================
        // VALIDACIONES
        // ========================================
        if (
            !nombre ||
            !String(nombre).trim() ||
            !apellido ||
            !String(apellido).trim() ||
            !email
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Nombre, apellido y correo son obligatorios'
            });
        }

        if (!esEmailValido(email)) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El correo electrónico no es válido'
            });
        }

        // ========================================
        // VERIFICAR EMAIL DUPLICADO
        // ========================================
        const emailExiste =
            await usuarioModel.existeEmail(
                email.trim(),
                idUsuario
            );

        if (emailExiste) {
            return res.status(409).json({
                success: false,
                mensaje:
                    'El correo ingresado ya está registrado'
            });
        }

        // ========================================
        // ACTUALIZAR
        // ========================================
        await usuarioModel.actualizarPerfil(
            idUsuario,
            {
                nombre:
                    nombre.trim(),

                apellido:
                    apellido.trim(),

                email:
                    email.trim(),

                telefono:
                    telefono?.trim() ||
                    null
            }
        );

        // ========================================
        // OBTENER DATOS ACTUALIZADOS
        // ========================================
        const usuarioActualizado =
            await usuarioModel.buscarPorId(
                idUsuario
            );

        const twoFactorEnabled =
            await obtenerTwoFactorEnabled(
                idUsuario
            );

        return res.json({
            success: true,
            mensaje:
                'Perfil actualizado correctamente',
            data: {
                ...usuarioActualizado,
                two_factor_enabled:
                    twoFactorEnabled
            }
        });

    } catch (error) {
        console.error(
            'Error al actualizar perfil:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al actualizar el perfil',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// SUBIR / ACTUALIZAR FOTO DE PERFIL
// ========================================
const subirFotoPerfil = async (req, res) => {
    try {
        const idUsuario =
            req.usuario.id_usuario;

        // ========================================
        // VALIDAR ARCHIVO
        // ========================================
        if (!req.file) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Debes seleccionar una imagen'
            });
        }

        // ========================================
        // OBTENER USUARIO ACTUAL
        // ========================================
        const usuario =
            await usuarioModel.buscarPorId(
                idUsuario
            );

        if (!usuario) {
            // limpiar archivo recién subido
            if (req.file?.cloudinaryUrl) {
                try {
                    await eliminarImagen(
                        publicIdDesdeUrl(req.file.cloudinaryUrl)
                    );
                } catch (errorEliminar) {
                    console.error(
                        'No se pudo eliminar la foto en Cloudinary:',
                        errorEliminar.message
                    );
                }
            } else if (
                req.file?.path &&
                fs.existsSync(req.file.path)
            ) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(404).json({
                success: false,
                mensaje:
                    'Usuario no encontrado'
            });
        }

        // ========================================
        // NUEVA RUTA
        // ========================================
        const nuevaFoto =
            req.file.cloudinaryUrl ||
            `/uploads/perfiles/${req.file.filename}`;

        // ========================================
        // ACTUALIZAR EN BD
        // ========================================
        await usuarioModel.actualizarFotoPerfil(
            idUsuario,
            nuevaFoto
        );

        // ========================================
        // ELIMINAR FOTO ANTERIOR
        // ========================================
        if (
            usuario.foto_perfil &&
            usuario.foto_perfil !== nuevaFoto
        ) {
            try {
                const publicIdAnterior =
                    publicIdDesdeUrl(
                        usuario.foto_perfil
                    );

                if (publicIdAnterior) {
                    await eliminarImagen(publicIdAnterior);
                } else {
                    const rutaAnterior =
                        path.join(
                            __dirname,
                            '../..',
                            usuario.foto_perfil.replace(
                                /^\/+/,
                                ''
                            )
                        );

                    if (
                        fs.existsSync(
                            rutaAnterior
                        )
                    ) {
                        fs.unlinkSync(
                            rutaAnterior
                        );
                    }
                }

            } catch (errorEliminar) {
                console.error(
                    'No se pudo eliminar la foto anterior:',
                    errorEliminar.message
                );
            }
        }

        // ========================================
        // OBTENER PERFIL ACTUALIZADO
        // ========================================
        const usuarioActualizado =
            await usuarioModel.buscarPorId(
                idUsuario
            );

        const twoFactorEnabled =
            await obtenerTwoFactorEnabled(
                idUsuario
            );

        return res.json({
            success: true,
            mensaje:
                'Foto de perfil actualizada correctamente',
            data: {
                ...usuarioActualizado,
                two_factor_enabled:
                    twoFactorEnabled
            }
        });

    } catch (error) {
        console.error(
            'Error al actualizar foto de perfil:',
            error
        );

        // ========================================
        // SI FALLA, BORRAR ARCHIVO NUEVO
        // ========================================
        try {
            if (req.file?.cloudinaryUrl) {
                await eliminarImagen(
                    publicIdDesdeUrl(req.file.cloudinaryUrl)
                );
            } else if (
                req.file?.path &&
                fs.existsSync(req.file.path)
            ) {
                fs.unlinkSync(
                    req.file.path
                );
            }
        } catch (errorEliminar) {
            console.error(
                'Error al eliminar archivo temporal:',
                errorEliminar.message
            );
        }

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al actualizar la foto de perfil',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// CAMBIAR CONTRASEÑA
// ========================================
const cambiarPassword = async (req, res) => {
    try {
        const idUsuario =
            req.usuario.id_usuario;

        const {
            password_actual,
            password_nueva,
            confirmar_password
        } = req.body;

        // ========================================
        // VALIDAR CAMPOS
        // ========================================
        if (
            !password_actual ||
            !password_nueva ||
            !confirmar_password
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Debes completar todos los campos'
            });
        }

        if (
            password_nueva !==
            confirmar_password
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Las nuevas contraseñas no coinciden'
            });
        }

        // ========================================
        // POLÍTICA DE CONTRASEÑAS
        // (mínimo 8 caracteres, al menos una letra y un número)
        // ========================================
        const resultadoPassword =
            validarPassword(password_nueva);

        if (resultadoPassword !== true) {
            return res.status(400).json({
                success: false,
                mensaje:
                    resultadoPassword
            });
        }

        // ========================================
        // BUSCAR USUARIO CON PASSWORD
        // ========================================
        const usuario =
            await usuarioModel.buscarPorIdConPassword(
                idUsuario
            );

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Usuario no encontrado'
            });
        }

        // ========================================
        // VALIDAR CONTRASEÑA ACTUAL
        // ========================================
        const passwordCorrecta =
            await bcrypt.compare(
                password_actual,
                usuario.password
            );

        if (!passwordCorrecta) {
            return res.status(401).json({
                success: false,
                mensaje:
                    'La contraseña actual es incorrecta'
            });
        }

        // ========================================
        // EVITAR MISMA CONTRASEÑA
        // ========================================
        const mismaPassword =
            await bcrypt.compare(
                password_nueva,
                usuario.password
            );

        if (mismaPassword) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'La nueva contraseña debe ser diferente a la actual'
            });
        }

        // ========================================
        // ENCRIPTAR NUEVA CONTRASEÑA
        // ========================================
        const passwordHash =
            await bcrypt.hash(
                password_nueva,
                10
            );

        // ========================================
        // ACTUALIZAR
        // ========================================
        await usuarioModel.actualizarPassword(
            idUsuario,
            passwordHash
        );

        return res.json({
            success: true,
            mensaje:
                'Contraseña actualizada correctamente'
        });

    } catch (error) {
        console.error(
            'Error al cambiar contraseña:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al cambiar la contraseña',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// EXPORTAR
// ========================================
module.exports = {
    listarUsuarios,
    adminUpdateUsuario,
    obtenerPerfil,
    actualizarPerfil,
    subirFotoPerfil,
    cambiarPassword
};