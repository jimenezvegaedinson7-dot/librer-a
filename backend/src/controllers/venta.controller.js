const ventaModel = require('../models/venta.model');
const { validarId } = require('../utils/validaciones');
const { esPersonalInterno } = require('../utils/roles');
const { PUBLIC_BASE_URL } = require('../config/payu');

const errorRespuesta = (res, error, mensaje) => {
    if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ success: false, mensaje: error.message });
    console.error(mensaje, error.message);
    return res.status(500).json({ success: false, mensaje });
};
const puedeLeer = (req, venta) => Number(venta.id_usuario) === Number(req.usuario.id_usuario) || esPersonalInterno(req.usuario.rol);
const obtenerVentas = async (_req, res) => {
    try { return res.json({ success: true, data: await ventaModel.obtenerTodos() }); }
    catch (error) { return errorRespuesta(res, error, 'Error al obtener las ventas'); }
};
const obtenerMisVentas = async (req, res) => {
    try { return res.json({ success: true, data: await ventaModel.obtenerPorUsuario(req.usuario.id_usuario) }); }
    catch (error) { return errorRespuesta(res, error, 'Error al obtener tus ventas'); }
};
const obtenerVenta = async (req, res) => {
    try {
        const id = validarId(req.params.id);
        if (!id) return res.status(400).json({ success: false, mensaje: 'ID de venta inválido' });
        const venta = await ventaModel.obtenerPorId(id);
        if (!venta) return res.status(404).json({ success: false, mensaje: 'Venta no encontrada' });
        if (!puedeLeer(req, venta)) return res.status(403).json({ success: false, mensaje: 'No tienes permisos para consultar esta venta' });
        return res.json({ success: true, data: venta });
    } catch (error) { return errorRespuesta(res, error, 'Error al obtener la venta'); }
};

// Tombstone para clientes antiguos: Pedidos es la única fuente logística.
const actualizarEstadoVenta = async (_req, res) => res.status(409).json({ success: false,
    mensaje: 'Los estados de venta no se modifican manualmente. Usa Pedidos para entrega y PayU para cobros y devoluciones.' });

const reembolsarVenta = async (req, res) => {
    try {
        const id = validarId(req.params.id);
        if (!id) return res.status(400).json({ success: false, mensaje: 'ID de venta inválido' });
        const motivo = typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '';
        if (motivo.length < 5 || motivo.length > 255) return res.status(422).json({ success: false, mensaje: 'Indica el motivo (entre 5 y 255 caracteres)' });
        const accion = req.body.accion ?? 'confirmar';
        if (!['solicitar', 'confirmar'].includes(accion)) return res.status(422).json({ success: false, mensaje: 'Acción de devolución no válida' });
        for (const [campo, max] of [['referencia_reembolso', 100], ['evidencia_reembolso', 500]]) {
            if (req.body[campo] != null && (typeof req.body[campo] !== 'string' || req.body[campo].length > max || /[\r\n\x00]/.test(req.body[campo]))) {
                return res.status(422).json({ success: false, mensaje: `El campo ${campo} debe ser un texto de hasta ${max} caracteres` });
            }
        }
        const result = await ventaModel.reembolsar(id, { accion, motivo, idUsuario: req.usuario.id_usuario,
            devolverStock: req.body.devolver_stock === true, referencia: req.body.referencia_reembolso?.trim() || null,
            evidencia: req.body.evidencia_reembolso?.trim() || null });
        if (!result) return res.status(404).json({ success: false, mensaje: 'Venta no encontrada' });
        return res.json({ success: true,
            mensaje: accion === 'solicitar'
                ? 'Solicitud registrada, pendiente de verificar la devolución en PayU. No se devolvió dinero ni se modificó inventario o comprobantes.'
                : 'Devolución externa confirmada documentalmente por el administrador. Esta API no ejecutó ni verificó automáticamente un refund PayU.',
            data: { id_venta: id, ...result, tipo_operacion: accion === 'solicitar' ? 'solicitud_devolucion' : 'confirmacion_documental',
                dinero_devuelto_por_api: false, verificado_por_payu_api: false } });
    } catch (error) { return errorRespuesta(res, error, 'Error al registrar la devolución'); }
};

const obtenerPagoVenta = async (req, res) => {
    try {
        const id = validarId(req.params.id);
        if (!id) return res.status(400).json({ success: false, mensaje: 'ID de venta inválido' });
        const pago = await ventaModel.obtenerDatosPago(id);
        if (!pago) return res.status(404).json({ success: false, mensaje: 'Venta no encontrada' });
        if (!puedeLeer(req, pago)) return res.status(403).json({ success: false, mensaje: 'No tienes permisos para consultar esta venta' });
        const tienePago = pago.payu_payment_id || pago.payu_payment_status || pago.external_reference;
        const checkout = pago.estado === 'pendiente' && pago.external_reference
            ? `${PUBLIC_BASE_URL}/api/pagos/checkout/${encodeURIComponent(pago.external_reference)}` : null;
        return res.json({ success: true, data: { id_venta: pago.id_venta, external_reference: pago.external_reference,
            payu_order_id: pago.payu_order_id, order_id: pago.external_reference || pago.payu_order_id, checkout_url: checkout,
            payu_payment_id: pago.payu_payment_id, payu_payment_status: pago.payu_payment_status,
            metodo_pago: tienePago ? 'payu' : null, estado_pago: pago.payu_payment_status || null,
            fecha_pago: pago.fecha_pago || null, estado: pago.estado, estado_venta: pago.estado } });
    } catch (error) { return errorRespuesta(res, error, 'Error al obtener los datos de pago de la venta'); }
};
module.exports = { obtenerVentas, obtenerVenta, obtenerMisVentas, actualizarEstadoVenta, obtenerPagoVenta, reembolsarVenta };
