const reservaModel = require('../models/reserva.model');
const historialModel = require('../models/historial.model');
const { validarId } = require('../utils/validaciones');
const { esPersonalInterno } = require('../utils/roles');
const { conPortadaCatalogo } = require('../utils/portadasCatalogo');

// Las reservas existentes se conservan para consulta y liberación de stock.
// Ninguna reserva puede crear una venta ni registrar un cobro.
const crearReserva = async (_req, res) => res.status(405).json({
    success: false,
    mensaje: 'La creación de reservas está retirada. Compra desde la web o la app con PayU.'
});

const obtenerReservas = async (_req, res) => {
    try {
        return res.json({ success: true, data: await reservaModel.obtenerTodos() });
    } catch (error) {
        console.error('Error al consultar reservas históricas:', error.message);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar las reservas' });
    }
};

const obtenerMisReservas = async (req, res) => {
    try {
        const rows = await reservaModel.obtenerPorUsuario(req.usuario.id_usuario);
        return res.json({ success: true, data: rows.map(conPortadaCatalogo) });
    } catch (error) {
        console.error('Error al consultar reservas propias:', error.message);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar tus reservas' });
    }
};

const obtenerReserva = async (req, res) => {
    try {
        const id = validarId(req.params.id);
        if (!id) return res.status(400).json({ success: false, mensaje: 'ID de reserva inválido' });
        const reserva = await reservaModel.obtenerPorId(id);
        if (!reserva) return res.status(404).json({ success: false, mensaje: 'Reserva no encontrada' });
        if (Number(reserva.id_usuario) !== Number(req.usuario.id_usuario) && !esPersonalInterno(req.usuario.rol)) {
            return res.status(403).json({ success: false, mensaje: 'No tienes permisos para ver esta reserva' });
        }
        return res.json({ success: true, data: reserva });
    } catch (error) {
        console.error('Error al consultar reserva:', error.message);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar la reserva' });
    }
};

async function cancelar(req, res, soloPropietario) {
    try {
        const id = validarId(req.params.id);
        if (!id) return res.status(400).json({ success: false, mensaje: 'ID de reserva inválido' });
        const reserva = await reservaModel.obtenerPorId(id);
        if (!reserva) return res.status(404).json({ success: false, mensaje: 'Reserva no encontrada' });
        if (soloPropietario && Number(reserva.id_usuario) !== Number(req.usuario.id_usuario)) {
            return res.status(403).json({ success: false, mensaje: 'No tienes permisos para cancelar esta reserva' });
        }
        const actualizado = await reservaModel.actualizarEstado(id, 'cancelada');
        if (!actualizado) return res.status(404).json({ success: false, mensaje: 'Reserva no encontrada' });
        await historialModel.crear({ id_usuario: req.usuario.id_usuario, tipo_operacion: 'ACTUALIZAR',
            modulo: 'reservas', descripcion: `Reserva histórica #${id} cancelada; stock liberado.` }).catch(error => {
            console.error('Error al registrar cancelación de reserva:', error.message);
        });
        return res.json({ success: true, mensaje: 'Reserva cancelada; stock liberado correctamente' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, mensaje: error.message });
        console.error('Error al cancelar reserva:', error.message);
        return res.status(500).json({ success: false, mensaje: 'Error al cancelar la reserva' });
    }
}

const actualizarEstado = async (req, res) => {
    if (req.body.estado !== 'cancelada') return res.status(409).json({
        success: false, mensaje: 'Las reservas históricas solo admiten consulta y cancelación; no se completan ni generan ventas.'
    });
    return cancelar(req, res, false);
};
const cancelarReserva = (req, res) => cancelar(req, res, true);

module.exports = { obtenerReservas, obtenerReserva, obtenerMisReservas, crearReserva, actualizarEstado, cancelarReserva };
