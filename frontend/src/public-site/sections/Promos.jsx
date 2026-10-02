import { Link } from 'react-router-dom';
import { FaChevronRight, FaDownload } from 'react-icons/fa6';

import imgInicio from '../assets/app/inicio.webp';
import imgInicio360 from '../assets/app/inicio-360.webp';

// Tres tarjetas que llevan a las páginas principales.
export default function Promos() {
    return (
        <section className="seccion verde-claro" aria-labelledby="promos-titulo">
            <div className="contenedor">
                <h2 id="promos-titulo" className="visualmente-oculto">Descubre más</h2>
                <div className="promos">
                    <article className="promo promo--con-imagen oscuro">
                        <h3>Toda la librería cabe en la app</h3>
                        <p>Busca, revisa la ficha de cada libro, guarda favoritos y reserva.</p>
                        <Link to="/aplicacion" className="boton boton--blanco boton--chico">Conoce la app <FaChevronRight aria-hidden="true" /></Link>
                        <img className="promo__imagen" src={imgInicio360} srcSet={`${imgInicio360} 360w, ${imgInicio} 780w`} sizes="(max-width: 1023px) 34vw, 170px" alt="" width="390" height="844" loading="lazy" decoding="async" />
                    </article>
                    <article className="promo promo--clara">
                        <h3>Delivery o recojo sin costo en Pallasca</h3>
                        <p>Delivery dentro de Pallasca con tarifa por zona, o recojo gratis en nuestra tienda.</p>
                        <Link to="/caracteristicas" className="boton boton--marca boton--chico">Ver cómo funciona <FaChevronRight aria-hidden="true" /></Link>
                    </article>
                    <article className="promo promo--profunda oscuro">
                        <h3>Descárgala gratis</h3>
                        <p>Disponible para Android. La versión para iPhone está en preparación.</p>
                        <Link to="/descargar" className="boton boton--blanco"><FaDownload aria-hidden="true" /> Descargar la app</Link>
                    </article>
                </div>
            </div>
        </section>
    );
}
