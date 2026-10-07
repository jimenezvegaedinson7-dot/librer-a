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

// ============================================================
// FLUJO POR TIPO DE ENTREGA
// ------------------------------------------------------------
// Como en las tiendas online (Shopify, Mercado Libre, Rappi): el
// recojo y el delivery comparten la preparación, pero se separan al
// final. Cada paso tiene su propio botón, texto y confirmación:
//
//   RECOJO   Pago recibido → Preparando → Listo para recoger → Recogido
//   DELIVERY Pago recibido → Preparando → En camino → Entregado
//
// "listo_recojo" y "en_camino" avisan al cliente por correo y en la
// app; por eso se confirman antes de enviarse.
// ============================================================
export const FLUJO = {
    tienda: {
        pasos: ['pendiente', 'preparando', 'listo_recojo', 'entregado'],
        etiquetas: {
            pendiente: 'Pago recibido',
            preparando: 'Preparando',
            listo_recojo: 'Listo para recoger',
            entregado: 'Recogido',
            cancelado: 'Cancelado',
        },
        acciones: {
            pendiente: { destino: 'preparando', texto: 'Empezar preparación' },
            preparando: {
                destino: 'listo_recojo',
                texto: 'Listo para recoger',
                confirmar: {
                    titulo: 'Avisar que está listo',
                    mensaje: (p) => `¿Los libros del pedido #${p.id_venta} ya están separados en tienda? Avisaremos al cliente que puede pasar a recogerlos.`,
                    boton: 'Sí, avisar al cliente',
                },
            },
            listo_recojo: {
                destino: 'entregado',
                texto: 'Entregar al cliente',
                confirmar: {
                    titulo: 'Entregar en tienda',
                    mensaje: (p) => `Antes de entregar, verifica el DNI de ${nombreTitular(p)} o el número de pedido #${p.id_venta}. ¿El cliente recibió sus libros? No se cobrará de nuevo.`,
                    boton: 'Sí, el cliente lo recogió',
                },
            },
        },
        cancelar: {
            listo_recojo: { texto: 'No lo recogió', mensaje: 'El pedido ya estaba separado en tienda. Cancélalo solo si el cliente no pasó a recogerlo en el plazo acordado; los libros vuelven a estar disponibles.' },
        },
    },
    domicilio: {
        pasos: ['pendiente', 'preparando', 'en_camino', 'entregado'],
        etiquetas: {
            pendiente: 'Pago recibido',
            preparando: 'Preparando',
            en_camino: 'En camino',
            entregado: 'Entregado',
            cancelado: 'Cancelado',
        },
        acciones: {
            pendiente: { destino: 'preparando', texto: 'Empezar preparación' },
            preparando: {
                destino: 'en_camino',
                texto: 'Despachar pedido',
                confirmar: {
                    titulo: 'Despachar delivery',
                    mensaje: (p) => `¿El pedido #${p.id_venta} salió hacia ${p.direccion || 'la dirección del cliente'}? Avisaremos al cliente que va en camino.`,
                    boton: 'Sí, despachar',
                },
            },
            en_camino: {
                destino: 'entregado',
                texto: 'Confirmar entrega',
                confirmar: {
                    titulo: 'Confirmar entrega a domicilio',
                    mensaje: (p) => `¿${nombreTitular(p)} recibió el pedido #${p.id_venta} en su dirección? Registraremos la entrega y actualizaremos su compra. No se cobrará de nuevo.`,
                    boton: 'Sí, fue entregado',
                },
            },
        },
        cancelar: {
            en_camino: { texto: 'No se pudo entregar', mensaje: 'El pedido ya salió con el repartidor. Cancélalo solo si no se pudo entregar y regresó a la tienda.' },
        },
    },
};

const CANCELAR_BASE = {
    texto: 'Cancelar pedido',
    mensaje: 'La preparación se detiene y el cliente verá el pedido como cancelado.',
};

function nombreTitular(p) {
    return [p?.nombre_usuario, p?.apellido_usuario].filter(Boolean).join(' ').trim() || 'el cliente';
}

// Acción principal del paso actual: { destino, texto, confirmar? } o null.
export function accionSiguiente(tipoEntrega, estadoActual) {
    return FLUJO[tipoEntrega]?.acciones[estadoActual] ?? null;
}

// Texto y advertencia del botón de cancelar en ese paso.
export function accionCancelar(tipoEntrega, estadoActual) {
    return { ...CANCELAR_BASE, ...(FLUJO[tipoEntrega]?.cancelar?.[estadoActual] || {}) };
}

// Etiqueta del estado según el tipo ("Recogido" en tienda, "Entregado" en delivery).
export function etiquetaEstado(tipoEntrega, estado) {
    return FLUJO[tipoEntrega]?.etiquetas[estado] || ETIQUETA_ESTADO[estado] || estado;
}

// Etiqueta del pedido completo: mientras el pago no se confirma, la entrega
// aún no empieza y se dice así (no "Pago recibido").
export function etiquetaEntregaPedido(p) {
    const estado = p?.estado_entrega || 'pendiente';
    if (estado === 'pendiente' && p?.estado === 'pendiente') return 'Esperando pago';
    return etiquetaEstado(p?.tipo_entrega, estado);
}

const SIGUIENTE = Object.fromEntries(
    Object.entries(FLUJO).map(([tipo, flujo]) => [
        tipo,
        Object.fromEntries(Object.entries(flujo.acciones).map(([estado, accion]) => [estado, accion.destino])),
    ]),
);

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
