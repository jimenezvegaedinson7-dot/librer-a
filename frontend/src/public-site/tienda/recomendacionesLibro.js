// Respaldo para APIs que aun no publican /libros/:id/relacionados.
// Conserva los datos/precios del catalogo; no inventa recomendaciones.
export function recomendacionesDesdeCatalogo(libro, catalogo) {
    const vistos = new Set([Number(libro.id)]);
    const candidatos = catalogo.filter(l => {
        const id = Number(l.id_libro);
        if (!Number.isInteger(id) || id <= 0 || Number(l.estado) !== 1 || vistos.has(id)) return false;
        vistos.add(id);
        return true;
    }).sort((a,b) => Number(Number(b.stock)>0) - Number(Number(a.stock)>0)
        || Number(b.id_libro) - Number(a.id_libro));
    const autor = libro.idAutor ? candidatos.filter(l => Number(l.id_autor) === libro.idAutor).slice(0,8) : [];
    const categoria = libro.idCategoria ? candidatos.filter(l => Number(l.id_categoria) === libro.idCategoria
        && Number(l.id_autor) !== libro.idAutor).slice(0,8) : [];
    const relacionados = [...autor.slice(0,4), ...categoria.slice(0,Math.max(0,4-autor.length))];
    const usados = new Set(relacionados.map(l => Number(l.id_libro)));
    return {
        relacionados,
        mas_autor: autor.filter(l => !usados.has(Number(l.id_libro))).slice(0,4),
        interesarte: categoria.filter(l => !usados.has(Number(l.id_libro))).slice(0,4)
    };
}
