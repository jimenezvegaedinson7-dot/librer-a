const ventaModel = require('../models/venta.model');
const { validarId } = require('../utils/validaciones');
const { ENTREGA, ESTADOS_ENTREGA_ACTUALES, esTipoEntregaValido, normalizarEstadoEntrega } = require('../utils/transiciones');
const { resumirPedidos } = require('../utils/pedidos');
const { enviarCorreoAvancePedido, avisoPedido } = require('../utils/mailer');

const fallo = (res, error, mensaje) => {
    if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ success: false, mensaje: error.message });
    console.error(mensaje, error.message);
    return res.status(500).json({ success: false, mensaje, error: 'Error interno del servidor' });
};

const Pedido = {
    async obtenerPedidos(req, res) {
        try {
            const { tipo, estado } = req.query;
            if (tipo !== undefined && !esTipoEntregaValido(tipo) || estado !== undefined && (typeof estado !== 'string' || !Object.hasOwn(ENTREGA, estado))) {
                return res.status(400).json({ success: false, mensaje: 'Filtro de pedidos no válido' });
            }
            // El estado limita la lista, no convierte su categoría en 100%.
            // Lista y resumen salen de la misma lectura y del mismo ámbito.
            const pedidos = await ventaModel.obtenerConFiltros({ tipo_entrega: tipo });
            const data = estado === undefined ? pedidos : pedidos.filter(p =>
                normalizarEstadoEntrega(p.estado_entrega) === normalizarEstadoEntrega(estado));
            return res.json({ success: true, data, resumen: resumirPedidos(pedidos) });
        } catch (error) { return fallo(res, error, 'Error al obtener los pedidos'); }
    },

    async obtenerPedido(req, res) {
        try {
            const id = validarId(req.params.id);
            if (!id) return res.status(400).json({ success: false, mensaje: 'ID de pedido inválido' });
            const pedido = await ventaModel.obtenerPorId(id);
            if (!pedido) return res.status(404).json({ success: false, mensaje: 'Pedido no encontrado' });
            return res.json({ success: true, data: pedido });
        } catch (error) { return fallo(res, error, 'Error al obtener el pedido'); }
    },

    // El parámetro del enlace nunca permite consultar pedidos de otra cuenta.
    async obtenerMisPedidos(req, res) {
        try {
            const pedidos = await ventaModel.obtenerPorUsuario(req.usuario.id_usuario);
            return res.json({ success: true, data: pedidos });
        } catch (error) { return fallo(res, error, 'Error al obtener tus pedidos'); }
    },

    async actualizarEstadoPedido(req, res) {
        try {
            const id = validarId(req.params.id);
            const { estado, confirmado, estado_anterior } = req.body || {};
            if (!id) return res.status(400).json({ success: false, mensaje: 'ID de pedido inválido' });
            if (!ESTADOS_ENTREGA_ACTUALES.includes(estado) || estado_anterior !== undefined && (typeof estado_anterior !== 'string' || !Object.hasOwn(ENTREGA, estado_anterior))) {
                return res.status(400).json({ success: false, mensaje: 'Estado de pedido no válido' });
            }
            const transicion = {};
            // Pago, tipo, finalización, confirmación e historial se validan
            // dentro de la misma transacción y del mismo FOR UPDATE.
            const actualizado = await ventaModel.actualizarEstadoEntrega(id, estado, req.usuario.id_usuario,
                { confirmado: confirmado === true, estadoAnterior: estado_anterior, transicion });
            if (!actualizado) return res.status(404).json({ success: false, mensaje: 'Pedido no encontrado' });

            if (transicion.destinatario && avisoPedido(transicion.tipo_entrega, estado)) {
                await enviarCorreoAvancePedido({ destinatario: transicion.destinatario,
                    nombre: transicion.nombre,
                    idVenta: id, tipoEntrega: transicion.tipo_entrega, estado,
                    direccion: transicion.direccion }).catch(error => {
                    console.error('Error al notificar avance del pedido:', error.message);
                });
            }
            const mensaje = estado !== 'cancelado' ? 'Estado de pedido actualizado correctamente'
                : transicion.estado === 'cancelada'
                    ? 'Compra pendiente cancelada: enlace de pago cerrado y existencias liberadas. Cualquier cobro posterior requiere revisión.'
                    : 'Entrega cancelada. El pago y las existencias se conservan hasta gestionar la devolución desde Ventas.';
            return res.json({ success: true, mensaje, data: { id_venta: id, estado_entrega: transicion.estado_entrega, estado: transicion.estado } });
        } catch (error) { return fallo(res, error, 'Error al actualizar el estado del pedido'); }
    },
};
module.exports = Pedido;
