import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa6';

import { PrecioOferta } from '../components/PrecioOferta';
import { portada, soles } from '../lib/formato';
import ComprarLibro from '../tienda/ComprarLibro';
import { referenciaPortadaLibro, AVISO_PORTADA_REFERENCIA } from '../../lib/utils/portadasLibro';

// ============================================================
// OFERTAS VIGENTES
// Solo los libros que la API marca con descuento vigente. Sin ofertas,
// la sección no aparece: nunca se muestra un descuento inventado.
// ============================================================
export default function OfertasDestacadas({ catalogo }) {
    const ofertas = (catalogo?.libros || [])
        .filter((l) => l.descuento > 0 && l.precioFinal < l.precio)
        .sort((a, b) => b.descuento - a.descuento)
        .slice(0, 3);

    if (ofertas.length === 0) return null;

    return (
        <section className="seccion ofertas" aria-labelledby="ofertas-titulo">
            <div className="contenedor">
                <div className="seccion__cabeza">
                    <h2 id="ofertas-titulo" className="seccion__titulo">Ofertas vigentes</h2>
                    <Link to="/catalogo?ofertas=1" className="enlace-mas">Ver todas las ofertas <FaArrowRight aria-hidden="true" /></Link>
                </div>
                <ul className="ofertas__rejilla" data-revelar="">
                    {ofertas.map((libro, i) => (
                        <li key={libro.id} className="oferta-tarjeta" style={{ '--i': i }}>
                            <span className="oferta-tarjeta__porcentaje" aria-hidden="true">-{libro.descuento}%</span>
                            <div className="oferta-tarjeta__tapa">
                                <img src={portada(libro.portada, 320)} alt={`Portada de ${libro.titulo}`} width="160" height="240" loading="lazy" decoding="async" />
                            </div>
                            <div className="oferta-tarjeta__datos">
                                {libro.categoria && <span className="libro__categoria">{libro.categoria}</span>}
                                <h3>{libro.titulo}</h3>
                                {referenciaPortadaLibro(libro) && <p className="portada-referencia">{AVISO_PORTADA_REFERENCIA}</p>}
                                <p className="oferta-tarjeta__autor">{libro.autor}</p>
                                <PrecioOferta libro={libro} />
                                <p className="oferta-tarjeta__ahorro">Ahorras {soles(libro.precio - libro.precioFinal)}</p>
                                <ComprarLibro libro={libro}/>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
