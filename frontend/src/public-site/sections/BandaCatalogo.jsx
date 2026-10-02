import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa6';

import fondoWebp from '../../assets/fondo_web/fondo_inicio.webp';

// ============================================================
// BANDA "DESCUBRE EL CATÁLOGO"
// Invitación al catálogo completo sobre la foto de libros del proyecto.
// La cifra es la cantidad real de libros que devuelve la API; sin
// catálogo cargado la frase no lleva número.
// ============================================================
export default function BandaCatalogo({ catalogo }) {
    const total = catalogo?.libros?.length || 0;
    return (
        <section className="banda-catalogo oscuro" aria-labelledby="banda-catalogo-titulo" style={{ '--fondo-banda': `url(${fondoWebp})` }}>
            <div className="banda-catalogo__fondo" aria-hidden="true" />
            <div className="contenedor banda-catalogo__contenido" data-revelar="">
                <div>
                    <h2 id="banda-catalogo-titulo">Descubre el catálogo completo</h2>
                    <p>
                        {total > 0
                            ? `${total} ${total === 1 ? 'libro disponible' : 'libros disponibles'} con precios en soles. Elígelo aquí y cómpralo o resérvalo en la app.`
                            : 'Libros físicos con precios en soles. Elígelo aquí y cómpralo o resérvalo en la app.'}
                    </p>
                </div>
                <Link to="/catalogo" className="boton">Explorar catálogo <FaArrowRight aria-hidden="true" /></Link>
            </div>
        </section>
    );
}
