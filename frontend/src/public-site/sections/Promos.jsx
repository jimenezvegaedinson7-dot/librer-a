import { Link } from 'react-router-dom';
import { FaChevronRight, FaDownload, FaTruckFast, FaMobileScreenButton } from 'react-icons/fa6';

import imgInicio from '../assets/app/inicio.webp';
import imgInicio360 from '../assets/app/inicio-360.webp';

// ============================================================
// VITRINA DE LA APP (inicio)
// Tarjeta grande a la izquierda con el celular integrado y, a la derecha,
// dos tarjetas apiladas: entrega en Pallasca y descarga gratuita.
// Crema, azul oscuro y dorado. Mismos textos y enlaces de siempre.
// ============================================================
export default function Promos() {
    return (
        <section className="seccion vitrina-seccion" aria-labelledby="promos-titulo">
            <div className="contenedor">
                <h2 id="promos-titulo" className="visualmente-oculto">Descubre más</h2>
                <div className="vitrina">
                    <article className="vitrina__principal oscuro">
                        <div className="vitrina__texto">
                            <span className="vitrina__icono" aria-hidden="true"><FaMobileScreenButton /></span>
                            <h3>Toda la librería cabe en la app</h3>
                            <p>Busca, revisa la ficha de cada libro, guarda favoritos y reserva.</p>
                            <Link to="/aplicacion" className="boton boton--blanco boton--chico">Conoce la app <FaChevronRight aria-hidden="true" /></Link>
                        </div>
                        <div className="vitrina__telefono" aria-hidden="true">
                            <img src={imgInicio360} srcSet={`${imgInicio360} 360w, ${imgInicio} 780w`} sizes="(max-width: 700px) 46vw, 230px" alt="" width="390" height="844" loading="lazy" decoding="async" />
                        </div>
                    </article>
                    <article className="vitrina__tarjeta vitrina__tarjeta--crema">
                        <span className="vitrina__icono" aria-hidden="true"><FaTruckFast /></span>
                        <div className="vitrina__cuerpo">
                            <h3>Delivery o recojo sin costo en Pallasca</h3>
                            <p>Delivery dentro de Pallasca con tarifa por zona, o recojo gratis en nuestra tienda.</p>
                            <Link to="/caracteristicas" className="boton boton--marca boton--chico">Ver cómo funciona <FaChevronRight aria-hidden="true" /></Link>
                        </div>
                    </article>
                    <article className="vitrina__tarjeta vitrina__tarjeta--marino oscuro">
                        <span className="vitrina__icono" aria-hidden="true"><FaDownload /></span>
                        <div className="vitrina__cuerpo">
                            <h3>Descárgala gratis</h3>
                            <p>Disponible para Android. La versión para iPhone está en preparación.</p>
                            <Link to="/descargar" className="boton boton--blanco boton--chico"><FaDownload aria-hidden="true" /> Descargar la app</Link>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}
