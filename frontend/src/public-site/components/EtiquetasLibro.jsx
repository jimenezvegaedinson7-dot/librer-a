// ============================================================
// ETIQUETAS DE UN LIBRO (estilo tienda en línea)
//
// Todas salen de datos reales del backend:
//   - "Más vendido": está entre los 3 libros con más unidades en ventas
//     pagadas o entregadas (mas_vendido).
//   - "Sin stock por ahora": stock en 0.
//   - "Agregado recientemente": creado en los últimos 30 días (es_nuevo).
// Ninguna se inventa: si el dato no está, la etiqueta no aparece.
// ============================================================

export function EtiquetasSuperiores({ libro }) {
    if (!libro.masVendido && libro.disponible) return null;
    return (
        <span className="etiquetas-libro">
            {libro.masVendido && <span className="etiqueta-top">Más vendido</span>}
            {!libro.disponible && <span className="agotado">Sin stock por ahora</span>}
        </span>
    );
}

export function EtiquetaNuevo({ libro }) {
    if (!libro.esNuevo) return null;
    return <span className="libro-nuevo">Agregado recientemente</span>;
}
