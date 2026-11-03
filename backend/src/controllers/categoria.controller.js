const bcrypt = require('bcryptjs');

const categoriaModel = require('../models/categoria.model');
const historialModel = require('../models/historial.model');
const usuarioModel = require('../models/usuario.model');
const { validarId, esTextoValido, esEstadoValido } = require('../utils/validaciones');

const registrarHistorial = async ({ id_usuario, tipo_operacion, modulo, descripcion }) => {
    try {
        await historialModel.crear({ id_usuario, tipo_operacion, modulo, descripcion });
    } catch (error) {
        console.error('Error al registrar historial:', error.message);
    }
};

const obtenerCategorias = async (req, res) => {
    try {
        const categorias = await categoriaModel.obtenerTodos();

        return res.json({ success: true, data: categorias });
    } catch (error) {
        console.error('Error al obtener categorías:', error);

        return res.status(500).json({ success: false, mensaje: 'Error al obtener las categorías' });
    }
};

const obtenerCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const idCategoria = validarId(id);

        if (!idCategoria) {
            return res.status(400).json({ success: false, mensaje: 'ID de categoría inválido' });
        }

        const categoria = await categoriaModel.obtenerPorId(idCategoria);

        if (!categoria) {
            return res.status(404).json({ success: false, mensaje: 'Categoría no encontrada' });
        }

        return res.json({ success: true, data: categoria });
    } catch (error) {
        console.error('Error al obtener categoría:', error);

        return res.status(500).json({ success: false, mensaje: 'Error al obtener la categoría' });
    }
};

const crearCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!esTextoValido(nombre, 80) || (descripcion !== undefined && !esTextoValido(descripcion, 255, true))) {
            return res.status(400).json({ success: false, mensaje: 'El nombre de la categoría es obligatorio' });
        }

        const id = await categoriaModel.crear({
            nombre: nombre.trim(),

            descripcion: descripcion?.trim() || null,

            estado: 1
        });

        const id_usuario = req.usuario.id_usuario;

        await registrarHistorial({ id_usuario, tipo_operacion: 'CREAR', modulo: 'categorias', descripcion: `Categoría #${id} "${nombre.trim()}" creada correctamente` });

        return res.status(201).json({ success: true, mensaje: 'Categoría creada correctamente', id_categoria: id });
    } catch (error) {
        console.error('Error al crear categoría:', error);

        return res.status(500).json({ success: false, mensaje: 'Error al crear la categoría' });
    }
};

const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const idCategoria = validarId(id);

        if (!idCategoria) {
            return res.status(400).json({ success: false, mensaje: 'ID de categoría inválido' });
        }

        const { nombre, descripcion, estado } = req.body;

        const categoriaExistente = await categoriaModel.obtenerPorId(idCategoria);

        if (!categoriaExistente) {
            return res.status(404).json({ success: false, mensaje: 'Categoría no encontrada' });
        }

        if (nombre !== undefined && !esTextoValido(nombre, 80)) {
            return res.status(400).json({ success: false, mensaje: 'El nombre de la categoría no puede estar vacío' });
        }

        if (estado !== undefined && !esEstadoValido(estado)) {
            return res.status(400).json({ success: false, mensaje: 'El estado debe ser activo o inactivo' });
        }

        if (descripcion != null && !esTextoValido(descripcion, 255, true)) {
            return res.status(400).json({ success: false, mensaje: 'Descripción inválida' });
        }
        await categoriaModel.actualizar(idCategoria, {
            nombre: nombre !== undefined ? nombre.trim() : undefined,

            descripcion: descripcion !== undefined ? (descripcion === null ? null : descripcion.trim() || null) : undefined,

            estado: estado !== undefined && estado !== '' ? Number(estado) : undefined
        });

        const id_usuario = req.usuario.id_usuario;

        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'categorias',
            descripcion: `Categoría #${idCategoria} "${categoriaExistente.nombre}" actualizada correctamente`
        });

        return res.json({ success: true, mensaje: 'Categoría actualizada correctamente' });
    } catch (error) {
        console.error('Error al actualizar categoría:', error);

        return res.status(500).json({ success: false, mensaje: 'Error al actualizar la categoría' });
    }
};

const eliminarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        const idCategoria = validarId(id);

        if (!idCategoria) {
            return res.status(400).json({ success: false, mensaje: 'ID de categoría inválido' });
        }

        if (typeof password !== 'string' || !password.trim()) {
            return res.status(400).json({ success: false, mensaje: 'La contraseña es obligatoria para eliminar una categoría' });
        }

        if (!req.usuario || !req.usuario.id_usuario) {
            return res.status(401).json({ success: false, mensaje: 'Usuario no autenticado' });
        }

        const usuario = await usuarioModel.buscarPorIdConPassword(req.usuario.id_usuario);

        if (!usuario) {
            return res.status(404).json({ success: false, mensaje: 'Administrador no encontrado' });
        }

        if (Number(usuario.estado) !== 1) {
            return res.status(403).json({ success: false, mensaje: 'El usuario administrador está inactivo' });
        }

        if (String(usuario.rol).toLowerCase().trim() !== 'administrador') {
            return res.status(403).json({ success: false, mensaje: 'No tienes permisos para eliminar categorías' });
        }

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecta) {
            return res.status(401).json({ success: false, mensaje: 'Contraseña incorrecta' });
        }

        const categoriaExistente = await categoriaModel.obtenerPorId(idCategoria);

        if (!categoriaExistente) {
            return res.status(404).json({ success: false, mensaje: 'Categoría no encontrada' });
        }

        const filasAfectadas = await categoriaModel.eliminar(idCategoria);

        if (filasAfectadas === 0) {
            return res.status(404).json({ success: false, mensaje: 'No se pudo eliminar la categoría' });
        }

        await registrarHistorial({
            id_usuario: req.usuario.id_usuario,

            tipo_operacion: 'ELIMINAR',

            modulo: 'categorias',

            descripcion: `Categoría #${idCategoria} "${categoriaExistente.nombre}" eliminada correctamente`
        });

        return res.json({ success: true, mensaje: 'Categoría eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED' || error.code === '23503') {
            return res.status(409).json({ success: false, mensaje: 'No se puede eliminar esta categoría porque tiene libros relacionados. Puedes cambiarla a estado Inactivo.' });
        }

        return res.status(500).json({ success: false, mensaje: 'Error al eliminar la categoría' });
    }
};

module.exports = { obtenerCategorias, obtenerCategoria, crearCategoria, actualizarCategoria, eliminarCategoria };
