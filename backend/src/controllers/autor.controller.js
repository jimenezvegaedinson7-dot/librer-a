const autorModel = require('../models/autor.model');
const historialModel = require('../models/historial.model');
const usuarioModel = require('../models/usuario.model');
const bcrypt = require('bcryptjs');
const { validarId } = require('../utils/validaciones');

// ========================================
// REGISTRAR HISTORIAL SIN AFECTAR AUTORES
// ========================================
const registrarHistorial = async ({
    id_usuario,
    tipo_operacion,
    modulo,
    descripcion
}) => {
    try {
        await historialModel.crear({
            id_usuario,
            tipo_operacion,
            modulo,
            descripcion
        });

    } catch (error) {
        console.error(
            'Error al registrar historial:',
            error.message
        );
    }
};

// ========================================
// OBTENER TODOS LOS AUTORES
// ========================================
const obtenerAutores = async (req, res) => {
    try {
        const autores =
            await autorModel.obtenerTodos();

        return res.json({
            success: true,
            data: autores
        });

    } catch (error) {
        console.error(
            'Error al obtener autores:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener los autores'
        });
    }
};

// ========================================
// OBTENER AUTOR POR ID
// ========================================
const obtenerAutor = async (req, res) => {
    try {
        const { id } = req.params;

        const idAutor = validarId(id);

        if (!idAutor) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de autor inválido'
            });
        }

        const autor =
            await autorModel.obtenerPorId(idAutor);

        if (!autor) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Autor no encontrado'
            });
        }

        return res.json({
            success: true,
            data: autor
        });

    } catch (error) {
        console.error(
            'Error al obtener el autor:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener el autor'
        });
    }
};

// ========================================
// CREAR AUTOR
// ========================================
const crearAutor = async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            nacionalidad,
            biografia
        } = req.body;

        // ========================================
        // VALIDACIONES
        // ========================================
        if (
            !nombre ||
            !nombre.trim() ||
            !apellido ||
            !apellido.trim()
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Nombre y apellido son obligatorios'
            });
        }

        // ========================================
        // CREAR AUTOR
        // ========================================
        const id =
            await autorModel.crear({
                nombre:
                    nombre.trim(),

                apellido:
                    apellido.trim(),

                nacionalidad:
                    nacionalidad?.trim() || null,

                biografia:
                    biografia?.trim() || null,

                estado: 1
            });

        // ========================================
        // HISTORIAL
        // ========================================
        const id_usuario =
            req.usuario.id_usuario;

        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'CREAR',
            modulo: 'autores',
            descripcion:
                `Autor #${id} "${nombre.trim()} ${apellido.trim()}" creado correctamente`
        });

        return res.status(201).json({
            success: true,
            mensaje:
                'Autor creado correctamente',
            id_autor: id
        });

    } catch (error) {
        console.error(
            'Error al crear autor:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al crear el autor'
        });
    }
};

// ========================================
// ACTUALIZAR AUTOR
// ========================================
const actualizarAutor = async (req, res) => {
    try {
        const { id } = req.params;

        const idAutor = validarId(id);

        if (!idAutor) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de autor inválido'
            });
        }

        const {
            nombre,
            apellido,
            nacionalidad,
            biografia,
            estado
        } = req.body;

        // ========================================
        // BUSCAR AUTOR
        // ========================================
        const autorExistente =
            await autorModel.obtenerPorId(idAutor);

        if (!autorExistente) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Autor no encontrado'
            });
        }

        // ========================================
        // VALIDAR ESTADO
        // ========================================
        if (
            estado !== undefined &&
            estado !== '' &&
            ![0, 1].includes(
                Number(estado)
            )
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El estado debe ser activo o inactivo'
            });
        }

        // ========================================
        // VALIDAR NOMBRE
        // ========================================
        if (
            nombre !== undefined &&
            !nombre.trim()
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El nombre no puede estar vacío'
            });
        }

        // ========================================
        // VALIDAR APELLIDO
        // ========================================
        if (
            apellido !== undefined &&
            !apellido.trim()
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El apellido no puede estar vacío'
            });
        }

        // ========================================
        // ACTUALIZAR
        // ========================================
        await autorModel.actualizar(
            idAutor,
            {
                nombre:
                    nombre !== undefined
                        ? nombre.trim()
                        : autorExistente.nombre,

                apellido:
                    apellido !== undefined
                        ? apellido.trim()
                        : autorExistente.apellido,

                nacionalidad:
                    nacionalidad !== undefined
                        ? nacionalidad.trim() || null
                        : autorExistente.nacionalidad,

                biografia:
                    biografia !== undefined
                        ? biografia.trim() || null
                        : autorExistente.biografia,

                estado:
                    estado !== undefined &&
                    estado !== ''
                        ? Number(estado)
                        : Number(
                            autorExistente.estado
                        )
            }
        );

        // ========================================
        // HISTORIAL
        // ========================================
        const id_usuario =
            req.usuario.id_usuario;

        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'autores',
            descripcion:
                `Autor #${idAutor} "${autorExistente.nombre} ${autorExistente.apellido}" actualizado correctamente`
        });

        return res.json({
            success: true,
            mensaje:
                'Autor actualizado correctamente'
        });

    } catch (error) {
        console.error(
            'Error al actualizar autor:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al actualizar el autor'
        });
    }
};

// ========================================
// ELIMINAR AUTOR
// ========================================
const eliminarAutor = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        const idAutor = validarId(id);

        if (!idAutor) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de autor inválido'
            });
        }

        // ========================================
        // VALIDAR CONTRASEÑA
        // ========================================
        if (
            !password ||
            !password.trim()
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'La contraseña es obligatoria para eliminar un autor'
            });
        }

        // ========================================
        // VERIFICAR USUARIO AUTENTICADO
        // ========================================
        if (
            !req.usuario ||
            !req.usuario.id_usuario
        ) {
            return res.status(401).json({
                success: false,
                mensaje:
                    'Usuario no autenticado'
            });
        }

        // ========================================
        // BUSCAR ADMINISTRADOR CON PASSWORD
        // ========================================
        const usuario =
            await usuarioModel.buscarPorIdConPassword(
                req.usuario.id_usuario
            );

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Administrador no encontrado'
            });
        }

        // ========================================
        // VERIFICAR ROL
        // ========================================
        if (
            String(usuario.rol)
                .toLowerCase()
                .trim() !== 'administrador'
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'No tienes permisos para eliminar autores'
            });
        }

        // ========================================
        // VERIFICAR ESTADO DEL ADMINISTRADOR
        // ========================================
        if (Number(usuario.estado) !== 1) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'El usuario administrador está inactivo'
            });
        }

        // ========================================
        // COMPARAR CONTRASEÑA
        // ========================================
        const passwordCorrecta =
            await bcrypt.compare(
                password,
                usuario.password
            );

        if (!passwordCorrecta) {
            return res.status(401).json({
                success: false,
                mensaje:
                    'Contraseña incorrecta'
            });
        }

        // ========================================
        // BUSCAR AUTOR
        // ========================================
        const autorExistente =
            await autorModel.obtenerPorId(idAutor);

        if (!autorExistente) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Autor no encontrado'
            });
        }

        // ========================================
        // ELIMINAR AUTOR
        // ========================================
        const filasAfectadas =
            await autorModel.eliminar(idAutor);

        if (filasAfectadas === 0) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'No se pudo eliminar el autor'
            });
        }

        // ========================================
        // REGISTRAR HISTORIAL
        // ========================================
        await registrarHistorial({
            id_usuario:
                req.usuario.id_usuario,

            tipo_operacion:
                'ELIMINAR',

            modulo:
                'autores',

            descripcion:
                `Autor #${idAutor} "${autorExistente.nombre} ${autorExistente.apellido}" eliminado correctamente`
        });

        return res.json({
            success: true,
            mensaje:
                'Autor eliminado correctamente'
        });

    } catch (error) {
        console.error(
            'Error al eliminar autor:',
            error
        );

        // ========================================
        // AUTOR CON LIBROS RELACIONADOS
        // ========================================
        if (
            error.code ===
                'ER_ROW_IS_REFERENCED_2' ||
            error.code ===
                'ER_ROW_IS_REFERENCED'
        ) {
            return res.status(409).json({
                success: false,
                mensaje:
                    'No se puede eliminar este autor porque tiene libros relacionados. Puedes cambiarlo a estado Inactivo.'
            });
        }

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al eliminar el autor'
        });
    }
};

// ========================================
// EXPORTAR CONTROLADORES
// ========================================
module.exports = {
    obtenerAutores,
    obtenerAutor,
    crearAutor,
    actualizarAutor,
    eliminarAutor
};
