// ========================================
// TRIBUTOS DE UN COMPROBANTE (IGV)
// ========================================
// Los precios de venta ya incluyen el IGV cuando corresponde. Aquí solo se
// separa el importe total en:
//
//   op_gravada   → base imponible (sin IGV) de lo que paga IGV
//   op_exonerada → importe exonerado del IGV
//   igv          → impuesto incluido en lo gravado
//
// Reglas (Perú):
//   - Si la empresa no está afecta al IGV (aplica_igv = 0), no se discrimina
//     IGV: todo el importe se informa como no gravado (op_exonerada).
//   - Libros: exonerados del IGV mientras rija la Ley 31053 y su prórroga
//     (fecha en empresa.exoneracion_libros_hasta). Después, gravados.
//   - Envío a domicilio: es un servicio, siempre gravado si la empresa está
//     afecta al IGV.
//
// Siempre se cumple: op_gravada + op_exonerada + igv === total.
// ========================================

const TASA_IGV_POR_DEFECTO = 18;

const redondear = (valor) =>
    Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

// "YYYY-MM-DD" de un DATE de PostgreSQL (Date a medianoche local o texto).
const fechaIso = (valor) => {
    if (!valor) {
        return null;
    }
    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) {
            return null;
        }
        const mes = String(valor.getMonth() + 1).padStart(2, '0');
        const dia = String(valor.getDate()).padStart(2, '0');
        return `${valor.getFullYear()}-${mes}-${dia}`;
    }
    const texto = String(valor).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
};

// Fecha de hoy en Perú (UTC-5), "YYYY-MM-DD".
const hoyEnPeru = (ahora = new Date()) => {
    const peru = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
    return peru.toISOString().slice(0, 10);
};

// ¿Los libros siguen exonerados del IGV en `fecha`?
const librosExonerados = (empresa, ahora = new Date()) => {
    if (Number(empresa?.libros_exonerados ?? 1) !== 1) {
        return false;
    }
    const hasta = fechaIso(empresa?.exoneracion_libros_hasta);
    if (!hasta) {
        return true;
    }
    return hoyEnPeru(ahora) <= hasta;
};

const calcularTributos = ({
    subtotalLibros,
    costoEnvio,
    empresa,
    ahora = new Date()
}) => {
    const libros = redondear(subtotalLibros || 0);
    const envio = redondear(costoEnvio || 0);
    const total = redondear(libros + envio);

    if (Number(empresa?.aplica_igv) !== 1) {
        return {
            op_gravada: 0,
            op_exonerada: total,
            igv: 0,
            total,
            libros_exonerados: true
        };
    }

    const tasa = Number(empresa?.tasa_igv ?? TASA_IGV_POR_DEFECTO) / 100;
    const exonerados = librosExonerados(empresa, ahora);

    const gravadoConIgv = redondear(envio + (exonerados ? 0 : libros));
    const opExonerada = exonerados ? libros : 0;
    const opGravada = redondear(gravadoConIgv / (1 + tasa));
    // El IGV es la diferencia exacta: así la suma siempre cuadra.
    const igv = redondear(gravadoConIgv - opGravada);

    return {
        op_gravada: opGravada,
        op_exonerada: opExonerada,
        igv,
        total,
        libros_exonerados: exonerados
    };
};

module.exports = {
    TASA_IGV_POR_DEFECTO,
    calcularTributos,
    librosExonerados,
    fechaIso,
    hoyEnPeru,
    redondear
};
