import { Badge } from '../../components/ui/Badge';

export function StockBadge({ stock }) {
    const cantidad = Number(stock);
    if (cantidad <= 0) return <Badge color="danger">Sin stock</Badge>;
    if (cantidad <= 5) return <Badge color="warning">Bajo: {cantidad}</Badge>;
    return <Badge color="success">{cantidad} disponibles</Badge>;
}
