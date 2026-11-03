import { Badge } from '../ui/Badge';
import { COLOR_ESTADO, etiquetaEntregaPedido, normalizarEstadoEntrega } from '../pedidos/estadosPedido';

export function EstadoEntregaVenta({ venta }) {
    if (venta.origen === 'panel' || venta.origen === 'reserva' || venta.id_reserva) {
        return <Badge color="neutral">Histórico</Badge>;
    }
    const estado = normalizarEstadoEntrega(venta.estado_entrega);
    return <Badge color={venta.estado === 'cancelada' ? 'danger' : COLOR_ESTADO[estado] || 'neutral'}>{etiquetaEntregaPedido(venta)}</Badge>;
}
