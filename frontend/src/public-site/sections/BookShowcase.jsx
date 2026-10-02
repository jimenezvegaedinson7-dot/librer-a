import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaChevronRight } from 'react-icons/fa6';

import { PrecioOferta } from '../components/PrecioOferta';
import { portada } from '../lib/formato';
import { EtiquetaNuevo } from '../components/EtiquetasLibro';

function Libro({ libro, indice }) {
    return (
        <li className="libro" style={{ '--i': indice }}>
            <div className="libro__tapa">
                <img
                    src={portada(libro.portada, 320)}
                    srcSet={`${portada(libro.portada, 220)} 220w, ${portada(libro.portada, 320)} 320w, ${portada(libro.portada, 440)} 440w`}
                    sizes="(max-width: 767px) 150px, 200px"
                    alt={`Portada de ${libro.titulo}`}
                    width="200"
                    height="300"
                    loading="lazy"
                    decoding="async"
                />
                {libro.masVendido && <span className="etiquetas-libro"><span className="etiqueta-top">Más vendido</span></span>}
                <EtiquetaNuevo libro={libro} />
            </div>
            <div className="libro__datos">
                <h3 className="libro__titulo">{libro.titulo}</h3>
                <p className="libro__autor">{libro.autor}</p>
                <p className="libro__pie">
                    <span>{libro.categoria}</span>
                    <PrecioOferta libro={libro} />
                </p>
            </div>
        </li>
    );
}

// Carrusel del inicio: una muestra del catálogo real y el enlace a la
// página completa.
export default function BookShowcase({ catalogo, reducido }) {
    const { cargando, error, libros } = catalogo;
    const ventana = useRef(null);
    const muestra = libros.slice(0, 12);

    const desplazar = (sentido) => {
        const el = ventana.current;
        if (el) el.scrollBy({ left: sentido * el.clientWidth * 0.7, behavior: reducido ? 'auto' : 'smooth' });
    };

    return (
        <section className="seccion catalogo" aria-labelledby="catalogo-titulo">
            <div className="contenedor">
                <div className="seccion__cabeza">
                    <h2 id="catalogo-titulo" className="seccion__titulo" data-revelar="">
                        <span className="linea"><span>Libros del catálogo</span></span>
                    </h2>
                    <div className="catalogo__controles">
                        <Link to="/catalogo" className="enlace-mas">Ver todo el catálogo <FaChevronRight aria-hidden="true" /></Link>
                        {!error && muestra.length > 0 && (
                            <>
                                <button type="button" className="boton boton--linea boton--icono" aria-label="Libros anteriores" aria-controls="catalogo-lista" onClick={() => desplazar(-1)}>
                                    <FaArrowLeft aria-hidden="true" />
                                </button>
                                <button type="button" className="boton boton--linea boton--icono" aria-label="Más libros" aria-controls="catalogo-lista" onClick={() => desplazar(1)}>
                                    <FaArrowRight aria-hidden="true" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <p className="seccion__entrada">Precios actuales. En la app puedes ver la sinopsis, el stock y comprar.</p>
            </div>

            {error || (!cargando && muestra.length === 0) ? (
                <div className="contenedor">
                    <p className="aviso" role="status">
                        {error
                            ? 'El catálogo no se pudo cargar en este momento. Puedes verlo completo en la app. '
                            : 'Estamos actualizando el catálogo. Mientras tanto, puedes explorarlo en la app. '}
                        <Link className="subrayado enlace-texto" to="/descargar">Descargar la app</Link>
                    </p>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <div ref={ventana} className="catalogo__ventana" tabIndex={0} aria-label="Muestra del catálogo, desplazable">
                        <ul id="catalogo-lista" className="catalogo__pista" data-revelar="" aria-busy={cargando}>
                            {cargando
                                ? Array.from({ length: 7 }, (_, i) => (
                                    <li className="libro libro--esqueleto" key={i} aria-hidden="true">
                                        <div className="libro__tapa" />
                                        <div className="libro__datos" />
                                    </li>
                                ))
                                : muestra.map((libro, i) => <Libro key={libro.id} libro={libro} indice={i} />)}
                        </ul>
                    </div>
                </div>
            )}
        </section>
    );
}
