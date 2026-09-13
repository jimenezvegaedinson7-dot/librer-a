const agenciaModel = require('../models/agencia.model');
const { validarId, esNumeroNoNegativo, esEstadoValido } = require('../utils/validaciones');

// ========================================
// LISTAR AGENCIAS COURIER ACTIVAS
// ========================================
const listarAgencias = async (_req, res) => {
    try {
        const agencias =
            await agenciaModel.obtenerActivas();

        return res.status(200).json({
            success: true,
            data: agencias
        });

    } catch (error) {
        console.error('Error al listar agencias:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al listar las agencias'
        });
    }
};

// ========================================
// LISTAR TODAS LAS AGENCIAS (SÓLO ADMIN)
// ========================================
const listarTodasAgencias = async (_req, res) => {
    try {
        const agencias =
            await agenciaModel.obtenerTodas();

        return res.status(200).json({
            success: true,
            data: agencias
        });

    } catch (error) {
        console.error('Error al listar las agencias:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al listar las agencias'
        });
    }
};

// ========================================
// OBTENER UNA AGENCIA POR ID
// ========================================
const obtenerAgencia = async (req, res) => {
    try {
        const id_agencia =
            validarId(req.params.id);

        if (!id_agencia) {
            return res.status(400).json({
                success: false,
                mensaje: 'El id de la agencia no es válido'
            });
        }

        const agencia =
            await agenciaModel.obtenerPorId(id_agencia);

        if (!agencia) {
            return res.status(404).json({
                success: false,
                mensaje: 'Agencia no encontrada'
            });
        }

        return res.status(200).json({
            success: true,
            data: agencia
        });

    } catch (error) {
        console.error('Error al obtener la agencia:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al obtener la agencia'
        });
    }
};

// ========================================
// CREAR AGENCIA (SÓLO ADMIN)
// ========================================
const crearAgencia = async (req, res) => {
    try {
        const {
            nombre,
            tarifa_base,
            descripcion,
            estado
        } = req.body;

        if (
            !nombre ||
            typeof nombre !== 'string' ||
            nombre.trim().length < 2
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'El nombre de la agencia es obligatorio'
            });
        }

        if (
            tarifa_base !== undefined &&
            !esNumeroNoNegativo(tarifa_base)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'La tarifa base debe ser un número mayor o igual a 0'
            });
        }

        if (
            estado !== undefined &&
            !esEstadoValido(estado)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'El estado debe ser 0 o 1'
            });
        }

        const id_agencia =
            await agenciaModel.crear({
                nombre: nombre.trim(),
                tarifa_base: Number(tarifa_base ?? 0),
                descripcion:
                    descripcion?.trim() || null,
                estado: estado ?? 1
            });

        return res.status(201).json({
            success: true,
            mensaje: 'Agencia creada correctamente',
            data: { id_agencia }
        });

    } catch (error) {
        console.error('Error al crear la agencia:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al crear la agencia'
        });
    }
};

// ========================================
// ACTUALIZAR AGENCIA (SÓLO ADMIN)
// ========================================
const actualizarAgencia = async (req, res) => {
    try {
        const id_agencia =
            validarId(req.params.id);

        if (!id_agencia) {
            return res.status(400).json({
                success: false,
                mensaje: 'El id de la agencia no es válido'
            });
        }

        const {
            nombre,
            tarifa_base,
            descripcion,
            estado
        } = req.body;

        if (
            nombre !== undefined &&
            (typeof nombre !== 'string' ||
                nombre.trim().length < 2)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'El nombre de la agencia no es válido'
            });
        }

        if (
            tarifa_base !== undefined &&
            !esNumeroNoNegativo(tarifa_base)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'La tarifa base debe ser un número mayor o igual a 0'
            });
        }

        if (
            estado !== undefined &&
            !esEstadoValido(estado)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'El estado debe ser 0 o 1'
            });
        }

        const filas =
            await agenciaModel.actualizar(
                id_agencia,
                {
                    nombre:
                        nombre?.trim() || undefined,
                    tarifa_base:
                        tarifa_base !== undefined
                            ? Number(tarifa_base)
                            : undefined,
                    descripcion:
                        descripcion === ''
                            ? null
                            : descripcion?.trim(),
                    estado: estado
                }
            );

        if (!filas) {
            // ========================================
            // affectedRows === 0: la agencia puede existir
            // sin cambios (misma data). Solo 404 si NO existe.
            // ========================================
            const agencia =
                await agenciaModel.obtenerPorId(id_agencia);

            if (!agencia) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Agencia no encontrada'
                });
            }

            return res.status(200).json({
                success: true,
                mensaje: 'Agencia actualizada correctamente',
                data: agencia
            });
        }

        return res.status(200).json({
            success: true,
            mensaje: 'Agencia actualizada correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar la agencia:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al actualizar la agencia'
        });
    }
};

module.exports = {
    listarAgencias,
    listarTodasAgencias,
    obtenerAgencia,
    crearAgencia,
    actualizarAgencia
};