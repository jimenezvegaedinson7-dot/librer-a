const MAXIMO_PORCENTAJE = 99;
const MAXIMO_PRECIO = 99999999.99;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const hoyEnLima = (ahora = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);

const parsePorcentaje = (valor) => {
    if (valor === undefined) {
        return { valor: undefined };
    }

    if (valor === null || valor === '') {
        return { valor: null };
    }

    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero < 1 || numero > MAXIMO_PORCENTAJE) {
        return { error: `El descuento debe ser un número entero entre 1 y ${MAXIMO_PORCENTAJE}` };
    }

    return { valor: numero };
};

const parsePrecioOferta = (valor, precioLista) => {
    if (valor === undefined) {
        return { valor: undefined };
    }

    if (valor === null || valor === '') {
        return { valor: null };
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero <= 0 || numero > MAXIMO_PRECIO) {
        return { error: 'El precio de oferta debe ser un número mayor que 0' };
    }

    if (precioLista !== null && precioLista !== undefined && numero >= Number(precioLista)) {
        return { error: 'El precio de oferta debe ser menor que el precio normal' };
    }

    return { valor: numero };
};

const parseFecha = (valor) => {
    if (valor === undefined) {
        return { valor: undefined };
    }

    if (valor === null || valor === '') {
        return { valor: null };
    }

    const texto = String(valor).trim();

    if (!FORMATO_FECHA.test(texto)) {
        return { error: 'La fecha de fin del descuento debe tener el formato AAAA-MM-DD' };
    }

    const [anio, mes, dia] = texto.split('-').map(Number);

    const fecha = new Date(Date.UTC(anio, mes - 1, dia));

    const esReal = fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;

    if (!esReal) {
        return { error: 'La fecha de fin del descuento no es una fecha válida' };
    }

    return { valor: texto };
};

const validarDescuentos = (body, precioLista, guardado = null, hoy = hoyEnLima()) => {
    const porcentaje = parsePorcentaje(body.descuento_porcentaje);

    if (porcentaje.error) {
        return { mensaje: porcentaje.error };
    }

    const oferta = parsePrecioOferta(body.precio_oferta, precioLista);

    if (oferta.error) {
        return { mensaje: oferta.error };
    }

    const fecha = parseFecha(body.descuento_hasta);

    if (fecha.error) {
        return { mensaje: fecha.error };
    }

    const valor = {};

    if (porcentaje.valor !== undefined) {
        valor.descuento_porcentaje = porcentaje.valor;
    }

    if (oferta.valor !== undefined) {
        valor.precio_oferta = oferta.valor;
    }

    if (fecha.valor !== undefined) {
        valor.descuento_hasta = fecha.valor;
    }

    if (valor.descuento_porcentaje === null && valor.precio_oferta === null) {
        valor.descuento_hasta = null;
        return { valor };
    }

    const queda = (clave) => (valor[clave] !== undefined ? valor[clave] : (guardado?.[clave] ?? null));

    const porcentajeFinal = queda('descuento_porcentaje');
    const ofertaFinal = queda('precio_oferta');
    const fechaFinal = queda('descuento_hasta');

    if (porcentajeFinal !== null && ofertaFinal !== null) {
        return { mensaje: 'Usa porcentaje o precio de oferta, no los dos a la vez' };
    }

    if (fechaFinal !== null && porcentajeFinal === null && ofertaFinal === null) {
        if (valor.descuento_hasta) {
            return { mensaje: 'Indica el porcentaje o el precio de oferta antes de poner la fecha de fin' };
        }

        valor.descuento_hasta = null;
    }

    if (valor.descuento_hasta && valor.descuento_hasta < hoy && valor.descuento_hasta !== guardado?.descuento_hasta) {
        return { mensaje: 'La fecha de fin del descuento no puede ser anterior a hoy' };
    }

    return { valor };
};

module.exports = { validarDescuentos, parsePorcentaje, parsePrecioOferta, parseFecha, hoyEnLima, MAXIMO_PORCENTAJE };
