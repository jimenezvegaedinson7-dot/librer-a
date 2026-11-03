import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
