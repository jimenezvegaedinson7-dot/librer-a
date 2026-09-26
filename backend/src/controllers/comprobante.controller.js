const comprobanteModel = require('../models/comprobante.model');
const historialModel = require('../models/historial.model');
const empresaModel = require('../models/empresa.model');
const { validarId } = require('../utils/validaciones');
const { enviarComprobantePorEmail } = require('../utils/mailer');

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
        const status = error.status || 500;

        if (status >= 400 && status < 500) {
            return res.status(status).json({
                success: false,
                mensaje:
                    error.message ||
                    'Error al generar el comprobante'
            });
        }

        console.error(
            'Error al generar comprobante:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al generar el comprobante'
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
            envio,
            estado,
            pagina,
            por_pagina
        } = req.query;

        const resultado =
            await comprobanteModel.listarComprobantes({
                tipo,
                q,
                envio,
                estado,
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
// ENVIAR COMPROBANTE POR CORREO
// POST /api/comprobantes/:id/enviar-email
// ========================================
const enviarComprobanteEmail = async (req, res) => {
    try {
        const { id } = req.params;

        const idComprobante = validarId(id);

        if (!idComprobante) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de comprobante inválido'
            });
        }

        const comprobante =
            await comprobanteModel.obtenerComprobante(
                idComprobante
            );

        if (!comprobante) {
            return res.status(404).json({
                success: false,
                mensaje: 'Comprobante no encontrado'
            });
        }

        if (comprobante.estado === 'anulado') {
            return res.status(400).json({
                success: false,
                mensaje: 'Este comprobante está anulado: no se envía al cliente'
            });
        }

        // En ventas de mostrador la cuenta de la venta es la del
        // administrador: nunca se usa como destinatario.
        const esMostrador = comprobante.origen === 'panel';

        const emailDestino =
            comprobante.cliente_email ||
            comprobante.correo_compra ||
            (esMostrador ? null : comprobante.correo_usuario);

        if (!emailDestino) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'No hay correo electrónico registrado para este cliente'
            });
        }

        const nombreCliente =
            comprobante.cliente_nombre ||
            (esMostrador
                ? ''
                : `${comprobante.nombre_usuario || ''} ${comprobante.apellido_usuario || ''}`.trim()) ||
            'Cliente';

        const empresa = await empresaModel.obtenerEmpresa().catch(() => ({}));

        const resultado =
            await enviarComprobantePorEmail({
                destinatario: emailDestino,
                nombre: nombreCliente,
                tipo: comprobante.tipo,
                serie: comprobante.serie,
                numero: comprobante.numero,
                clienteDniRuc: comprobante.cliente_dni_ruc,
                clienteTipoDocumento: comprobante.cliente_tipo_documento,
                clienteEmail: comprobante.cliente_email || comprobante.correo_compra,
                subtotal: comprobante.subtotal,
                igv: comprobante.igv,
                costoEnvio: comprobante.costo_envio,
                total: comprobante.total,
                opGravada: comprobante.op_gravada,
                opExonerada: comprobante.op_exonerada,
                numeroSunat: comprobante.numero_sunat,
                items: comprobante.detalle || [],
                empresaRazon: empresa.razon_social || comprobante.razon_social,
                empresaRuc: empresa.ruc || comprobante.ruc,
                empresaNombreComercial: empresa.nombre_comercial,
                empresaDireccion: empresa.direccion,
                fechaEmision: comprobante.fecha_emision
            });

        if (resultado.enviado) {
            const pool = require('../config/database');
            await pool.query(
                'UPDATE comprobantes SET enviado_por_email = TRUE, fecha_envio_email = NOW() WHERE id_comprobante = ?',
                [idComprobante]
            );
        }

        return res.json({
            success: true,
            mensaje: `Comprobante enviado a ${emailDestino}`,
            enviado: resultado.enviado,
            consola: resultado.consola || false
        });

    } catch (error) {
        console.error(
            'Error al enviar comprobante por correo:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al enviar el comprobante por correo'
        });
    }
};

// ========================================
// EXPORTAR CONTROLADORES
// ========================================
// ========================================
// REGISTRAR NÚMERO SUNAT (ADMIN)
// PUT /api/comprobantes/:id/sunat
// { numero_sunat, nota_credito_sunat }
// ========================================
const registrarSunat = async (req, res) => {
    try {
        const idComprobante = validarId(req.params.id);
        if (!idComprobante) {
            return res.status(400).json({ success: false, mensaje: 'ID de comprobante inválido' });
        }

        const { numero_sunat, nota_credito_sunat } = req.body;
        if (!numero_sunat && !nota_credito_sunat) {
            return res.status(400).json({
                success: false,
                mensaje: 'Indica el número del comprobante SUNAT o de su nota de crédito'
            });
        }

        const comprobante = await comprobanteModel.registrarSunat(idComprobante, {
            numero_sunat,
            nota_credito_sunat
        });
        if (!comprobante) {
            return res.status(404).json({ success: false, mensaje: 'Comprobante no encontrado' });
        }

        await registrarHistorialComprobante(req, idComprobante,
            `Comprobante #${idComprobante}: SUNAT ${comprobante.numero_sunat || '—'}` +
            (comprobante.nota_credito_sunat ? `, nota de crédito ${comprobante.nota_credito_sunat}` : ''));

        return res.json({ success: true, mensaje: 'Datos de SUNAT registrados', comprobante });
    } catch (error) {
        return responderError(res, error, 'Error al registrar los datos de SUNAT');
    }
};

// ========================================
// ANULAR COMPROBANTE (ADMIN)
// POST /api/comprobantes/:id/anular
// { motivo, nota_credito_sunat }
// ========================================
const anularComprobante = async (req, res) => {
    try {
        const idComprobante = validarId(req.params.id);
        if (!idComprobante) {
            return res.status(400).json({ success: false, mensaje: 'ID de comprobante inválido' });
        }

        const motivo = typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '';
        if (motivo.length < 5 || motivo.length > 255) {
            return res.status(400).json({
                success: false,
                mensaje: 'Indica el motivo de la anulación (entre 5 y 255 caracteres)'
            });
        }

        const comprobante = await comprobanteModel.anular(idComprobante, {
            motivo,
            nota_credito_sunat: req.body.nota_credito_sunat
        });
        if (!comprobante) {
            return res.status(404).json({ success: false, mensaje: 'Comprobante no encontrado' });
        }

        await registrarHistorialComprobante(req, idComprobante,
            `Comprobante ${comprobante.serie}-${String(comprobante.numero).padStart(8, '0')} anulado. Motivo: ${motivo}`);

        return res.json({ success: true, mensaje: 'Comprobante anulado', comprobante });
    } catch (error) {
        return responderError(res, error, 'Error al anular el comprobante');
    }
};

const registrarHistorialComprobante = async (req, idComprobante, descripcion) => {
    try {
        await historialModel.crear({
            id_usuario: req.usuario?.id_usuario || null,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'comprobantes',
            descripcion
        });
    } catch (error) {
        console.error(`No se pudo registrar el historial del comprobante #${idComprobante}:`, error.message);
    }
};

const responderError = (res, error, mensajeGenerico) => {
    const status = error.status || 500;
    if (status >= 400 && status < 500) {
        return res.status(status).json({ success: false, mensaje: error.message || mensajeGenerico });
    }
    console.error(mensajeGenerico, error);
    return res.status(500).json({ success: false, mensaje: mensajeGenerico });
};

module.exports = {
    generarComprobante,
    listarComprobantes,
    obtenerComprobante,
    enviarComprobanteEmail,
    registrarSunat,
    anularComprobante
};
