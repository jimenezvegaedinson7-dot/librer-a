const ventaModel = require('../models/venta.model');
const usuarioModel = require('../models/usuario.model');
const { enviarCorreoOrdenCreada, enviarCorreoPagoConfirmado, enviarCorreoPagoRechazado } = require('../integrations/mailer');

const notificarOrdenCreada = async ({ idUsuario, correoCompra, idVenta, items, total, costoEnvio, tipoEntrega }) => {
    if (!correoCompra) return;
    const usuario = await usuarioModel.buscarPorId(idUsuario);
    await enviarCorreoOrdenCreada({ destinatario: correoCompra, nombre: usuario?.nombre || '', idVenta, items, total, costoEnvio, tipoEntrega });
};

const notificarPagoConfirmado = async (venta) => {
    const destinatario = venta.correo_compra;
    if (!destinatario) return;
    const usuario = await usuarioModel.buscarPorId(venta.id_usuario);
    await enviarCorreoPagoConfirmado({ destinatario, nombre: usuario?.nombre || '', idVenta: venta.id_venta, total: venta.total, externalReference: venta.external_reference });
};

const notificarPagoRechazado = async (venta, estadoPayu) => {
    const destinatario = venta.correo_compra;
    if (!destinatario) return;
    const usuario = await usuarioModel.buscarPorId(venta.id_usuario);
    await enviarCorreoPagoRechazado({
        destinatario,
        nombre: usuario?.nombre || '',
        idVenta: venta.id_venta,
        total: venta.total,
        estado: estadoPayu || venta.payu_payment_status || 'rechazado'
    });
};

const notificarResultadoPago = (resultado) => {
    if (!resultado?.cambio_estado) return;
    const { venta } = resultado;
    const envio = venta.estado === 'pagada' ? notificarPagoConfirmado(venta) : venta.estado === 'cancelada' ? notificarPagoRechazado(venta, venta.payu_payment_status) : null;
    envio?.catch((error) => console.error('No se pudo enviar la notificación de pago:', error.message));
};

const aplicarEstadoPagoAVenta = async ({ externalReference, payuOrderId, payuPaymentId, payuPaymentStatus, payuPayerEmail, monto, moneda, reportedReference = externalReference }) => {
    const resultado = await ventaModel.aplicarPago({ externalReference, payuOrderId, payuPaymentId, payuPaymentStatus, payuPayerEmail, monto, moneda, reportedReference });
    notificarResultadoPago(resultado);
    return resultado;
};

module.exports = { notificarOrdenCreada, notificarResultadoPago, aplicarEstadoPagoAVenta };
