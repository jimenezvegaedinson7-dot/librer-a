// ========================================
// VALIDACIÓN DE DESCUENTOS
//
// Va aparte de libro.controller.js porque las reglas son las mismas al
// crear y al editar, y duplicarlas en los dos caminos es como un descuento
// acaba aceptando 150% en uno de los dos.
//
// Acepta tres formas por campo:
//   undefined -> el cliente no lo mandó, no se toca
//   '' o null -> se limpia a NULL (quitar la promoción)
//   valor     -> se valida y se guarda
// ========================================

const MAXIMO_PORCENTAJE = 99;
const MAXIMO_PRECIO = 99999999.99;

const FORMATO_FECHA =
    /^\d{4}-\d{2}-\d{2}$/;

// Hoy en Lima como AAAA-MM-DD. El servidor puede estar en UTC: a las 8 p. m.
// de Lima en UTC ya es el día siguiente, y una promoción "hasta hoy" se
// rechazaría o vencería cinco horas antes.
const hoyEnLima = (ahora = new Date()) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(ahora);

// ========================================
// PORCENTAJE
// 1 a 99. El 100% queda fuera a propósito: un libro gratis no se
// "descuenta", y un 0% no es un descuento sino ruido en la ficha.
// ========================================
const parsePorcentaje = (valor) => {
    if (valor === undefined) {
        return { valor: undefined };
    }

    if (
        valor === null ||
        valor === ''
    ) {
        return { valor: null };
    }

    const numero = Number(valor);

    if (
        !Number.isInteger(numero) ||
        numero < 1 ||
        numero > MAXIMO_PORCENTAJE
    ) {
        return {
            error: `El descuento debe ser un número entero entre 1 y ${MAXIMO_PORCENTAJE}`
        };
    }

    return { valor: numero };
};

// ========================================
// PRECIO DE OFERTA
// No puede ser negativo ni superar el precio de lista: una "oferta" más
// cara que el precio normal no es una oferta, es un error de captura que
// además mostraría un precio final mayor al original.
// ========================================
const parsePrecioOferta = (
    valor,
    precioLista
) => {
    if (valor === undefined) {
        return { valor: undefined };
    }

    if (
        valor === null ||
        valor === ''
    ) {
        return { valor: null };
    }

    const numero = Number(valor);

    // Mayor que 0: una oferta de S/ 0.00 regala el libro, y eso no es una
    // promoción sino un error de captura.
    if (
        !Number.isFinite(numero) ||
        numero <= 0 ||
        numero > MAXIMO_PRECIO
    ) {
        return {
            error: 'El precio de oferta debe ser un número mayor que 0'
        };
    }

    // Menor (no igual) que el precio de lista: una oferta al mismo precio
    // no rebaja nada y la web la anunciaría como descuento.
    if (
        precioLista !== null &&
        precioLista !== undefined &&
        numero >= Number(precioLista)
    ) {
        return {
            error: 'El precio de oferta debe ser menor que el precio normal'
        };
    }

    return { valor: numero };
};

// ========================================
// FECHA DE VENCIMIENTO
// Se valida el formato Y que la fecha exista: '2026-02-31' pasa un
// /^\d{4}-\d{2}-\d{2}$/ pero no es un día real, y Postgres lo recortaría
// a '2026-02-28' en silencio, dejando una promoción que dura un día menos
// de lo que el admin cree.
// ========================================
const parseFecha = (valor) => {
    if (valor === undefined) {
        return { valor: undefined };
    }

    if (
        valor === null ||
        valor === ''
    ) {
        return { valor: null };
    }

    const texto = String(valor).trim();

    if (!FORMATO_FECHA.test(texto)) {
        return {
            error: 'La fecha de fin del descuento debe tener el formato AAAA-MM-DD'
        };
    }

    const [anio, mes, dia] =
        texto.split('-').map(Number);

    const fecha = new Date(
        Date.UTC(anio, mes - 1, dia)
    );

    const esReal =
        fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia;

    if (!esReal) {
        return {
            error: 'La fecha de fin del descuento no es una fecha válida'
        };
    }

    return { valor: texto };
};

// ========================================
// VALIDAR EL CONJUNTO
//
// Devuelve { valor, mensaje }. `valor` lleva las claves que sí se deben
// guardar; las que no llegaron no aparecen, que es justo lo que necesita
// el UPDATE para no pisar lo que no se tocó.
//
// Si el cliente limpia el porcentaje y la oferta, la fecha se limpia
// también: dejarla puesta significaría un vencimiento huérfano que nadie
// puede ver ni quitar desde el formulario.
// ========================================
const validarDescuentos = (
    body,
    precioLista,
    guardado = null,
    hoy = hoyEnLima()
) => {
    const porcentaje = parsePorcentaje(
        body.descuento_porcentaje
    );

    if (porcentaje.error) {
        return { mensaje: porcentaje.error };
    }

    const oferta = parsePrecioOferta(
        body.precio_oferta,
        precioLista
    );

    if (oferta.error) {
        return { mensaje: oferta.error };
    }

    const fecha = parseFecha(
        body.descuento_hasta
    );

    if (fecha.error) {
        return { mensaje: fecha.error };
    }

    const valor = {};

    if (porcentaje.valor !== undefined) {
        valor.descuento_porcentaje =
            porcentaje.valor;
    }

    if (oferta.valor !== undefined) {
        valor.precio_oferta = oferta.valor;
    }

    if (fecha.valor !== undefined) {
        valor.descuento_hasta = fecha.valor;
    }

    // Quitar la promoción (porcentaje y oferta vacíos) limpia también la
    // fecha: dejarla sería un vencimiento huérfano que nadie ve ni puede
    // quitar desde el formulario.
    if (
        valor.descuento_porcentaje === null &&
        valor.precio_oferta === null
    ) {
        valor.descuento_hasta = null;
        return { valor };
    }

    // Lo que quedará guardado tras este cambio: lo enviado o, si no se
    // envió, lo que ya había (en una edición).
    const queda = (clave) =>
        valor[clave] !== undefined
            ? valor[clave]
            : (guardado?.[clave] ?? null);

    const porcentajeFinal = queda('descuento_porcentaje');
    const ofertaFinal = queda('precio_oferta');
    const fechaFinal = queda('descuento_hasta');

    // Porcentaje o precio de oferta, no los dos: con los dos a la vez el
    // administrador no sabe cuál cobra la tienda.
    if (porcentajeFinal !== null && ofertaFinal !== null) {
        return {
            mensaje: 'Usa porcentaje o precio de oferta, no los dos a la vez'
        };
    }

    // Una fecha sola no es una promoción.
    if (
        fechaFinal !== null &&
        porcentajeFinal === null &&
        ofertaFinal === null
    ) {
        if (valor.descuento_hasta) {
            return {
                mensaje: 'Indica el porcentaje o el precio de oferta antes de poner la fecha de fin'
            };
        }
        // Venía de antes sin descuento: se limpia.
        valor.descuento_hasta = null;
    }

    // Una fecha nueva no puede estar ya vencida. Si es la misma que estaba
    // guardada se acepta, para poder editar otros datos del libro sin que
    // una promoción ya terminada bloquee el guardado.
    if (
        valor.descuento_hasta &&
        valor.descuento_hasta < hoy &&
        valor.descuento_hasta !== guardado?.descuento_hasta
    ) {
        return {
            mensaje: 'La fecha de fin del descuento no puede ser anterior a hoy'
        };
    }

    return { valor };
};

module.exports = {
    validarDescuentos,
    parsePorcentaje,
    parsePrecioOferta,
    parseFecha,
    hoyEnLima,
    MAXIMO_PORCENTAJE
};
