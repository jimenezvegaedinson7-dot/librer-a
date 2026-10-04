const empresaModel = require('../models/empresa.model');
const historialModel = require('../models/historial.model');
const { esEstadoValido, esNumeroNoNegativo, esTextoValido } = require('../utils/validaciones');

// ========================================
// CAMPOS EDITABLES (whitelist del body)
// ========================================
const CAMPOS_PERMITIDOS = [
    'ruc',
    'razon_social',
    'nombre_comercial',
    'tipo_documento',
    'documento_identidad',
    'direccion',
    'sistema_emision',
    'emisor_electronico',
    'aplica_igv',
    'fecha_inscripcion',
    'fecha_inicio',
    'exoneracion_libros_hasta'
];

// ========================================
// VALIDAR FECHA (YYYY-MM-DD)
// ========================================
const esFechaValida = (valor) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const fecha = new Date(`${valor}T00:00:00Z`);
    return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
};

// ========================================
// OBTENER EMPRESA (PÚBLICO — SIN TOKEN)
// ========================================
const obtenerEmpresa = async (req, res) => {
    try {
        const empresa =
            await empresaModel.obtenerEmpresa();

        return res.json({
            success: true,
            empresa
        });

    } catch (error) {
        console.error(
            'Error al obtener empresa:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener la empresa'
        });
    }
};

// ========================================
// ACTUALIZAR EMPRESA (ADMIN)
// Valida el body contra la whitelist y actualiza.
// ========================================
const actualizarEmpresa = async (req, res) => {
    try {
        const body = req.body || {};

        const largos = { ruc: 11, razon_social: 255, nombre_comercial: 255, tipo_documento: 20,
            documento_identidad: 20, direccion: 255, sistema_emision: 50, emisor_electronico: 255,
            fecha_inscripcion: 10, fecha_inicio: 10, exoneracion_libros_hasta: 10 };
        for (const [campo, maximo] of Object.entries(largos)) {
            if (body[campo] !== undefined && !(body[campo] === null && !['ruc', 'razon_social'].includes(campo)) && !esTextoValido(body[campo], maximo, !['ruc', 'razon_social'].includes(campo))) {
                return res.status(400).json({ success: false, mensaje: `El campo ${campo} no es válido` });
            }
        }
        for (const campo of ['aplica_igv', 'libros_exonerados']) {
            if (body[campo] !== undefined && !esEstadoValido(body[campo])) {
                return res.status(400).json({ success: false, mensaje: `El campo ${campo} debe ser 0 o 1` });
            }
        }
        if (body.tasa_igv !== undefined && (!esNumeroNoNegativo(body.tasa_igv) || Number(body.tasa_igv) > 30)) {
            return res.status(400).json({ success: false, mensaje: 'La tasa del IGV debe estar entre 0 y 30' });
        }

        const campos = {};

        // ========================================
        // VALIDAR RUC (si viene)
        // ========================================
        if (
            body.ruc !== undefined &&
            body.ruc !== null
        ) {
            const ruc = String(body.ruc).trim();

            if (!/^\d{11}$/.test(ruc)) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'El RUC debe tener 11 dígitos numéricos'
                });
            }

            campos.ruc = ruc;
        }

        // ========================================
        // VALIDAR aplica_igv (si viene)
        // ========================================
        if (
            body.aplica_igv !== undefined &&
            body.aplica_igv !== null &&
            body.aplica_igv !== ''
        ) {
            if (
                ![0, 1].includes(
                    Number(body.aplica_igv)
                )
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'El campo aplica_igv debe ser 0 o 1'
                });
            }

            campos.aplica_igv = Number(
                body.aplica_igv
            );
        }

        // ========================================
        // IGV: EXONERACIÓN DE LIBROS (Ley 31053) Y TASA
        // ========================================
        if (
            body.libros_exonerados !== undefined &&
            body.libros_exonerados !== null &&
            body.libros_exonerados !== ''
        ) {
            if (![0, 1].includes(Number(body.libros_exonerados))) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'El campo libros_exonerados debe ser 0 o 1'
                });
            }
            campos.libros_exonerados = Number(body.libros_exonerados);
        }

        if (
            body.tasa_igv !== undefined &&
            body.tasa_igv !== null &&
            body.tasa_igv !== ''
        ) {
            const tasa = Number(body.tasa_igv);
            if (!Number.isFinite(tasa) || tasa < 0 || tasa > 30) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'La tasa del IGV debe estar entre 0 y 30'
                });
            }
            campos.tasa_igv = Number(tasa.toFixed(2));
        }

        // ========================================
        // RECORRER CAMPOS PERMITIDOS
        // ========================================
        for (const campo of CAMPOS_PERMITIDOS) {
            if (
                campo === 'ruc' ||
                campo === 'aplica_igv' ||
                campo === 'libros_exonerados' ||
                campo === 'tasa_igv'
            ) {
                continue;
            }

            if (
                body[campo] === undefined
            ) {
                continue;
            }
            if (body[campo] === null) { campos[campo] = null; continue; }

            const valor = String(body[campo]).trim();

            if (
                campo === 'fecha_inscripcion' ||
                campo === 'fecha_inicio' ||
                campo === 'exoneracion_libros_hasta'
            ) {
                if (valor === '') {
                    campos[campo] = null;
                } else if (!esFechaValida(valor)) {
                    return res.status(400).json({
                        success: false,
                        mensaje:
                            `El campo ${campo} debe ser una fecha válida (YYYY-MM-DD)`
                    });
                } else {
                    campos[campo] = valor;
                }

                continue;
            }

            campos[campo] =
                valor === ''
                    ? null
                    : valor;
        }

        // ========================================
        // ACTUALIZAR
        // ========================================
        await empresaModel.obtenerEmpresa();
        const empresa =
            await empresaModel.actualizarEmpresa(
                campos
            );
        if (Object.keys(campos).length) {
            try {
                await historialModel.crear({ id_usuario: req.usuario.id_usuario, tipo_operacion: 'ACTUALIZAR', modulo: 'empresa',
                    descripcion: `Configuración de empresa actualizada: ${Object.keys(campos).join(', ')}` });
            } catch (errorHistorial) { console.error('No se pudo registrar el historial:', errorHistorial.message); }
        }

        return res.json({
            success: true,
            empresa
        });

    } catch (error) {
        console.error(
            'Error al actualizar empresa:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al actualizar la empresa'
        });
    }
};

// ========================================
// EXPORTAR CONTROLADORES
// ========================================
module.exports = {
    obtenerEmpresa,
    actualizarEmpresa
};
