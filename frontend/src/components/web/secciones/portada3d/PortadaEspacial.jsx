import { Link } from 'react-router-dom';
import { PrecioOferta } from '../../PrecioOferta';
import { urlPortada } from '../../../../services/web/formato';
import { LIBROS_RECIENTES } from './cachePortada';
import './portada3d.css';

function ultimosAgregados(libros = []) {
    const fecha = (libro) => Date.parse(libro.creadoEn) || 0;
    return [...libros]
        .filter((libro) => libro.estado === 1 && urlPortada(libro.portada) && libro.precio > 0)
        .sort((a, b) => fecha(b) - fecha(a) || b.id - a.id)
        .slice(0, LIBROS_RECIENTES);
}

function Vitrina({ libros }) {
    if (!libros.length) return null;
    return (
        <section
            className="portada3d__carrusel portada-unica__recientes portada3d__ultimos"
            aria-label="Últimos libros agregados">
            <div className="portada3d__carrusel-pista portada-unica__rejilla" role="list">
                {libros.map((libro) => (
                    <article
                        key={libro.id}
                        className="portada3d__carrusel-item portada-unica__reciente"
                        role="listitem">
                        <Link to={`/libro/${libro.id}`} className="portada3d__apilar-link portada3d__carrusel-link">
                            <div className="portada3d__apilar-tapa">
                                <img src={urlPortada(libro.portada, 320)} alt={`Portada de ${libro.titulo}`} width="160" height="240" loading="lazy" decoding="async" />
                                {libro.descuento > 0 && <span className="portada3d__apilar-descuento">-{libro.descuento}%</span>}
                            </div>
                            <div className="portada3d__apilar-info">
                                <h3 className="portada3d__apilar-titulo">{libro.titulo}</h3>
                                {libro.autor && <p className="portada3d__apilar-autor">{libro.autor}</p>}
                                <PrecioOferta libro={libro} clase="portada3d__apilar-precio" />
                            </div>
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default function PortadaEspacial({ recientes = [] }) {
    const libros = ultimosAgregados(recientes);
    return (
        <section className="portada3d portada-unica portada3d--estatica" aria-label="Portada de MATIDANA Libros y Cultura">
            <h1 className="sr-only">Libros y anuncios de MATIDANA Libros y Cultura</h1>
            <div className="portada3d__orbite">
                <div className="portada3d__orbite-texto">
                    <p className="portada3d__eyebrow">Catálogo MATIDANA</p>
                    <h2>Las ideas no se quedan quietas. <em>Tampoco nuestros libros.</em></h2>
                    <p className="portada3d__orbite-subtitulo">Últimos libros agregados</p>
                    <p className="portada3d__orbite-descripcion">Portadas reales del catálogo, ordenadas por fecha de ingreso.</p>
                    <Link to="/catalogo" className="portada3d__enlace">
                        Ver catálogo completo <span aria-hidden="true">→</span>
                    </Link>
                </div>
                <Vitrina libros={libros} />
            </div>
        </section>
    );
}
