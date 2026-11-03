const MINIMO_POR_DEFECTO = 5;

export function nivelStock(stock, stockMinimo) {
    const cantidad = Number(stock) || 0;
    if (cantidad <= 0) return 'sin-stock';
    if (stockMinimo === undefined) return 'sin-dato';
    const minimo = stockMinimo === null || !Number.isFinite(Number(stockMinimo)) ? MINIMO_POR_DEFECTO : Number(stockMinimo);
    return cantidad <= minimo ? 'bajo' : 'disponible';
}
