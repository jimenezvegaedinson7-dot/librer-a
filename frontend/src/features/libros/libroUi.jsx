import { Badge } from '../../components/ui/Badge';

import { nivelStock } from './nivelStock';

export function StockBadge({ stock, stockMinimo }) {
    const cantidad = Number(stock) || 0;
    const nivel = nivelStock(stock, stockMinimo);
    if (nivel === 'sin-stock') return <Badge color="danger">Sin stock</Badge>;
    if (nivel === 'bajo') return <Badge color="warning">Bajo: {cantidad}</Badge>;
    if (nivel === 'sin-dato') return <Badge color="neutral">{cantidad} en stock</Badge>;
    return <Badge color="success">{cantidad} disponibles</Badge>;
}
