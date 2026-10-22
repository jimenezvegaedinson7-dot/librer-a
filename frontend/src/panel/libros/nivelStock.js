// Mínimo por defecto si el libro aún no tiene registro de inventario
// (el backend crea el registro con este mismo mínimo).
const MINIMO_POR_DEFECTO = 5;

// Nivel de stock con el mismo criterio que Inventario: bajo cuando el stock
// es igual o menor al mínimo configurado para ese libro.
//   stockMinimo === null      → sin registro de inventario: mínimo por defecto.
//   stockMinimo === undefined → no se pudo consultar Inventario: 'sin-dato'
//                               (no se afirma si el stock es bajo o no).
export function nivelStock(stock, stockMinimo) {
    const cantidad = Number(stock) || 0;
    if (cantidad <= 0) return 'sin-stock';
    if (stockMinimo === undefined) return 'sin-dato';
    const minimo = stockMinimo === null || !Number.isFinite(Number(stockMinimo))
        ? MINIMO_POR_DEFECTO
        : Number(stockMinimo);
    return cantidad <= minimo ? 'bajo' : 'disponible';
}
