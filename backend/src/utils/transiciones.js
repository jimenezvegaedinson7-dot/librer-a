const VENTA = {
    pendiente: ['pagada', 'cancelada'],

    pagada: ['reembolsada'],

    entregada: ['reembolsada'],

    cancelada: [],

    reembolsada: []
};

const ENTREGA = {
    pendiente: ['listo_recojo', 'en_camino', 'cancelado'],

    preparando: ['listo_recojo', 'en_camino', 'cancelado'],

    listo_recojo: ['entregado', 'cancelado'],

    en_camino: ['entregado', 'cancelado'],

    entregado: [],

    cancelado: []
};

const permitirTransicion = (mapa, actual, nuevo) => {
    if (!mapa || !Object.prototype.hasOwnProperty.call(mapa, actual)) {
        return false;
    }

    return Array.isArray(mapa[actual]) && mapa[actual].includes(nuevo);
};

const estadosValidos = (mapa) => {
    return Object.keys(mapa || {});
};

const ESTADO_POR_TIPO = {
    domicilio: ['pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'],

    tienda: ['pendiente', 'preparando', 'listo_recojo', 'entregado', 'cancelado']
};

const TIPOS_ENTREGA = Object.keys(ESTADO_POR_TIPO);
const ESTADOS_ENTREGA_ACTUALES = Object.keys(ENTREGA).filter((estado) => estado !== 'preparando');

const normalizarEstadoEntrega = (estado) => (estado === 'preparando' ? 'pendiente' : ESTADOS_ENTREGA_ACTUALES.includes(estado) ? estado : null);

const esVentaHistorica = (venta) => venta?.origen === 'panel' || venta?.origen === 'reserva' || Boolean(venta?.id_reserva);

const esTipoEntregaValido = (tipoEntrega) => typeof tipoEntrega === 'string' && Object.prototype.hasOwnProperty.call(ESTADO_POR_TIPO, tipoEntrega);

const permitirTransicionEntrega = (tipoEntrega, actual, nuevo) => {
    if (!ESTADOS_ENTREGA_ACTUALES.includes(nuevo) || !permitirTransicion(ENTREGA, normalizarEstadoEntrega(actual), nuevo)) {
        return false;
    }

    if (!esTipoEntregaValido(tipoEntrega)) {
        return false;
    }

    return ESTADO_POR_TIPO[tipoEntrega].includes(nuevo);
};

module.exports = {
    VENTA,
    ENTREGA,
    ESTADO_POR_TIPO,
    TIPOS_ENTREGA,
    ESTADOS_ENTREGA_ACTUALES,
    normalizarEstadoEntrega,
    esTipoEntregaValido,
    permitirTransicion,
    permitirTransicionEntrega,
    estadosValidos,
    esVentaHistorica
};
