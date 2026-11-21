import { soles } from '../../../services/web/formato';

export default function FichaTecnicaLibro({ libro }) {
    const datos = [
        ['Título', libro.titulo],
        ['Autor', libro.autor],
        ['Categoría', libro.categoria],
        ['ISBN', libro.isbn],
        ['Editorial', libro.editorial],
        ['Idioma', libro.idioma],
        ['Número de páginas', libro.numeroPaginas],
        ['Año de publicación', libro.anioPublicacion],
        ['Formato', libro.formato],
        ['Número de volumen', libro.numeroVolumen],
        ['Dimensiones', libro.dimensiones],
        ['Precio actual', soles(libro.precioFinal)],
        ['Estado', libro.estado === 1 ? 'Activo' : null],
        ['Disponibilidad', libro.disponible ? 'En stock' : 'Agotado'],
        ['Stock', `${libro.stock} unidades`]
    ];
    return (
        <section className="ficha-tecnica ficha-seccion" aria-labelledby="ficha-tecnica-titulo">
            <h2 id="ficha-tecnica-titulo">Ficha técnica</h2>
            <dl>
                {datos
                    .filter(([, v]) => v !== null && v !== undefined && String(v).trim())
                    .map(([dato, valor]) => (
                        <div key={dato}>
                            <dt>{dato}</dt>
                            <dd>{valor}</dd>
                        </div>
                    ))}
            </dl>
        </section>
    );
}
