// ========================================
// TRANSICIONES DE ESTADO UNIFICADAS
// (ventas, reservas y estado de entrega)
// ========================================
// Fuente única de verdad para las máquinas de estado. Los models
// y controllers usan estos mapas + helpers en lugar de duplicar
// tablas internas (FASE 5 — eliminar duplicación).
//
// Nota: una venta/reserva "entregada"/"completada" NO puede pasar
// a "cancelada": el bien ya salió de la tienda / la reserva ya se
// consumió. Una venta pagada o entregada solo se revierte como
// "reembolsada" (devolución del dinero, con su nota de crédito), por
// el flujo dedicado POST /api/ventas/:id/reembolso.
// ========================================

const VENTA = {
    pendiente: [
        'pagada',
        'cancelada'
    ],

    pagada: [
        'entregada',
        'reembolsada'
    ],

    entregada: [
        'reembolsada'
    ],

    cancelada: [],

    reembolsada: []
};

const RESERVA = {
    pendiente: [
        'cancelada'
    ],

    confirmada: [
        'cancelada'
    ],

    completada: [],

    cancelada: []
};

// ========================================
// ENTREGA (estado logístico del pedido en ventas)
// ----------------------------------------
// Flujo de pedidos (delivery / recojo en tienda):
//   pendiente → preparando → listo_recojo (recojo en tienda)
//                          → en_camino (delivery)
//   listo_recojo / en_camino → entregado
// Cualquiera puede cancelarse solo si el producto aún no salió
// entregado. Una vez "entregado" o "cancelado", es estado final
// (coincide con el CHECK de la migración 026).
// ========================================
const ENTREGA = {
    pendiente: [
        'preparando',
        'listo_recojo',
        'en_camino',
        'cancelado'
    ],

    preparando: [
        'listo_recojo',
        'en_camino',
        'cancelado'
    ],

    listo_recojo: [
        'entregado',
        'cancelado'
    ],

    en_camino: [
        'entregado',
        'cancelado'
    ],

    entregado: [],

    cancelado: []
};

// ========================================
// ¿SE PERMITE PASAR DE `actual` A `nuevo`?
// ========================================
const permitirTransicion = (mapa, actual, nuevo) => {
    if (!mapa || !Object.prototype.hasOwnProperty.call(mapa, actual)) {
        return false;
    }

    return (
        Array.isArray(mapa[actual]) &&
        mapa[actual].includes(nuevo)
    );
};

// ========================================
// ESTADOS VÁLIDOS DE UN MAPA
// ========================================
const estadosValidos = (mapa) => {
    return Object.keys(mapa || {});
};

// ========================================
// ESTADOS VÁLIDOS POR TIPO DE ENTREGA
// ----------------------------------------
// "listo_recojo" solo existe para el recojo en tienda y "en_camino" solo
// para el delivery. Sin esta separación la máquina acepta estados que el
// panel no sabe avanzar: un pedido a domicilio marcado como "listo_recojo"
// se queda sin botón de siguiente paso.
//
// Un tipo que no sea uno de los dos se rechaza en vez de adivinar: el
// pedido queda sin salida y el error lo dice, en vez de aceptar un estado
// que nadie sabe cómo continuar. La creación de pedidos normaliza siempre
// a domicilio o tienda, y la migración 027 lo blinda en la base.
// ========================================
const ESTADO_POR_TIPO = {
    domicilio: [
        'pendiente',
        'preparando',
        'en_camino',
        'entregado',
        'cancelado'
    ],

    tienda: [
        'pendiente',
        'preparando',
        'listo_recojo',
        'entregado',
        'cancelado'
    ]
};

const TIPOS_ENTREGA = Object.keys(ESTADO_POR_TIPO);

// Todo cobro manual es histórico, tenga o no vínculo a una reserva.
const esVentaHistorica = (venta) => venta?.origen === 'panel' ||
    venta?.origen === 'reserva';

// El typeof no es redundante: hasOwnProperty convierte la clave a string,
// así que sin él un array como ['domicilio'] pasaba por válido.
const esTipoEntregaValido = (tipoEntrega) =>
    typeof tipoEntrega === 'string' &&
    Object.prototype.hasOwnProperty.call(
        ESTADO_POR_TIPO,
        tipoEntrega
    );

// ========================================
// ¿SE PERMITE PASAR DE `actual` A `nuevo` PARA ESE TIPO DE ENTREGA?
// Combina la máquina general con el estado destino que admite el tipo.
// ========================================
const permitirTransicionEntrega = (tipoEntrega, actual, nuevo) => {
    if (!permitirTransicion(ENTREGA, actual, nuevo)) {
        return false;
    }

    // Tipo ausente o desconocido: no se inventa una ruta.
    if (!esTipoEntregaValido(tipoEntrega)) {
        return false;
    }

    return ESTADO_POR_TIPO[tipoEntrega].includes(nuevo);
};

module.exports = {
    VENTA,
    RESERVA,
    ENTREGA,
    ESTADO_POR_TIPO,
    TIPOS_ENTREGA,
    esTipoEntregaValido,
    permitirTransicion,
    permitirTransicionEntrega,
    estadosValidos,
    esVentaHistorica
};
