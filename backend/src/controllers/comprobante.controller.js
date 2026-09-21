const comprobanteModel = require('../models/comprobante.model');
const { validarId } = require('../utils/validaciones');

// ========================================
// GENERAR COMPROBANTE (BOLETA / FACTURA)
// POST /api/ventas/:id/comprobante (admin)
// ========================================
const generarComprobante = async (req, res) => {
    try {
        const { id } = req.params;

        const idVenta = validarId(id);

        if (!idVenta) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de venta inválido'
            });
        }

        const {
            tipo,
            cliente_dni_ruc,
            cliente_tipo_documento,
            cliente_nombre,
            cliente_email
        } = req.body;

        const emailCliente =
            typeof cliente_email === 'string'
                ? cliente_email.trim()
                : '';

        if (
            emailCliente &&
            (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCliente) ||
                emailCliente.length > 255)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'El correo del cliente no es válido'
            });
        }

        const comprobante =
            await comprobanteModel.generarComprobante({
                id_venta: idVenta,
                tipo: tipo || 'boleta',
                cliente_dni_ruc,
                cliente_tipo_documento,
                cliente_nombre,
                cliente_email: emailCliente || undefined
            });

        return res.status(201).json({
            success: true,
            comprobante
        });

    } catch (error) {
        console.error(
            'Error al generar comprobante:',
            error
        );

        const status = error.status || 500;

        if (status >= 400 && status < 500) {
            return res.status(status).json({
                success: false,
                mensaje:
                    error.message ||
                    'Error al generar el comprobante'
            });
        }

        return res.status(500).json({
            success: false,
            mensaje:
                error.message ||
                'Error al generar el comprobante',
            _debug_code: error.code || null,
            _debug_detail: error.detail || null
        });
    }
};

// ========================================
// LISTAR COMPROBANTES (ADMIN)
// GET /api/comprobantes
// ========================================
const listarComprobantes = async (req, res) => {
    try {
        const {
            tipo,
            q,
            pagina,
            por_pagina
        } = req.query;

        const resultado =
            await comprobanteModel.listarComprobantes({
                tipo,
                q,
                pagina,
                porPagina: por_pagina
            });

        return res.json({
            success: true,
            comprobantes:
                resultado.comprobantes,
            total: resultado.total,
            paginas: resultado.paginas
        });

    } catch (error) {
        console.error(
            'Error al listar comprobantes:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al listar los comprobantes'
        });
    }
};

// ========================================
// OBTENER COMPROBANTE POR ID (ADMIN)
// GET /api/comprobantes/:id
// ========================================
const obtenerComprobante = async (req, res) => {
    try {
        const { id } = req.params;

        const idComprobante = validarId(id);

        if (!idComprobante) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'ID de comprobante inválido'
            });
        }

        const comprobante =
            await comprobanteModel.obtenerComprobante(
                idComprobante
            );

        if (!comprobante) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Comprobante no encontrado'
            });
        }

        return res.json({
            success: true,
            comprobante
        });

    } catch (error) {
        console.error(
            'Error al obtener comprobante:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener el comprobante'
        });
    }
};

// ========================================
// EXPORTAR CONTROLADORES
// ========================================
module.exports = {
    generarComprobante,
    listarComprobantes,
    obtenerComprobante
};
