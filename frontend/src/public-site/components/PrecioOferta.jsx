import { soles } from '../lib/formato';

// ============================================================
// PRECIO CON OFERTA
//
// El precio final y el porcentaje llegan ya resueltos desde
// useCatalogo: cuando la promoción está vencida, descuento llega en 0
// y precioFinal es el precio de lista, así que aquí no hay ninguna regla
// que pueda quedar desincronizada del backend.
//
// Sin descuento devuelve el precio solo, para no dejar una pastilla
// "-0%" colgada en la ficha.
// ============================================================

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
