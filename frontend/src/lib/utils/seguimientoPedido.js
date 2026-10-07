// ============================================================
// SEGUIMIENTO DEL PEDIDO (lo que ve el cliente)
// ============================================================
// Mismos textos que la app Flutter (lib/utils/seguimiento_pedido.dart)
// y que los avisos por correo del backend: el recojo y el delivery se
// cuentan distinto porque el cliente hace cosas distintas (ir a la
// tienda o esperar en casa). Los pasos replican el flujo del panel en
// features/pedidos/estadosPedido.js.
// ============================================================

const RECIBIDO = {
    titulo: 'Pedido recibido',
    mensaje: 'Confirmamos tu pago. Pronto empezaremos a preparar tus libros.',
};

const FLUJO_CLIENTE = {
    tienda: {
        pasos: [['pendiente', 'Recibido'], ['preparando', 'Preparando'], ['listo_recojo', 'Listo'], ['entregado', 'Recogido']],
        estados: {
            pendiente: RECIBIDO,
            preparando: { titulo: 'Preparando tu pedido', mensaje: 'Estamos separando tus libros en la tienda.' },
            listo_recojo: { titulo: 'Listo para recoger', mensaje: (v) => `Acércate a la tienda con tu número de pedido #${v.id_venta} y tu DNI.` },
            entregado: { titulo: 'Pedido recogido', mensaje: 'Recogiste tu pedido. ¡Gracias por tu compra!' },
        },
    },
    domicilio: {
        pasos: [['pendiente', 'Recibido'], ['preparando', 'Preparando'], ['en_camino', 'En camino'], ['entregado', 'Entregado']],
        estados: {
            pendiente: RECIBIDO,
            preparando: { titulo: 'Preparando tu pedido', mensaje: 'Estamos empaquetando tus libros para enviarlos.' },
            en_camino: { titulo: 'Tu pedido va en camino', mensaje: 'Salió hacia tu dirección. Mantén tu teléfono a mano para coordinar la entrega.' },
            entregado: { titulo: 'Pedido entregado', mensaje: 'Tu pedido llegó a tu dirección. ¡Gracias por tu compra!' },
        },
    },
};

// { titulo, mensaje, pasos: [{ etiqueta, hecho, actual }], tono }
export function seguimientoPedido(v) {
    const flujo = FLUJO_CLIENTE[v?.tipo_entrega];
    const estado = v?.estado_entrega || 'pendiente';
    const pasos = (indice) => (flujo?.pasos || []).map(([clave, etiqueta], i) => ({
        clave, etiqueta, hecho: i <= indice, actual: i === indice,
    }));

    if (v?.estado === 'reembolsada') {
        return { titulo: 'Compra reembolsada', mensaje: 'Devolvimos el dinero de esta compra.', pasos: [], tono: 'cancelado' };
    }
    if (estado === 'cancelado' || v?.estado === 'cancelada') {
        return { titulo: 'Pedido cancelado', mensaje: 'Este pedido no continuará. Si ya pagaste, te contactaremos para la devolución.', pasos: [], tono: 'cancelado' };
    }
    if (v?.estado === 'pendiente') {
        return { titulo: 'Esperando pago', mensaje: 'La preparación empieza cuando se confirme tu pago.', pasos: pasos(-1), tono: 'espera' };
    }
    const info = flujo?.estados[estado];
    if (!info) return { titulo: 'En proceso', mensaje: '', pasos: [], tono: 'proceso' };
    const indice = flujo.pasos.findIndex(([clave]) => clave === estado);
    return {
        titulo: info.titulo,
        mensaje: typeof info.mensaje === 'function' ? info.mensaje(v) : info.mensaje,
        pasos: pasos(indice),
        tono: estado === 'entregado' ? 'listo' : 'proceso',
    };
}
