const bcrypt = require('bcryptjs');

const libroModel = require('../models/libro.model');
const inventarioModel = require('../models/inventario.model');
const historialModel = require('../models/historial.model');
const usuarioModel = require('../models/usuario.model');
const { validarId } = require('../utils/validaciones');

// ========================================
// REGISTRAR HISTORIAL SIN AFECTAR LIBROS
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
// OBTENER TODOS LOS LIBROS
// ========================================
const obtenerLibros = async (req, res) => {
    try {
        const libros =
            await libroModel.obtenerTodos();

        return res.json({
            success: true,
            data: libros
        });

    } catch (error) {
        console.error(
            'Error al obtener libros:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener los libros'
        });
    }
};

// ========================================
// OBTENER UN LIBRO POR ID
// ========================================
const obtenerLibro = async (req, res) => {
    try {
        const { id } = req.params;

        const idLibro = validarId(id);

        if (!idLibro) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de libro inválido'
            });
        }

        const libro =
            await libroModel.obtenerPorId(idLibro);

        if (!libro) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Libro no encontrado'
            });
        }

        return res.json({
            success: true,
            data: libro
        });

    } catch (error) {
        console.error(
            'Error al obtener el libro:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener el libro'
        });
    }
};

// ========================================
// CREAR LIBRO
// ========================================
const crearLibro = async (req, res) => {
    try {
        const {
            titulo,
            isbn,
            descripcion,
            precio,
            id_autor,
            id_categoria
        } = req.body;

        // ========================================
        // VALIDACIONES
        // ========================================
        if (
            !titulo ||
            precio === undefined ||
            precio === '' ||
            !id_autor ||
            !id_categoria
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Faltan datos obligatorios'
            });
        }

        if (
            isNaN(Number(precio)) ||
            Number(precio) < 0
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El precio no puede ser negativo'
            });
        }

        const idAutor = validarId(id_autor);
        const idCategoria = validarId(id_categoria);

        if (!idAutor || !idCategoria) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de autor o categoría inválido'
            });
        }

        // ========================================
        // PORTADA
        // ========================================
        let portada = null;

        if (req.file) {
            portada =
                `/uploads/portadas/${req.file.filename}`;
        }

        // ========================================
        // CREAR LIBRO
        // ========================================
        const id =
            await libroModel.crear({
                titulo: titulo.trim(),

                isbn:
                    isbn?.trim() || null,

                descripcion:
                    descripcion?.trim() || null,

                precio:
                    Number(precio),

                // El stock de libros queda en 0.
                // El stock real se administra
                // desde Inventario.
                stock: 0,

                portada,

                id_autor:
                    idAutor,

                id_categoria:
                    idCategoria,

                estado: 1
            });

        // ========================================
        // CREAR INVENTARIO AUTOMÁTICAMENTE
        // ========================================
        try {
            const inventarioExistente =
                await inventarioModel.obtenerPorLibro(
                    id
                );

            if (!inventarioExistente) {
                await inventarioModel.crear({
                    id_libro: id,
                    stock: 0,
                    stock_minimo: 5,
                    ubicacion: null
                });
            }

        } catch (errorInventario) {
            console.error(
                'Error al crear inventario del libro:',
                errorInventario
            );

            // Si falla Inventario, intentamos
            // eliminar el libro recién creado
            // para no dejarlo incompleto.
            try {
                await libroModel.eliminar(id);
            } catch (errorEliminar) {
                console.error(
                    'Error al revertir libro:',
                    errorEliminar
                );
            }

            return res.status(500).json({
                success: false,
                mensaje:
                    'No se pudo crear el inventario del libro'
            });
        }

        // ========================================
        // HISTORIAL
        // ========================================
        const id_usuario =
            req.usuario.id_usuario;

        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'CREAR',
            modulo: 'libros',
            descripcion:
                `Libro #${id} "${titulo}" creado correctamente`
        });

        return res.status(201).json({
            success: true,
            mensaje:
                'Libro creado correctamente',
            id_libro: id,
            portada
        });

    } catch (error) {
        console.error(
            'Error al crear libro:',
            error
        );

        // ========================================
        // ISBN DUPLICADO
        // ========================================
        if (
            error.code ===
            'ER_DUP_ENTRY'
        ) {
            return res.status(409).json({
                success: false,
                mensaje:
                    'El ISBN ingresado ya está registrado'
            });
        }

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al crear el libro'
        });
    }
};

// ========================================
// ACTUALIZAR LIBRO
// ========================================
const actualizarLibro = async (req, res) => {
    try {
        const { id } = req.params;

        const idLibro = validarId(id);

        if (!idLibro) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de libro inválido'
            });
        }

        const {
            titulo,
            isbn,
            descripcion,
            precio,
            id_autor,
            id_categoria,
            estado
        } = req.body;

        // ========================================
        // BUSCAR LIBRO
        // ========================================
        const libroExistente =
            await libroModel.obtenerPorId(idLibro);

        if (!libroExistente) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Libro no encontrado'
            });
        }

        // ========================================
        // VALIDAR PRECIO
        // ========================================
        if (
            precio !== undefined &&
            precio !== '' &&
            Number(precio) < 0
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El precio no puede ser negativo'
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
        // PORTADA
        // ========================================
        let portada =
            libroExistente.portada || null;

        if (req.file) {
            portada =
                `/uploads/portadas/${req.file.filename}`;
        }

        // ========================================
        // ACTUALIZAR
        // ========================================
        await libroModel.actualizar(
            idLibro,
            {
                titulo:
                    titulo !== undefined
                        ? titulo.trim()
                        : libroExistente.titulo,

                isbn:
                    isbn !== undefined
                        ? isbn.trim() || null
                        : libroExistente.isbn,

                descripcion:
                    descripcion !== undefined
                        ? descripcion.trim() || null
                        : libroExistente.descripcion,

                precio:
                    precio !== undefined &&
                    precio !== ''
                        ? Number(precio)
                        : libroExistente.precio,

                // No se modifica desde Libros.
                stock: undefined,

                portada,

                id_autor:
                    id_autor !== undefined &&
                    id_autor !== ''
                        ? Number(id_autor)
                        : libroExistente.id_autor,

                id_categoria:
                    id_categoria !== undefined &&
                    id_categoria !== ''
                        ? Number(id_categoria)
                        : libroExistente.id_categoria,

                estado:
                    estado !== undefined &&
                    estado !== ''
                        ? Number(estado)
                        : Number(
                            libroExistente.estado
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
            tipo_operacion:
                'ACTUALIZAR',
            modulo: 'libros',
            descripcion:
                `Libro #${idLibro} "${libroExistente.titulo}" actualizado correctamente`
        });

        return res.json({
            success: true,
            mensaje:
                'Libro actualizado correctamente',
            portada
        });

    } catch (error) {
        console.error(
            'Error al actualizar libro:',
            error
        );

        // ========================================
        // ISBN DUPLICADO
        // ========================================
        if (
            error.code ===
            'ER_DUP_ENTRY'
        ) {
            return res.status(409).json({
                success: false,
                mensaje:
                    'El ISBN ingresado ya está registrado'
            });
        }

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al actualizar el libro'
        });
    }
};

// ========================================
// ELIMINAR LIBRO
// ========================================
const eliminarLibro = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        const idLibro = validarId(id);

        if (!idLibro) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de libro inválido'
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
                    'Debes ingresar tu contraseña para eliminar el libro'
            });
        }

        // ========================================
        // VALIDAR USUARIO DEL TOKEN
        // ========================================
        if (
            !req.usuario ||
            !req.usuario.id_usuario
        ) {
            return res.status(401).json({
                success: false,
                mensaje:
                    'No se pudo identificar al usuario autenticado'
            });
        }

        const id_usuario =
            req.usuario.id_usuario;

        // ========================================
        // BUSCAR ADMINISTRADOR CON PASSWORD
        // ========================================
        const usuario =
            await usuarioModel.buscarPorIdConPassword(
                id_usuario
            );

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Usuario no encontrado'
            });
        }

        // ========================================
        // VALIDAR USUARIO ACTIVO
        // ========================================
        if (
            Number(usuario.estado) !== 1
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'Tu cuenta se encuentra inactiva'
            });
        }

        // ========================================
        // VALIDAR ADMINISTRADOR
        // ========================================
        if (
            String(usuario.rol)
                .toLowerCase()
                .trim() !==
            'administrador'
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'Solo un administrador puede eliminar libros'
            });
        }

        // ========================================
        // VERIFICAR CONTRASEÑA
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
                    'La contraseña ingresada es incorrecta'
            });
        }

        // ========================================
        // BUSCAR LIBRO
        // ========================================
        const libroExistente =
            await libroModel.obtenerPorId(idLibro);

        if (!libroExistente) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Libro no encontrado'
            });
        }

        // ========================================
        // ELIMINAR
        // ========================================
        const filasAfectadas =
            await libroModel.eliminar(idLibro);

        if (filasAfectadas === 0) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'No se pudo eliminar el libro'
            });
        }

        // ========================================
        // HISTORIAL
        // ========================================
        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'ELIMINAR',
            modulo: 'libros',
            descripcion:
                `Libro #${idLibro} "${libroExistente.titulo}" eliminado correctamente`
        });

        return res.json({
            success: true,
            mensaje:
                'Libro eliminado correctamente'
        });

    } catch (error) {
        console.error(
            'Error al eliminar libro:',
            error
        );

        // ========================================
        // LIBRO RELACIONADO
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
                    'No se puede eliminar este libro porque tiene ventas u otros registros relacionados. Puedes cambiarlo a estado Inactivo.'
            });
        }

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al eliminar el libro'
        });
    }
};

// ========================================
// EXPORTAR CONTROLADORES
// ========================================
module.exports = {
    obtenerLibros,
    obtenerLibro,
    crearLibro,
    actualizarLibro,
    eliminarLibro
};