import { Badge } from '../../components/ui/Badge';

import { configEstadoPago, configEstadoVenta } from './pagoPresentacion';

export function EstadoVentaBadge({ estado }) {
    const dato = configEstadoVenta(estado);
    return <Badge color={dato.color}>{dato.texto}</Badge>;
}

export function EstadoPagoBadge({ estado }) {
    const dato = configEstadoPago(estado);
    return <Badge color={dato.color}>{dato.texto}</Badge>;
}

export function EntregaBadge({ tipo }) {
    switch (tipo) {
        case 'domicilio':
            return <Badge color="primary">A domicilio</Badge>;
        case 'agencia':
            // Ventas antiguas: el envío por agencia ya no se ofrece.
            return <Badge color="neutral">Agencia (histórico)</Badge>;
        case 'tienda':
            return <Badge color="neutral">Recoger en tienda</Badge>;
        default:
            return <Badge color="neutral">Sin especificar</Badge>;
    }
}
