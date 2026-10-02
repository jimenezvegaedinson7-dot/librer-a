import { Badge } from '../../components/ui/Badge';

import { configEstadoPago, configEstadoVenta } from './pagoPresentacion';
import { descripcionEntrega } from '../../lib/utils/entrega';

export function EstadoVentaBadge({ estado }) {
    const dato = configEstadoVenta(estado);
    return <Badge color={dato.color}>{dato.texto}</Badge>;
}

export function EstadoPagoBadge({ estado }) {
    const dato = configEstadoPago(estado);
    return <Badge color={dato.color}>{dato.texto}</Badge>;
}

export function EntregaBadge({ tipo, venta }) {
    switch (tipo) {
        case 'domicilio':
            return <Badge color="primary">{descripcionEntrega(venta || { tipo_entrega: tipo })}</Badge>;
        case 'agencia':
            // Ventas antiguas: el envío por agencia ya no se ofrece.
            return <Badge color="neutral">Agencia (histórico)</Badge>;
        case 'tienda':
            return <Badge color="neutral">{descripcionEntrega(venta || { tipo_entrega: tipo })}</Badge>;
        default:
            return <Badge color="neutral">Sin especificar</Badge>;
    }
}
