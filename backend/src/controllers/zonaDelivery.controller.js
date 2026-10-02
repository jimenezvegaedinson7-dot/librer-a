const zonaModel = require('../models/zonaDelivery.model');
const historialModel = require('../models/historial.model');
const { validarId, esEstadoValido } = require('../utils/validaciones');

function validarZona(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).some((campo) => !['nombre', 'tarifa', 'estado'].includes(campo))) {
        return 'Solo se admiten nombre, tarifa y estado de la zona';
    }
    if (typeof body.nombre !== 'string' || !body.nombre.trim() || body.nombre.trim().length > 80) {
        return 'Indica un nombre de zona de hasta 80 caracteres';
    }
    const tarifa = typeof body.tarifa === 'number' ||
        (typeof body.tarifa === 'string' && body.tarifa.trim() !== '') ? Number(body.tarifa) : NaN;
    if (!Number.isFinite(tarifa) || tarifa < 0.01 || tarifa > 99999999.99 ||
        Math.abs(tarifa * 100 - Math.round(tarifa * 100)) > 0.00001) {
        return 'La tarifa debe ser positiva, con un máximo de dos decimales';
    }
    if (!esEstadoValido(body.estado)) return 'El estado de la zona debe ser 0 o 1';
    return null;
}

const listarZonas = async (_req, res, next) => {
    try { res.json({ success: true, data: await zonaModel.listar(true) }); }
    catch (error) { next(error); }
};
const listarTodasZonas = async (_req, res, next) => {
    try { res.json({ success: true, data: await zonaModel.listar(false) }); }
    catch (error) { next(error); }
};

async function guardar(req, res, next, esNueva) {
    const id = esNueva ? null : validarId(req.params.id);
    if (!esNueva && !id) return res.status(400).json({ success: false, mensaje: 'El id de zona no es válido' });
    const mensaje = validarZona(req.body);
    if (mensaje) return res.status(400).json({ success: false, mensaje });
    const datos = { nombre: req.body.nombre.trim(), tarifa: Number(req.body.tarifa), estado: Number(req.body.estado) };
    try {
        const zona = esNueva ? await zonaModel.crear(datos) : await zonaModel.actualizar(id, datos);
        if (!zona) return res.status(404).json({ success: false, mensaje: 'La zona no existe' });
        try {
            await historialModel.crear({
                id_usuario: req.usuario.id_usuario, tipo_operacion: esNueva ? 'CREAR' : 'ACTUALIZAR',
                modulo: 'tarifas_envio', descripcion: `Zona Pallasca: ${zona.nombre}, tarifa S/ ${Number(zona.tarifa).toFixed(2)}, ${zona.estado === 1 ? 'activa' : 'inactiva'}`
            });
        } catch (error) { console.error('Error al registrar historial de zona:', error.message); }
        return res.status(esNueva ? 201 : 200).json({ success: true, data: zona, mensaje: 'Zona de delivery guardada correctamente' });
    } catch (error) {
        if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, mensaje: 'Ya existe una zona con ese nombre' });
        }
        return next(error);
    }
}

const crearZona = (req, res, next) => guardar(req, res, next, true);
const actualizarZona = (req, res, next) => guardar(req, res, next, false);
module.exports = { listarZonas, listarTodasZonas, crearZona, actualizarZona };
