const inventarioModel = require('../models/inventario.model');
const historialModel = require('../models/historial.model');
const { validarId, esNumeroNoNegativo } = require('../utils/validaciones');

// ========================================
// REGISTRAR HISTORIAL SIN AFECTAR INVENTARIO
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
// OBTENER TODO EL INVENTARIO
// ========================================
const obtenerInventario = async (req, res) => {
    try {
        const inventario = await inventarioModel.obtenerTodos();

        res.json({
            success: true,
            data: inventario
        });

    } catch (error) {
        console.error('Error al obtener inventario:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener el inventario'
        });
    }
};

// ========================================
// OBTENER INVENTARIO POR LIBRO
// ========================================
const obtenerInventarioPorLibro = async (req, res) => {
    try {
        const { id } = req.params;

        const idLibro = validarId(id);

        if (!idLibro) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de libro inválido'
            });
        }

        const inventario = await inventarioModel.obtenerPorLibro(idLibro);

        if (!inventario) {
            return res.status(404).json({
                success: false,
                mensaje: 'No existe inventario para este libro'
            });
        }

        res.json({
            success: true,
            data: inventario
        });

    } catch (error) {
        console.error('Error al obtener inventario del libro:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener el inventario'
        });
    }
};

// ========================================
// CREAR INVENTARIO
// ========================================
const crearInventario = async (req, res) => {
    try {
        const {
            id_libro,
            stock,
            stock_minimo,
            ubicacion
        } = req.body;

        const id_usuario = req.usuario.id_usuario;

        if (!id_libro) {
            return res.status(400).json({
                success: false,
                mensaje: 'El id_libro es obligatorio'
            });
        }

        const idLibroNum = validarId(id_libro);

        if (!idLibroNum) {
            return res.status(400).json({
                success: false,
                mensaje: 'El id_libro no es válido'
            });
        }

        if (
            stock !== undefined &&
            (isNaN(Number(stock)) || Number(stock) < 0)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'El stock no puede ser negativo'
            });
        }

        if (
            stock_minimo !== undefined &&
            (isNaN(Number(stock_minimo)) || Number(stock_minimo) < 0)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'El stock mínimo no puede ser negativo'
            });
        }

        const existente =
            await inventarioModel.obtenerPorLibro(idLibroNum);

        if (existente) {
            return res.status(409).json({
                success: false,
                mensaje: 'Este libro ya tiene un registro de inventario'
            });
        }

        const id = await inventarioModel.crear({
            id_libro: idLibroNum,
            stock: stock !== undefined ? Number(stock) : 0,
            stock_minimo: stock_minimo !== undefined ? Number(stock_minimo) : 5,
            ubicacion,
            id_usuario
        }, 'creacion');

        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'CREAR',
            modulo: 'inventario',
            descripcion:
                `Inventario creado para el libro ${idLibroNum} con stock ${stock !== undefined ? Number(stock) : 0}`
        });

        res.status(201).json({
            success: true,
            mensaje: 'Inventario creado correctamente',
            id_inventario: id
        });

    } catch (error) {
        console.error('Error al crear inventario:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al crear el inventario'
        });
    }
};

// ========================================
// ACTUALIZAR SOLO STOCK
// ========================================
const actualizarStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { stock } = req.body;

        const idLibro = validarId(id);

        if (!idLibro) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de libro inválido'
            });
        }

        const id_usuario = req.usuario.id_usuario;

        if (
            stock === undefined ||
            isNaN(Number(stock)) ||
            Number(stock) < 0
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'El stock debe ser un número mayor o igual a 0'
            });
        }

        const actualizado =
            await inventarioModel.actualizarStock(
                idLibro,
                Number(stock),
                'ajuste_manual'
            );

        if (!actualizado) {
            return res.status(404).json({
                success: false,
                mensaje: 'Libro no encontrado en el inventario'
            });
        }

        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'inventario',
            descripcion:
                `Stock del libro ${idLibro} actualizado a ${Number(stock)}`
        });

        res.json({
            success: true,
            mensaje: 'Stock actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar stock:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al actualizar el stock'
        });
    }
};

// ========================================
// ACTUALIZAR INVENTARIO COMPLETO
// ========================================
const actualizarInventario = async (req, res) => {
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
            stock,
            stock_minimo,
            ubicacion
        } = req.body;

        const id_usuario = req.usuario.id_usuario;

        const existente =
            await inventarioModel.obtenerPorLibro(idLibro);

        if (!existente) {
            return res.status(404).json({
                success: false,
                mensaje: 'Libro no encontrado en el inventario'
            });
        }

        if (stock !== undefined && Number(stock) < 0) {
            return res.status(400).json({
                success: false,
                mensaje: 'El stock no puede ser negativo'
            });
        }

        if (
            stock_minimo !== undefined &&
            Number(stock_minimo) < 0
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'El stock mínimo no puede ser negativo'
            });
        }

        await inventarioModel.actualizar(idLibro, {
            stock,
            stock_minimo,
            ubicacion,
            id_usuario
        }, 'ajuste_manual');

        await registrarHistorial({
            id_usuario,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'inventario',
            descripcion:
                `Inventario del libro ${idLibro} actualizado`
        });

        res.json({
            success: true,
            mensaje: 'Inventario actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar inventario:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al actualizar el inventario'
        });
    }
};

// ========================================
// OBTENER STOCK BAJO
// ========================================
const obtenerStockBajo = async (req, res) => {
    try {
        const libros = await inventarioModel.obtenerStockBajo();

        res.json({
            success: true,
            data: libros
        });

    } catch (error) {
        console.error('Error al obtener stock bajo:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener los libros con stock bajo'
        });
    }
};

// ========================================
// LISTAR MOVIMIENTOS DE INVENTARIO (KARDEX)
// ========================================
const listarMovimientos = async (req, res) => {
    try {
        const pagina = Number(req.query.pagina) || 1;
        const porPagina = Number(req.query.por_pagina) || 20;
        let id_libro = null;

        if (Number.isNaN(pagina) || pagina < 1) {
            return res.status(400).json({
                success: false,
                mensaje: 'La página debe ser un número mayor o igual a 1'
            });
        }

        if (Number.isNaN(porPagina) || porPagina < 1) {
            return res.status(400).json({
                success: false,
                mensaje: 'por_pagina debe ser un número mayor o igual a 1'
            });
        }

        if (porPagina > 100) {
            return res.status(400).json({
                success: false,
                mensaje: 'por_pagina no puede ser mayor a 100'
            });
        }

        if (
            req.query.id_libro !== undefined &&
            req.query.id_libro !== ''
        ) {
            const idLibroValido = validarId(req.query.id_libro);

            if (!idLibroValido) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'id_libro inválido'
                });
            }

            id_libro = idLibroValido;
        }

        const resultado = await inventarioModel.listarMovimientos({
            pagina,
            porPagina,
            id_libro
        });

        res.json({
            success: true,
            movimientos: resultado.movimientos,
            total: resultado.total,
            paginas: resultado.paginas
        });

    } catch (error) {
        console.error('Error al listar movimientos de inventario:', error);

        res.status(500).json({
            success: false,
            mensaje: 'Error al listar los movimientos de inventario'
        });
    }
};

// ========================================
// EXPORTAR CONTROLADORES
// ========================================
module.exports = {
    obtenerInventario,
    obtenerInventarioPorLibro,
    crearInventario,
    actualizarStock,
    actualizarInventario,
    obtenerStockBajo,
    listarMovimientos
};
