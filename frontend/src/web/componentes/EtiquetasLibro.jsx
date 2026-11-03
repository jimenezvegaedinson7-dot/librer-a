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
