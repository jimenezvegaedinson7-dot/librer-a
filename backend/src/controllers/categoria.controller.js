const bcrypt = require('bcryptjs');

const categoriaModel = require('../models/categoria.model');
const historialModel = require('../models/historial.model');
const usuarioModel = require('../models/usuario.model');
const { validarId } = require('../utils/validaciones');

// ========================================
// REGISTRAR HISTORIAL SIN AFECTAR CATEGORÍAS
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
// OBTENER TODAS LAS CATEGORÍAS
// ========================================
const obtenerCategorias = async (req, res) => {
    try {
        const categorias =
            await categoriaModel.obtenerTodos();

        return res.json({
            success: true,
            data: categorias
        });

    } catch (error) {
        console.error(
            'Error al obtener categorías:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener las categorías'
        });
    }
};

// ========================================
// OBTENER CATEGORÍA POR ID
// ========================================
const obtenerCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const idCategoria = validarId(id);

        if (!idCategoria) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de categoría inválido'
            });
        }

        const categoria =
            await categoriaModel.obtenerPorId(idCategoria);

        if (!categoria) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Categoría no encontrada'
            });
        }

        return res.json({
            success: true,
            data: categoria
        });

    } catch (error) {
        console.error(
            'Error al obtener categoría:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener la categoría'
        });
    }
};

// ========================================
// CREAR CATEGORÍA
// ========================================
const crearCategoria = async (req, res) => {
    try {
        const {
            nombre,
            descripcion
        } = req.body;

        // ========================================
        // VALIDAR NOMBRE
        // ========================================
        if (
            !nombre ||
            !nombre.trim()
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El nombre de la categoría es obligatorio'
            });
        }

        // ========================================
        // CREAR
        // ========================================
        const id =
            await categoriaModel.crear({
                nombre:
                    nombre.trim(),

                descripcion:
                    descripcion?.trim() || null,

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
            modulo: 'categorias',
            descripcion:
                `Categoría #${id} "${nombre.trim()}" creada correctamente`
        });

        return res.status(201).json({
            success: true,
            mensaje:
                'Categoría creada correctamente',
            id_categoria: id
        });

    } catch (error) {
        console.error(
            'Error al crear categoría:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al crear la categoría'
        });
    }
};

// ========================================
// ACTUALIZAR CATEGORÍA
// ========================================
const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const idCategoria = validarId(id);

        if (!idCategoria) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de categoría inválido'
            });
        }

        const {
            nombre,
            descripcion,
            estado
        } = req.body;

        // ========================================
        // BUSCAR CATEGORÍA
        // ========================================
        const categoriaExistente =
            await categoriaModel.obtenerPorId(idCategoria);

        if (!categoriaExistente) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Categoría no encontrada'
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
                    'El nombre de la categoría no puede estar vacío'
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
        // ACTUALIZAR
        // ========================================
        await categoriaModel.actualizar(
            idCategoria,
            {
                nombre:
                    nombre !== undefined
                        ? nombre.trim()
                        : categoriaExistente.nombre,

                descripcion:
                    descripcion !== undefined
                        ? descripcion.trim() || null
                        : categoriaExistente.descripcion,

                estado:
                    estado !== undefined &&
                    estado !== ''
                        ? Number(estado)
                        : Number(
                            categoriaExistente.estado
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
            modulo: 'categorias',
            descripcion:
                `Categoría #${idCategoria} "${categoriaExistente.nombre}" actualizada correctamente`
        });

        return res.json({
            success: true,
            mensaje:
                'Categoría actualizada correctamente'
        });

    } catch (error) {
        console.error(
            'Error al actualizar categoría:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al actualizar la categoría'
        });
    }
};

// ========================================
// ELIMINAR CATEGORÍA
// ========================================
const eliminarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        const idCategoria = validarId(id);

        if (!idCategoria) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de categoría inválido'
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
                    'La contraseña es obligatoria para eliminar una categoría'
            });
        }

        // ========================================
        // VALIDAR USUARIO AUTENTICADO
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
        // BUSCAR ADMINISTRADOR
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
        // VALIDAR ESTADO DEL ADMINISTRADOR
        // ========================================
        if (
            Number(usuario.estado) !== 1
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'El usuario administrador está inactivo'
            });
        }

        // ========================================
        // VALIDAR ROL
        // ========================================
        if (
            String(usuario.rol)
                .toLowerCase()
                .trim() !== 'administrador'
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'No tienes permisos para eliminar categorías'
            });
        }

        // ========================================
        // VALIDAR CONTRASEÑA
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
        // BUSCAR CATEGORÍA
        // ========================================
        const categoriaExistente =
            await categoriaModel.obtenerPorId(idCategoria);

        if (!categoriaExistente) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Categoría no encontrada'
            });
        }

        // ========================================
        // ELIMINAR
        // ========================================
        const filasAfectadas =
            await categoriaModel.eliminar(idCategoria);

        if (filasAfectadas === 0) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'No se pudo eliminar la categoría'
            });
        }

        // ========================================
        // HISTORIAL
        // ========================================
        await registrarHistorial({
            id_usuario:
                req.usuario.id_usuario,

            tipo_operacion:
                'ELIMINAR',

            modulo:
                'categorias',

            descripcion:
                `Categoría #${idCategoria} "${categoriaExistente.nombre}" eliminada correctamente`
        });

        return res.json({
            success: true,
            mensaje:
                'Categoría eliminada correctamente'
        });

    } catch (error) {
        console.error(
            'Error al eliminar categoría:',
            error
        );

        // ========================================
        // CATEGORÍA CON LIBROS RELACIONADOS
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
                    'No se puede eliminar esta categoría porque tiene libros relacionados. Puedes cambiarla a estado Inactivo.'
            });
        }

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al eliminar la categoría'
        });
    }
};

// ========================================
// EXPORTAR CONTROLADORES
// ========================================
module.exports = {
    obtenerCategorias,
    obtenerCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
};
