const zonaModel = require('../models/zonaDelivery.model');
const { ENTREGA_PALLASCA } = require('../utils/entregaPallasca');

const listarZonas = async (_req, res, next) => {
    try { res.json({ success: true, data: await zonaModel.listar(true), entrega: ENTREGA_PALLASCA }); }
    catch (error) { next(error); }
};
const listarTodasZonas = async (_req, res, next) => {
    try { res.json({ success: true, data: await zonaModel.listar(false), entrega: ENTREGA_PALLASCA }); }
    catch (error) { next(error); }
};
// Compatibilidad de rutas guardadas: ya no se configuran tarifas por barrio.
const tarifaFija = (_req, res) => res.status(409).json({ success: false,
    mensaje: 'El delivery tiene una tarifa fija de S/5 para toda la ciudad de Pallasca. No se crean ni editan tarifas por zona.' });
module.exports = { listarZonas, listarTodasZonas, crearZona: tarifaFija, actualizarZona: tarifaFija };
