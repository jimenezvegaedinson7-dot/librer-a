const zonaModel = require('../models/zonaDelivery.model');
const { ENTREGA_PALLASCA, importeTarifa } = require('../utils/entregaPallasca');
const { validarId } = require('../utils/validaciones');

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
    mensaje: 'Se utiliza una única cobertura para Ciudad de Pallasca. No se crean tarifas por barrio.' });
const actualizarZona = async (req, res, next) => {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ success: false, mensaje: 'ID de cobertura inválido' });
    const body = req.body;
    if (body && typeof body === 'object' && ('nombre' in body || 'estado' in body)) return tarifaFija(req, res);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).some(k => !['tarifa', 'tarifa_anterior'].includes(k)) ||
        importeTarifa(body.tarifa) === null || importeTarifa(body.tarifa_anterior) === null) {
        return res.status(400).json({ success: false, mensaje: 'Envía tarifa y tarifa_anterior: importes positivos en PEN con hasta dos decimales.' });
    }
    try {
        const data = await zonaModel.actualizarTarifaCiudad(id, body.tarifa, body.tarifa_anterior, req.usuario.id_usuario);
        return res.json({ success: true, data, mensaje: data.sin_cambios ? 'La tarifa vigente no cambió.' : 'Tarifa actualizada. Se aplicará únicamente a pedidos nuevos.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, mensaje: error.message });
        return next(error);
    }
};
module.exports = { listarZonas, listarTodasZonas, crearZona: tarifaFija, actualizarZona };
