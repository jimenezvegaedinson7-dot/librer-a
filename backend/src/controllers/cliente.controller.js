const clienteModel = require('../models/cliente.model');

// ========================================
// LISTAR CLIENTES (ADMIN)
// GET /api/clientes
// ========================================
const listarClientes = async (req, res) => {
    try {
        const {
            q,
            pagina,
            por_pagina
        } = req.query;

        const resultado =
            await clienteModel.listarClientes({
                q,
                pagina,
                porPagina: por_pagina
            });

        return res.json({
            success: true,
            clientes: resultado.clientes,
            total: resultado.total,
            paginas: resultado.paginas,
            resumen: resultado.resumen
        });

    } catch (error) {
        console.error(
            'Error al listar clientes:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al listar los clientes',
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
    listarClientes
};