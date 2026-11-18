import { Badge } from '../ui/Badge';
import { configEstadoPago } from '../../../services/panel/pagos/pagoPresentacion';
import { descripcionEntrega } from '../../../services/compartido/utils/entrega';

export function EstadoPagoBadge({ estado }) {
    const dato = configEstadoPago(estado);
    return <Badge color={dato.color}>{dato.texto}</Badge>;
}

export function EntregaBadge({ tipo, venta }) {
    switch (tipo) {
        case 'domicilio':
            return <Badge color="primary">{descripcionEntrega(venta || { tipo_entrega: tipo })}</Badge>;
        case 'agencia':
            return <Badge color="neutral">Agencia (histórico)</Badge>;
        case 'tienda':
            return <Badge color="neutral">{descripcionEntrega(venta || { tipo_entrega: tipo })}</Badge>;
        default:
            return <Badge color="neutral">Sin especificar</Badge>;
    }
}
