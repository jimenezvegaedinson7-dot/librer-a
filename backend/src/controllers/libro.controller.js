const bcrypt = require('bcryptjs');

const pool = require('../config/database');
const libroModel = require('../models/libro.model');
const inventarioModel = require('../models/inventario.model');
const autorModel = require('../models/autor.model');
const categoriaModel = require('../models/categoria.model');
const historialModel = require('../models/historial.model');
const usuarioModel = require('../models/usuario.model');
const { validarId, esNumeroNoNegativo, esEstadoValido } = require('../utils/validaciones');
const { validarDescuentos } = require('../utils/descuentos');
const { conPortadaCatalogo } = require('../utils/portadasCatalogo');
const { eliminarImagen, publicIdDesdeUrl } = require('../utils/cloudinary');

const registrarHistorial = async ({ id_usuario, tipo_operacion, modulo, descripcion }) => {
    try {
        await historialModel.crear({ id_usuario, tipo_operacion, modulo, descripcion });
    } catch (error) {
        console.error('Error al registrar historial:', error.message);
    }
};

const precioFinalDelBody = (precio, precioGuardado) => {
    if (precio === undefined || precio === '') {
        return Number(precioGuardado);
    }

    return Number(precio);
};

const obtenerLibros = async (req, res) => {
    try {
        const libros = await libroModel.obtenerTodos();

        return res.json({ success: true, data: libros.map(conPortadaCatalogo) });
    } catch (error) {
        console.error('Error al obtener libros:', error);

        return res.status(500).json({ success: false, mensaje: 'Error al obtener los libros' });
    }
};

const obtenerLibro = async (req, res) => {
    try {
        const { id } = req.params;

        const idLibro = validarId(id);

        if (!idLibro) {
            return res.status(400).json({ success: false, mensaje: 'ID de libro inválido' });
        }

        const libro = await libroModel.obtenerPorId(idLibro);

        if (!libro) {
            return res.status(404).json({ success: false, mensaje: 'Libro no encontrado' });
        }

        return res.json({ success: true, data: conPortadaCatalogo(libro) });
    } catch (error) {
        console.error('Error al obtener el libro:', error);

        return res.status(500).json({ success: false, mensaje: 'Error al obtener el libro' });
    }
};

const crearLibro = async (req, res) => {
    try {
        const { titulo, isbn, descripcion, precio, id_autor, id_categoria } = req.body;

        if (!titulo || precio === undefined || precio === '' || !id_autor || !id_categoria) {
            return res.status(400).json({ success: false, mensaje: 'Faltan datos obligatorios' });
        }

        if (
            typeof titulo !== 'string' ||
            !titulo.trim() ||
            titulo.trim().length > 200 ||
            (isbn != null && (typeof isbn !== 'string' || isbn.trim().length > 20)) ||
            (descripcion != null && typeof descripcion !== 'string')
        ) {
            return res.status(400).json({ success: false, mensaje: 'Título, ISBN o descripción inválidos' });
        }
        if (!esNumeroNoNegativo(precio) || Number(precio) > 99999999.99) {
            return res.status(400).json({ success: false, mensaje: 'El precio debe ser un número válido mayor o igual a 0' });
        }

        const descuentos = validarDescuentos(req.body, Number(precio));

        if (descuentos.mensaje) {
            return res.status(400).json({ success: false, mensaje: descuentos.mensaje });
        }

        const idAutor = validarId(id_autor);
        const idCategoria = validarId(id_categoria);

        if (!idAutor || !idCategoria) {
            return res.status(400).json({ success: false, mensaje: 'ID de autor o categoría inválido' });
        }

        const autorExistente = await autorModel.obtenerPorId(idAutor);
        const categoriaExistente = await categoriaModel.obtenerPorId(idCategoria);

        if (!autorExistente) {
            return res.status(400).json({ success: false, mensaje: 'Autor no encontrado' });
        }

        if (!categoriaExistente) {
            return res.status(400).json({ success: false, mensaje: 'Categoría no encontrada' });
        }

        let portada = null;

        if (req.file) {
            portada = req.file.cloudinaryUrl || `/uploads/portadas/${req.file.filename}`;
        }

        const id = await libroModel.crear({
            titulo: titulo.trim(),

            isbn: isbn?.trim() || null,

            descripcion: descripcion?.trim() || null,

            precio: Number(precio),

            stock: 0,

            portada,

            id_autor: idAutor,

            id_categoria: idCategoria,

            estado: 1,

            ...descuentos.valor
        });

        try {
            const inventarioExistente = await inventarioModel.obtenerPorLibro(id);

            if (!inventarioExistente) {
                await inventarioModel.crear({ id_libro: id, stock: 0, stock_minimo: 5, ubicacion: null });
            }
        } catch (errorInventario) {
            console.error('Error al crear inventario del libro:', errorInventario);

            try {
                await libroModel.eliminar(id);
            } catch (errorEliminar) {
                console.error('Error al revertir libro:', errorEliminar);
            }

            return res.status(500).json({ success: false, mensaje: 'No se pudo crear el inventario del libro' });
        }

        const id_usuario = req.usuario.id_usuario;

        await registrarHistorial({ id_usuario, tipo_operacion: 'CREAR', modulo: 'libros', descripcion: `Libro #${id} "${titulo}" creado correctamente` });

        return res.status(201).json({ success: true, mensaje: 'Libro creado correctamente', id_libro: id, portada });
    } catch (error) {
        console.error('Error al crear libro:', error);

        if (['ER_DUP_ENTRY', '23505'].includes(error.code)) {
            return res.status(409).json({ success: false, mensaje: 'El ISBN ingresado ya está registrado' });
        }

        if (error.code === '23503') {
            return res.status(400).json({ success: false, mensaje: 'Autor o categoría inexistente' });
        }

        return res.status(500).json({ success: false, mensaje: 'Error al crear el libro' });
    }
};

const actualizarLibro = async (req, res) => {
    try {
        const { id } = req.params;

        const idLibro = validarId(id);

        if (!idLibro) {
            return res.status(400).json({ success: false, mensaje: 'ID de libro inválido' });
        }

        const { titulo, isbn, descripcion, precio, id_autor, id_categoria, estado } = req.body;

        const libroExistente = await libroModel.obtenerPorId(idLibro);

        if (!libroExistente) {
            return res.status(404).json({ success: false, mensaje: 'Libro no encontrado' });
        }

        if (
            (titulo !== undefined && (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 200)) ||
            (isbn !== undefined && (typeof isbn !== 'string' || isbn.trim().length > 20)) ||
            (descripcion !== undefined && typeof descripcion !== 'string')
        ) {
            return res.status(400).json({ success: false, mensaje: 'Título, ISBN o descripción inválidos' });
        }
        if (precio !== undefined && (!esNumeroNoNegativo(precio) || Number(precio) > 99999999.99)) {
            return res.status(400).json({ success: false, mensaje: 'El precio debe ser un número válido mayor o igual a 0' });
        }

        const precioFinal = precioFinalDelBody(precio, libroExistente.precio);
        const aNumero = (v) => (v === null || v === undefined ? null : Number(v));
        const descuentos = validarDescuentos(req.body, precioFinal, {
            descuento_porcentaje: aNumero(libroExistente.descuento_porcentaje),
            precio_oferta: aNumero(libroExistente.precio_oferta),
            descuento_hasta: libroExistente.descuento_hasta || null
        });

        if (descuentos.mensaje) {
            return res.status(400).json({ success: false, mensaje: descuentos.mensaje });
        }

        if (descuentos.valor.precio_oferta === undefined) {
            const ofertaGuardada = Number(libroExistente.precio_oferta);

            if (libroExistente.precio_oferta !== null && ofertaGuardada >= precioFinal) {
                return res
                    .status(400)
                    .json({ success: false, mensaje: 'El precio de oferta guardado ya no es menor que el nuevo precio normal. Actualiza la oferta o quítala para continuar.' });
            }
        }

        if (estado !== undefined && !esEstadoValido(estado)) {
            return res.status(400).json({ success: false, mensaje: 'El estado debe ser activo o inactivo' });
        }

        const idAutor = id_autor === undefined ? libroExistente.id_autor : validarId(id_autor);
        const idCategoria = id_categoria === undefined ? libroExistente.id_categoria : validarId(id_categoria);
        if (!idAutor || !idCategoria) {
            return res.status(400).json({ success: false, mensaje: 'ID de autor o categoría inválido' });
        }
        if (!(await autorModel.obtenerPorId(idAutor)) || !(await categoriaModel.obtenerPorId(idCategoria))) {
            return res.status(400).json({ success: false, mensaje: 'Autor o categoría inexistente' });
        }

        let portada = libroExistente.portada || null;

        if (req.file) {
            portada = req.file.cloudinaryUrl || `/uploads/portadas/${req.file.filename}`;
        }

        await libroModel.actualizar(idLibro, {
            titulo: titulo !== undefined ? titulo.trim() : libroExistente.titulo,

            isbn: isbn !== undefined ? isbn.trim() || null : libroExistente.isbn,

            descripcion: descripcion !== undefined ? descripcion.trim() || null : libroExistente.descripcion,

            precio: precio !== undefined && precio !== '' ? Number(precio) : libroExistente.precio,

            stock: undefined,

            portada,

            id_autor: idAutor,

            id_categoria: idCategoria,

            estado: estado !== undefined && estado !== '' ? Number(estado) : Number(libroExistente.estado),

            ...descuentos.valor
        });

        if (req.file) {
            const anterior = publicIdDesdeUrl(libroExistente.portada);
            if (anterior) {
                try {
                    await eliminarImagen(anterior);
                } catch (errorEliminar) {
                    console.error('No se pudo eliminar la portada anterior:', errorEliminar.message);
                }
            }
        }

        const id_usuario = req.usuario.id_usuario;

        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'libros',
            descripcion: `Libro #${idLibro} "${libroExistente.titulo}" actualizado correctamente`
        });

        return res.json({ success: true, mensaje: 'Libro actualizado correctamente', portada });
    } catch (error) {
        console.error('Error al actualizar libro:', error);

        if (['ER_DUP_ENTRY', '23505'].includes(error.code)) {
            return res.status(409).json({ success: false, mensaje: 'El ISBN ingresado ya está registrado' });
        }

        if (error.code === '23503') {
            return res.status(400).json({ success: false, mensaje: 'Autor o categoría inexistente' });
        }

        return res.status(500).json({ success: false, mensaje: 'Error al actualizar el libro' });
    }
};

const eliminarLibro = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        const idLibro = validarId(id);

        if (!idLibro) {
            return res.status(400).json({ success: false, mensaje: 'ID de libro inválido' });
        }

        if (!password || !password.trim()) {
            return res.status(400).json({ success: false, mensaje: 'Debes ingresar tu contraseña para eliminar el libro' });
        }

        if (!req.usuario || !req.usuario.id_usuario) {
            return res.status(401).json({ success: false, mensaje: 'No se pudo identificar al usuario autenticado' });
        }

        const id_usuario = req.usuario.id_usuario;

        const usuario = await usuarioModel.buscarPorIdConPassword(id_usuario);

        if (!usuario) {
            return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
        }

        if (Number(usuario.estado) !== 1) {
            return res.status(403).json({ success: false, mensaje: 'Tu cuenta se encuentra inactiva' });
        }

        if (String(usuario.rol).toLowerCase().trim() !== 'administrador') {
            return res.status(403).json({ success: false, mensaje: 'Solo un administrador puede eliminar libros' });
        }

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecta) {
            return res.status(401).json({ success: false, mensaje: 'La contraseña ingresada es incorrecta' });
        }

        const libroExistente = await libroModel.obtenerPorId(idLibro);

        if (!libroExistente) {
            return res.status(404).json({ success: false, mensaje: 'Libro no encontrado' });
        }

        const [refVentas] = await pool.query('SELECT COUNT(*) AS total FROM detalle_venta WHERE id_libro = ?', [idLibro]);
        if (Number(refVentas[0]?.total || 0) > 0) {
            return res.status(409).json({ success: false, mensaje: 'No se puede eliminar este libro porque tiene ventas relacionadas. Puedes cambiarlo a estado Inactivo.' });
        }

        const conexion = await pool.getConnection();

        let filasAfectadas = 0;

        try {
            await conexion.beginTransaction();

            await inventarioModel.eliminarMovimientosPorLibro(idLibro, conexion);

            await inventarioModel.eliminarPorLibro(idLibro, conexion);

            const [resultado] = await conexion.query('DELETE FROM libros WHERE id_libro = ?', [idLibro]);

            filasAfectadas = resultado.affectedRows;

            await conexion.commit();
        } catch (errorEliminar) {
            await conexion.rollback();
            throw errorEliminar;
        } finally {
            conexion.release();
        }

        if (filasAfectadas === 0) {
            return res.status(404).json({ success: false, mensaje: 'No se pudo eliminar el libro' });
        }

        if (libroExistente.portada) {
            const publicId = publicIdDesdeUrl(libroExistente.portada);

            if (publicId) {
                try {
                    await eliminarImagen(publicId);
                } catch (errorPortada) {
                    console.error('No se pudo eliminar la portada de Cloudinary:', errorPortada.message);
                }
            }
        }

        await registrarHistorial({ id_usuario, tipo_operacion: 'ELIMINAR', modulo: 'libros', descripcion: `Libro #${idLibro} "${libroExistente.titulo}" eliminado correctamente` });

        return res.json({ success: true, mensaje: 'Libro eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar libro:', error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED' || error.code === '23503') {
            return res
                .status(409)
                .json({ success: false, mensaje: 'No se puede eliminar este libro porque tiene ventas u otros registros relacionados. Puedes cambiarlo a estado Inactivo.' });
        }

        return res.status(500).json({ success: false, mensaje: 'Error al eliminar el libro' });
    }
};

const obtenerRelacionados = async (req, res) => {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ success: false, mensaje: 'ID de libro inválido' });
    try {
        const data = await libroModel.obtenerRelacionados(id);
        if (!data) return res.status(404).json({ success: false, mensaje: 'Libro no encontrado en el catálogo' });
        return res.json({ success: true, data: Object.fromEntries(Object.entries(data).map(([grupo, libros]) => [grupo, libros.map(conPortadaCatalogo)])) });
    } catch (error) {
        console.error('Error al obtener relacionados:', error.message);
        return res.status(500).json({ success: false, mensaje: 'No se pudieron cargar los libros relacionados' });
    }
};

module.exports = { obtenerLibros, obtenerLibro, obtenerRelacionados, crearLibro, actualizarLibro, eliminarLibro };
