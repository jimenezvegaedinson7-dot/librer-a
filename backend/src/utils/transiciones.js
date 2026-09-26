// ========================================
// TRANSICIONES DE ESTADO UNIFICADAS
// (ventas y reservas)
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
        'cancelada',
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
        'confirmada',
        'cancelada'
    ],

    confirmada: [
        'completada',
        'cancelada'
    ],

    completada: [],

    cancelada: []
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

module.exports = {
    VENTA,
    RESERVA,
    permitirTransicion,
    estadosValidos
};