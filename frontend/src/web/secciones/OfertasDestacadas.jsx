import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa6';
import { useCarruselAutomatico } from '../lib/useCarruselAutomatico';
import { PrecioOferta } from '../componentes/PrecioOferta';
import { portada, soles } from '../lib/formato';
import ComprarLibro from '../tienda/ComprarLibro';
import { referenciaPortadaLibro, AVISO_PORTADA_REFERENCIA } from '../../compartido/lib/utils/portadasLibro';
import './ofertas-destacadas.css';

export default function OfertasDestacadas({ catalogo }) {
    const pista = useRef(null);
    const ofertas = (catalogo?.libros || [])
        .filter((l) => l.descuento > 0 && l.precioFinal < l.precio)
        .sort((a, b) => b.descuento - a.descuento)
        .slice(0, 12);

    useCarruselAutomatico(pista, { activo: ofertas.length > 1 });
    const desplazar = (sentido) =>
        pista.current?.scrollBy({ left: sentido * pista.current.clientWidth * 0.7, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

    if (ofertas.length === 0) return null;

    return (
        <section className="seccion ofertas" aria-labelledby="ofertas-titulo" data-reveal="fade-up">
            <div className="contenedor">
                <div className="seccion__cabeza">
                    <h2 id="ofertas-titulo" className="seccion__titulo">
                        Ofertas vigentes
                    </h2>
                    <div className="catalogo__controles">
                        <Link to="/catalogo?ofertas=1" className="enlace-mas">
                            Ver todas las ofertas <FaArrowRight aria-hidden="true" />
                        </Link>
                        <button
                            type="button"
                            className="boton boton--linea boton--icono"
                            aria-label="Ofertas anteriores"
                            aria-controls="ofertas-lista"
                            onClick={() => desplazar(-1)}>
                            <FaArrowLeft aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="boton boton--linea boton--icono"
                            aria-label="Siguientes ofertas"
                            aria-controls="ofertas-lista"
                            onClick={() => desplazar(1)}>
                            <FaArrowRight aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <ul ref={pista} id="ofertas-lista" className="ofertas__rejilla ofertas__carrusel" tabIndex={0} aria-label="Ofertas vigentes, carrusel desplazable" data-revelar="">
                    {ofertas.map((libro, i) => (
                        <li key={libro.id} className="oferta-tarjeta" style={{ '--i': i }}>
                            <div className="oferta-tarjeta__visual">
                                <Link to={`/libro/${libro.id}`} className="oferta-tarjeta__tapa" aria-label={`Ver ${libro.titulo}`}>
                                    <img src={portada(libro.portada, 480)} alt={`Portada de ${libro.titulo}`} width="200" height="300" loading="lazy" decoding="async" />
                                </Link>
                                <span className="oferta-tarjeta__porcentaje" aria-hidden="true">
                                    -{libro.descuento}%
                                </span>
                            </div>
                            <div className="oferta-tarjeta__datos">
                                {libro.categoria && <span className="libro__categoria">{libro.categoria}</span>}
                                <h3 className="libro__titulo">
                                    <Link to={`/libro/${libro.id}`}>{libro.titulo}</Link>
                                </h3>
                                {referenciaPortadaLibro(libro) && <p className="portada-referencia">{AVISO_PORTADA_REFERENCIA}</p>}
                                <p className="oferta-tarjeta__autor">{libro.autor}</p>
                                <PrecioOferta libro={libro} />
                                <p className="oferta-tarjeta__ahorro">Ahorras {soles(libro.precio - libro.precioFinal)}</p>
                            </div>
                            <ComprarLibro libro={libro} enlaceDetalle />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
