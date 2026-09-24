const ubicacionModel = require('../models/ubicacion.model');
const historialModel = require('../models/historial.model');
const { validarId } = require('../utils/validaciones');

// ========================================
// REGISTRAR HISTORIAL SIN AFECTAR LA OPERACIÓN
// ========================================
const registrarHistorial = async ({
    id_usuario,
    tipo_operacion,
    modulo,
    descripcion
}) => {
    try {
        await historialModel.crear({
            id_usuario,
            tipo_operacion,
            modulo,
            descripcion
        });
    } catch (error) {
        console.error(
            'Error al registrar historial:',
            error.message
        );
    }
};

// ========================================
// LISTAR PROVINCIAS DE LIMA
// ========================================
const listarProvincias = async (_req, res) => {
    try {
        const provincias =
            await ubicacionModel.obtenerProvincias();

        return res.status(200).json({
            success: true,
            data: provincias
        });

    } catch (error) {
        console.error('Error al listar provincias:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al listar las provincias'
        });
    }
};

// ========================================
// LISTAR DISTRITOS DE UNA PROVINCIA
// ========================================
const listarDistritos = async (req, res) => {
    try {
        const id_provincia =
            validarId(req.params.id_provincia);

        if (!id_provincia) {
            return res.status(400).json({
                success: false,
                mensaje: 'El id de la provincia no es válido'
            });
        }

        const distritos =
            await ubicacionModel
                .obtenerDistritosPorProvincia(
                    id_provincia
                );

        if (distritos.length === 0) {
            return res.status(404).json({
                success: false,
                mensaje: 'La provincia no existe o no tiene distritos'
            });
        }

        return res.status(200).json({
            success: true,
            data: distritos
        });

    } catch (error) {
        console.error('Error al listar distritos:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al listar los distritos'
        });
    }
};

// ========================================
// ACTUALIZAR TARIFA DE ENVÍO DE UN DISTRITO (ADMIN)
// PUT /api/ubicaciones/distritos/:id  { tarifa_envio }
// Solo distritos de la provincia de Lima; solo el campo tarifa_envio.
// ========================================
const TARIFA_MAXIMA = 99999999.99; // límite de NUMERIC(10,2)

const actualizarTarifaDistrito = async (req, res) => {
    try {
        const id_distrito = validarId(req.params.id);

        if (!id_distrito) {
            return res.status(400).json({
                success: false,
                mensaje: 'El id del distrito no es válido'
            });
        }

        // Solo se acepta tarifa_envio: nombre, provincia u otros campos
        // no se pueden modificar por esta vía.
        const cuerpo = req.body && typeof req.body === 'object' ? req.body : {};
        const camposExtra = Object.keys(cuerpo).filter((k) => k !== 'tarifa_envio');

        if (camposExtra.length > 0) {
            return res.status(400).json({
                success: false,
                mensaje: 'Solo se puede modificar la tarifa de envío (tarifa_envio)'
            });
        }

        const valor = cuerpo.tarifa_envio;
        const tarifa =
            typeof valor === 'number' ||
            (typeof valor === 'string' && valor.trim() !== '')
                ? Number(valor)
                : NaN;

        if (!Number.isFinite(tarifa)) {
            return res.status(400).json({
                success: false,
                mensaje: 'La tarifa de envío debe ser un número'
            });
        }

        if (tarifa < 0 || tarifa > TARIFA_MAXIMA) {
            return res.status(400).json({
                success: false,
                mensaje: 'La tarifa de envío debe ser mayor o igual a 0'
            });
        }

        const distrito = await ubicacionModel.existeDistrito(id_distrito);

        if (!distrito) {
            return res.status(404).json({
                success: false,
                mensaje: 'El distrito no existe'
            });
        }

        if (!ubicacionModel.esDistritoDeLima(distrito)) {
            return res.status(400).json({
                success: false,
                mensaje: 'Solo se pueden modificar las tarifas de los distritos de Lima'
            });
        }

        const tarifaAnterior = Number(distrito.tarifa_envio);
        const tarifaNueva = Math.round(tarifa * 100) / 100;

        const actualizado =
            await ubicacionModel.actualizarTarifaDistrito(
                id_distrito,
                tarifaNueva
            );

        await registrarHistorial({
            id_usuario: req.usuario.id_usuario,
            tipo_operacion: 'ACTUALIZAR',
            modulo: 'tarifas_envio',
            descripcion:
                `Tarifa de envío de ${actualizado.nombre} cambiada de ` +
                `S/ ${tarifaAnterior.toFixed(2)} a S/ ${tarifaNueva.toFixed(2)}`
        });

        return res.status(200).json({
            success: true,
            mensaje: 'Tarifa de envío actualizada correctamente',
            data: {
                id_distrito: actualizado.id_distrito,
                nombre: actualizado.nombre,
                tarifa_envio: Number(actualizado.tarifa_envio)
            }
        });

    } catch (error) {
        console.error('Error al actualizar la tarifa de envío:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al actualizar la tarifa de envío'
        });
    }
};

module.exports = {
    listarProvincias,
    listarDistritos,
    actualizarTarifaDistrito
};