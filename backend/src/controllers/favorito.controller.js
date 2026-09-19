const libroModel = require('../models/libro.model');
const favoritoModel = require('../models/favorito.model');
const { validarId } = require('../utils/validaciones');

// ========================================
// LISTAR MIS FAVORITOS
// ========================================
const listarMisFavoritos = async (req, res) => {
    try {
        const favoritos =
            await favoritoModel.listar(
                req.usuario.id_usuario
            );

        return res.json({
            success: true,
            data: favoritos
        });

    } catch (error) {
        console.error(
            'Error al obtener favoritos:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener tus favoritos',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// ESTADO DE FAVORITO DE UN LIBRO
// ========================================
const estadoFavorito = async (req, res) => {
    try {
        const idLibro =
            validarId(req.params.idLibro);

        if (!idLibro) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'ID de libro inválido'
            });
        }

        const esFavorito =
            await favoritoModel.esFavorito(
                req.usuario.id_usuario,
                idLibro
            );

        return res.json({
            success: true,
            data: {
                id_libro: idLibro,
                es_favorito: esFavorito
            }
        });

    } catch (error) {
        console.error(
            'Error al consultar favorito:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al consultar el favorito',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// AGREGAR FAVORITO
// ========================================
const agregarFavorito = async (req, res) => {
    try {
        const idLibro =
            validarId(req.params.idLibro);

        if (!idLibro) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'ID de libro inválido'
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

        await favoritoModel.agregar(
            req.usuario.id_usuario,
            idLibro
        );

        return res.json({
            success: true,
            mensaje:
                'Libro agregado a tus favoritos',
            data: {
                id_libro: idLibro,
                es_favorito: true
            }
        });

    } catch (error) {
        console.error(
            'Error al agregar favorito:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al agregar a favoritos',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// QUITAR FAVORITO
// ========================================
const quitarFavorito = async (req, res) => {
    try {
        const idLibro =
            validarId(req.params.idLibro);

        if (!idLibro) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'ID de libro inválido'
            });
        }

        await favoritoModel.quitar(
            req.usuario.id_usuario,
            idLibro
        );

        return res.json({
            success: true,
            mensaje:
                'Libro eliminado de tus favoritos',
            data: {
                id_libro: idLibro,
                es_favorito: false
            }
        });

    } catch (error) {
        console.error(
            'Error al quitar favorito:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al quitar de favoritos',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// EXPORTAR
// ========================================
module.exports = {
    listarMisFavoritos,
    estadoFavorito,
    agregarFavorito,
    quitarFavorito
};