const ubicacionModel = require('../models/ubicacion.model');
const { validarId } = require('../utils/validaciones');

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

module.exports = {
    listarProvincias,
    listarDistritos
};