// ============================================================
// ESTADOS LOGÍSTICOS DEL PEDIDO
// ============================================================
// Réplica de la máquina de estados que valida el backend en
// backend/src/utils/transiciones.js (constante ENTREGA). Si se
// cambia allí, hay que cambiarlo aquí: esta copia solo decide qué
// botón se muestra, nunca autoriza la transición (el backend la
// vuelve a validar).
//
//   RECOJO EN TIENDA
//     pendiente → preparando → listo_recojo → entregado
//
//   DELIVERY
//     pendiente → preparando → en_camino → entregado
//
//   Ninguna transición vuelve a cobrar ni crea otra venta.
// ============================================================

const ENTREGAS = {
    pendiente: ['preparando', 'listo_recojo', 'en_camino', 'cancelado'],
    preparando: ['listo_recojo', 'en_camino', 'cancelado'],
    listo_recojo: ['entregado', 'cancelado'],
    en_camino: ['entregado', 'cancelado'],
    entregado: [],
    cancelado: [],
};

export const ETIQUETA_ESTADO = {
    pendiente: 'Pendiente',
    preparando: 'Preparando',
    listo_recojo: 'Listo para recojo',
    en_camino: 'En camino',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
};

export const COLOR_ESTADO = {
    pendiente: 'neutral',
    preparando: 'warning',
    listo_recojo: 'info',
    en_camino: 'primary',
    entregado: 'success',
    cancelado: 'danger',
};

export const ETIQUETA_COMERCIAL = {
    pendiente: 'Pendiente de pago',
    pagada: 'Pagada',
    entregada: 'Entregada',
    cancelada: 'Cancelada',
    reembolsada: 'Reembolsada',
};

export const COLOR_COMERCIAL = {
    pendiente: 'warning',
    pagada: 'success',
    entregada: 'primary',
    cancelada: 'danger',
    reembolsada: 'danger',
};

// Solo dos tipos son válidos: domicilio y tienda. 'agencia' aparece aquí
// únicamente para poder etiquetar ventas legacy que aún la guardan; esas
// filas se marcan como inválidas y no se pueden hacer avanzar.
export const ETIQUETA_TIPO_ENTREGA = {
    domicilio: 'Delivery',
    tienda: 'Recojo en tienda',
    agencia: 'Agencia',
};

export const ETIQUETA_PAGO = {
    payu: 'PayU',
    online: 'PayU',
    efectivo: 'Efectivo',
    yape: 'Yape',
    plin: 'Plin',
    transferencia: 'Transferencia',
    pos: 'POS',
    tarjeta: 'Tarjeta',
};

// Siguiente paso esperado del flujo, para el botón principal.
// El botón "Cancelar" se ofrece aparte cuando la máquina lo permite.
const SIGUIENTE = {
    domicilio: {
        pendiente: 'en_camino',
        preparando: 'en_camino',
        en_camino: 'entregado',
    },
    tienda: {
        pendiente: 'listo_recojo',
        preparando: 'listo_recojo',
        listo_recojo: 'entregado',
    },
};

// Réplica de ESTADO_POR_TIPO en backend/src/utils/transiciones.js.
export const TIPOS_ENTREGA = Object.keys(SIGUIENTE);

// Un pedido sin tipo reconocible no tiene ruta: el backend tampoco la
// adivina y responde 409. Se marca aquí para explicarlo en pantalla en
// lugar de dejar la fila sin ningún botón y sin explicación.
export function esTipoEntregaValido(tipoEntrega) {
    return Object.prototype.hasOwnProperty.call(SIGUIENTE, tipoEntrega);
}

export function siguienteEstado(tipoEntrega, estadoActual) {
    return SIGUIENTE[tipoEntrega]?.[estadoActual] ?? null;
}

export function puedeCancelar(estadoActual) {
    return (ENTREGAS[estadoActual] || []).includes('cancelado');
}

export function esFinal(estadoActual) {
    return (ENTREGAS[estadoActual] || []).length === 0;
}

export { ENTREGAS };
