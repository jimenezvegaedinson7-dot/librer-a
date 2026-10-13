import { normalizarEstadoEntrega, esTipoEntregaValido, pagoEnRevision, pagoConfirmadoPedido, PASOS_ENTREGA } from '../../lib/utils/estadoEntrega.js';
export { normalizarEstadoEntrega, esTipoEntregaValido, pagoEnRevision, pagoConfirmadoPedido, esPedidoEcommerce, estadoContabilizable, resumirPedidos } from '../../lib/utils/estadoEntrega.js';

const ENTREGAS = {
    pendiente: ['listo_recojo', 'en_camino', 'cancelado'],
    preparando: ['listo_recojo', 'en_camino', 'cancelado'], // Solo lectura legacy.
    listo_recojo: ['entregado', 'cancelado'], en_camino: ['entregado', 'cancelado'], entregado: [], cancelado: [],
};
export const ETIQUETA_ESTADO = { pendiente: 'Por preparar', preparando: 'Por preparar', listo_recojo: 'Listo para recoger', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' };
export const COLOR_ESTADO = { pendiente: 'warning', preparando: 'warning', listo_recojo: 'info', en_camino: 'primary', entregado: 'success', cancelado: 'danger' };
export const ETIQUETA_COMERCIAL = { pendiente: 'Pendiente de pago', pagada: 'Pagada', entregada: 'Pagada', cancelada: 'Cancelada', reembolsada: 'Reembolsada' };
export const COLOR_COMERCIAL = { pendiente: 'warning', pagada: 'success', entregada: 'success', cancelada: 'danger', reembolsada: 'neutral' };
export const ETIQUETA_TIPO_ENTREGA = { domicilio: 'Delivery', tienda: 'Recojo en tienda', agencia: 'Agencia' };
export const ETIQUETA_PAGO = { payu: 'PayU', online: 'PayU', efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia', pos: 'POS', tarjeta: 'Tarjeta' };
const nombreTitular = p => [p?.nombre_usuario, p?.apellido_usuario].filter(Boolean).join(' ').trim() || 'el cliente';
const entregaFinal = {
    destino: 'entregado', texto: 'Confirmar entrega', confirmar: {
        titulo: 'Confirmar entrega',
        mensaje: p => `¿${nombreTitular(p)} recibió sus libros${p.tipo_entrega === 'tienda' ? ' en tienda' : ' en su dirección'}? Este es el último paso de la entrega y no vuelve a cobrar la compra.`,
        boton: 'Sí, confirmar entrega',
    },
};
export const FLUJO = {
    tienda: {
        pasos: PASOS_ENTREGA.tienda.map(([clave]) => clave),
        etiquetas: Object.fromEntries(PASOS_ENTREGA.tienda),
        acciones: {
            pendiente: { destino: 'listo_recojo', texto: 'Listo para recoger', confirmar: {
                titulo: 'Confirmar pedido listo', mensaje: p => `¿Los libros del pedido #${p.id_venta} están preparados y disponibles en tienda? Avisaremos al cliente que puede recogerlos.`, boton: 'Sí, avisar al cliente',
            } },
            listo_recojo: entregaFinal,
        },
        cancelar: { listo_recojo: { texto: 'No lo recogió', mensaje: 'Cancela solo si el cliente no recogerá el pedido.' } },
    },
    domicilio: {
        pasos: PASOS_ENTREGA.domicilio.map(([clave]) => clave),
        etiquetas: Object.fromEntries(PASOS_ENTREGA.domicilio),
        acciones: {
            pendiente: { destino: 'en_camino', texto: 'Despachar pedido', confirmar: {
                titulo: 'Confirmar salida del repartidor', mensaje: p => `¿El pedido #${p.id_venta} fue entregado al repartidor y ya salió hacia ${p.direccion || 'la dirección del cliente'}? Solo confirma cuando esté realmente en ruta.`, boton: 'Sí, salió el repartidor',
            } },
            en_camino: entregaFinal,
        },
        cancelar: { en_camino: { texto: 'No se pudo entregar', mensaje: 'La entrega se detendrá; el reingreso de libros requiere verificar su devolución física.' } },
    },
};
export const accionSiguiente = (tipo, estado) => FLUJO[tipo]?.acciones[normalizarEstadoEntrega(estado)] ?? null;
export function accionCancelar(tipo, estado, estadoVenta = 'pagada', revision = false) {
    const accion = { texto: 'Cancelar pedido', mensaje: 'La entrega se detiene.', ...FLUJO[tipo]?.cancelar?.[normalizarEstadoEntrega(estado)] };
    const efecto = estadoVenta === 'pendiente' && !revision
        ? 'La compra pendiente se cancelará, su enlace de pago se cerrará y las existencias se liberarán. Si PayU informa después un cobro, quedará pendiente de revisión.'
        : 'Esta acción detiene la entrega; no devuelve dinero ni libera existencias. Gestiona la devolución y el reingreso de los libros desde Ventas.';
    return { ...accion, mensaje: `${accion.mensaje} ${efecto}` };
}
export function etiquetaPagoPedido(p) {
    if (pagoEnRevision(p)) return 'Pago en revisión';
    if (pagoConfirmadoPedido(p)) return 'Confirmado · PayU';
    if (['pagada', 'entregada'].includes(p?.estado)) return 'Pago por verificar';
    return ETIQUETA_COMERCIAL[p?.estado] || 'Pago no disponible';
}
export const etiquetaEstado = (tipo, estado) => FLUJO[tipo]?.etiquetas[normalizarEstadoEntrega(estado)] || ETIQUETA_ESTADO[estado] || 'Estado no disponible';
export function etiquetaEntregaPedido(p) {
    const estado = normalizarEstadoEntrega(p?.estado_entrega);
    if (estado === 'cancelado' || p?.estado === 'cancelada') return 'Pedido cancelado';
    if (pagoEnRevision(p) && !esFinal(estado)) return 'Entrega detenida por revisión de pago';
    if (p?.estado_reembolso === 'pendiente_verificacion' && !esFinal(estado)) return 'Entrega detenida por devolución';
    if (!esTipoEntregaValido(p?.tipo_entrega)) return 'Tipo de entrega no disponible';
    if (estado === 'listo_recojo' && p.tipo_entrega !== 'tienda' || estado === 'en_camino' && p.tipo_entrega !== 'domicilio') return 'Estado incompatible con la entrega';
    if (estado === 'pendiente' && p?.estado === 'pendiente') return 'Esperando pago';
    return etiquetaEstado(p.tipo_entrega, estado);
}
export const TIPOS_ENTREGA = Object.keys(FLUJO);
export const siguienteEstado = (tipo, estado) => accionSiguiente(tipo, estado)?.destino ?? null;
export const puedeCancelar = estado => (ENTREGAS[normalizarEstadoEntrega(estado)] || []).includes('cancelado');
export const esFinal = estado => ['entregado', 'cancelado'].includes(normalizarEstadoEntrega(estado));
export { ENTREGAS };
