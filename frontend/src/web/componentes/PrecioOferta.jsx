import { soles } from '../lib/formato';

export function PrecioOferta({ libro, clase = '' }) {
    const conOferta = libro.descuento > 0 && libro.precioFinal < libro.precio;

    if (!conOferta) {
        return <span className={`precio ${clase}`}>{soles(libro.precio)}</span>;
    }

    return (
        <span className={`precio oferta ${clase}`}>
            <span className="oferta__pastilla">-{libro.descuento}%</span>
            <span className="oferta__anterior" aria-label={`Precio normal ${soles(libro.precio)}`}>
                <s>{soles(libro.precio)}</s>
            </span>
            <span className="oferta__final">{soles(libro.precioFinal)}</span>
        </span>
    );
}
