import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// ============================================================
// ACCESO AL CATÁLOGO
// Solo la acción: sin foto ni textos que repitan lo que ya dice la página.
// ============================================================
export default function BandaCatalogo() {
    return (
        <section className="acceso-catalogo" aria-label="Explorar el catálogo completo">
            <div className="contenedor acceso-catalogo__contenido">
                <Link to="/catalogo" className="acceso-catalogo__boton">
                    <span>Explorar catálogo</span>
                    <ArrowRight aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}
