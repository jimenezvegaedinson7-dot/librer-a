const jwt = require('jsonwebtoken');

const reclamacionModel = require('../models/reclamacion.model');
const empresaModel = require('../models/empresa.model');
const historialModel = require('../models/historial.model');
const { validarId } = require('../utils/validaciones');
const {
    enviarConstanciaReclamacion,
    enviarRespuestaReclamacion
} = require('../utils/mailer');

// ========================================
// LIBRO DE RECLAMACIONES
// ----------------------------------------
// POST /api/reclamaciones           público (con o sin sesión)
// GET  /api/reclamaciones           admin
// GET  /api/reclamaciones/resumen   admin
// GET  /api/reclamaciones/:id       admin
// PUT  /api/reclamaciones/:id/respuesta  admin
// ========================================

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const texto = (valor, max) =>
    typeof valor === 'string' ? valor.trim().slice(0, max) : '';

// Valida y normaliza la hoja. Devuelve { datos } o { error }.
const validarHoja = (body) => {
    const datos = {
        tipo: texto(body.tipo, 10).toLowerCase(),
        consumidor_nombre: texto(body.consumidor_nombre, 160),
        consumidor_tipo_documento: texto(body.consumidor_tipo_documento, 10).toUpperCase(),
        consumidor_documento: texto(body.consumidor_documento, 20),
        consumidor_domicilio: texto(body.consumidor_domicilio, 255),
        consumidor_telefono: texto(body.consumidor_telefono, 20),
        consumidor_email: texto(body.consumidor_email, 255),
        es_menor: body.es_menor === true || body.es_menor === 'true',
        apoderado_nombre: texto(body.apoderado_nombre, 160),
        bien_tipo: texto(body.bien_tipo, 10).toLowerCase(),
        bien_descripcion: texto(body.bien_descripcion, 255),
        detalle: texto(body.detalle, 3000),
        pedido: texto(body.pedido, 2000)
    };

    if (!['reclamo', 'queja'].includes(datos.tipo)) {
        return { error: 'Indica si es un reclamo o una queja' };
    }
    if (datos.consumidor_nombre.length < 3) {
        return { error: 'Indica tu nombre completo' };
    }
    if (!['DNI', 'CE', 'PASAPORTE', 'RUC'].includes(datos.consumidor_tipo_documento)) {
        return { error: 'Tipo de documento no válido' };
    }
    if (datos.consumidor_tipo_documento === 'DNI' && !/^\d{8}$/.test(datos.consumidor_documento)) {
        return { error: 'El DNI debe tener 8 dígitos' };
    }
    if (datos.consumidor_tipo_documento === 'RUC' && !/^\d{11}$/.test(datos.consumidor_documento)) {
        return { error: 'El RUC debe tener 11 dígitos' };
    }
    if (datos.consumidor_documento.length < 5) {
        return { error: 'Indica tu número de documento' };
    }
    if (datos.consumidor_domicilio.length < 5) {
        return { error: 'Indica tu domicilio' };
    }
    if (!EMAIL.test(datos.consumidor_email)) {
        return { error: 'Indica un correo válido: ahí recibirás la copia y la respuesta' };
    }
    if (datos.consumidor_telefono && !/^[\d\s+()-]{6,20}$/.test(datos.consumidor_telefono)) {
        return { error: 'Teléfono no válido' };
    }
    if (datos.es_menor && datos.apoderado_nombre.length < 3) {
        return { error: 'Si eres menor de edad, indica el nombre de tu padre, madre o apoderado' };
    }
    if (!['producto', 'servicio'].includes(datos.bien_tipo)) {
        return { error: 'Indica si es un producto o un servicio' };
    }
    if (datos.bien_descripcion.length < 3) {
        return { error: 'Describe el producto o servicio' };
    }
    if (datos.detalle.length < 10) {
        return { error: 'Describe el detalle de tu reclamo o queja (al menos 10 caracteres)' };
    }
    if (datos.pedido.length < 5) {
        return { error: 'Indica qué solicitas' };
    }

    if (body.monto_reclamado !== undefined && body.monto_reclamado !== null && body.monto_reclamado !== '') {
        const monto = Number(body.monto_reclamado);
        if (!Number.isFinite(monto) || monto < 0 || monto > 1000000) {
            return { error: 'Monto reclamado no válido' };
        }
        datos.monto_reclamado = Number(monto.toFixed(2));
    }

    if (body.id_venta !== undefined && body.id_venta !== null && body.id_venta !== '') {
        const idVenta = validarId(body.id_venta);
        if (!idVenta) {
            return { error: 'Número de pedido no válido' };
        }
        datos.id_venta = idVenta;
    }

    if (!datos.es_menor) {
        datos.apoderado_nombre = '';
    }
    return { datos };
};

// Si llega con sesión válida, se enlaza al usuario (no es obligatorio).
const usuarioOpcional = (req) => {
    const partes = String(req.headers.authorization || '').split(' ');
    if (partes[0] !== 'Bearer' || !partes[1] || !process.env.JWT_SECRET) {
        return null;
    }
    try {
        return jwt.verify(partes[1], process.env.JWT_SECRET)?.id_usuario || null;
    } catch {
        return null;
    }
};

const registrar = async (req, res) => {
    try {
        const { datos, error } = validarHoja(req.body || {});
        if (error) {
            return res.status(400).json({ success: false, mensaje: error });
        }

        const reclamacion = await reclamacionModel.crear({
            ...datos,
            id_usuario: usuarioOpcional(req)
        });

        const empresa = await empresaModel.obtenerEmpresa().catch(() => ({}));
        // La copia al consumidor no debe bloquear el registro.
        enviarConstanciaReclamacion({ reclamacion, empresa }).catch((errorCorreo) => {
            console.error('No se pudo enviar la constancia del reclamo:', errorCorreo.message);
        });

        return res.status(201).json({
            success: true,
            mensaje: `Registramos tu hoja N.° ${reclamacion.numero}. Te enviamos una copia a ${reclamacion.consumidor_email}.`,
            data: {
                id_reclamacion: reclamacion.id_reclamacion,
                numero: reclamacion.numero,
                fecha_registro: reclamacion.fecha_registro,
                fecha_limite: reclamacion.fecha_limite
            }
        });
    } catch (error) {
        console.error('Error al registrar reclamación:', error);
        return res.status(500).json({ success: false, mensaje: 'No se pudo registrar la hoja de reclamación' });
    }
};

const listar = async (req, res) => {
    try {
        const reclamaciones = await reclamacionModel.listar({
            estado: req.query.estado,
            q: req.query.q
        });
        return res.json({ success: true, data: reclamaciones });
    } catch (error) {
        console.error('Error al listar reclamaciones:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al listar las reclamaciones' });
    }
};

const resumen = async (req, res) => {
    try {
        return res.json({ success: true, data: await reclamacionModel.resumen() });
    } catch (error) {
        console.error('Error en el resumen de reclamaciones:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener el resumen' });
    }
};

const obtener = async (req, res) => {
    const id = validarId(req.params.id);
    if (!id) {
        return res.status(400).json({ success: false, mensaje: 'ID no válido' });
    }
    try {
        const reclamacion = await reclamacionModel.obtener(id);
        if (!reclamacion) {
            return res.status(404).json({ success: false, mensaje: 'Hoja no encontrada' });
        }
        return res.json({ success: true, data: reclamacion });
    } catch (error) {
        console.error('Error al obtener reclamación:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener la hoja' });
    }
};

const responder = async (req, res) => {
    const id = validarId(req.params.id);
    if (!id) {
        return res.status(400).json({ success: false, mensaje: 'ID no válido' });
    }
    const respuesta = texto(req.body?.respuesta, 3000);
    if (respuesta.length < 10) {
        return res.status(400).json({ success: false, mensaje: 'Escribe la respuesta (al menos 10 caracteres)' });
    }
    try {
        const reclamacion = await reclamacionModel.responder(id, {
            respuesta,
            idUsuario: req.usuario?.id_usuario
        });
        if (!reclamacion) {
            return res.status(404).json({ success: false, mensaje: 'Hoja no encontrada' });
        }

        try {
            await historialModel.crear({
                id_usuario: req.usuario?.id_usuario || null,
                tipo_operacion: 'ACTUALIZAR',
                modulo: 'reclamaciones',
                descripcion: `Hoja de reclamación N.° ${reclamacion.numero} respondida`
            });
        } catch (errorHistorial) {
            console.error('No se pudo registrar el historial:', errorHistorial.message);
        }

        const empresa = await empresaModel.obtenerEmpresa().catch(() => ({}));
        let enviado = false;
        try {
            const resultado = await enviarRespuestaReclamacion({ reclamacion, empresa });
            enviado = Boolean(resultado?.enviado);
        } catch (errorCorreo) {
            console.error('No se pudo enviar la respuesta del reclamo:', errorCorreo.message);
        }

        return res.json({
            success: true,
            mensaje: enviado
                ? `Respuesta registrada y enviada a ${reclamacion.consumidor_email}`
                : 'Respuesta registrada. No se pudo enviar el correo: comunícala al consumidor por otro medio.',
            data: reclamacion,
            enviado
        });
    } catch (error) {
        if (error.status === 400) {
            return res.status(400).json({ success: false, mensaje: error.message });
        }
        console.error('Error al responder reclamación:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al registrar la respuesta' });
    }
};

module.exports = {
    registrar,
    listar,
    resumen,
    obtener,
    responder,
    validarHoja
};
