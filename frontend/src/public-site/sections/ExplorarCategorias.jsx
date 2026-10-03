import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { portada } from '../lib/formato';
import { FaChevronRight } from 'react-icons/fa6';

// ============================================================
// EXPLORA POR CATEGORÍA
// Las categorías reales del catálogo, sueltas sobre la página (sin
// tarjetas ni iconos): tres portadas en abanico, el nombre y cuántos
// títulos tiene. Cada una lleva al catálogo ya filtrado.
// Sin catálogo (cargando o error) la sección no aparece.
// ============================================================
export default function ExplorarCategorias({ catalogo }) {
    const { libros } = catalogo;

    const grupos = useMemo(() => {
        const mapa = new Map();
        libros.forEach((l) => {
            if (!l.categoria) return;
            if (!mapa.has(l.categoria)) mapa.set(l.categoria, []);
            mapa.get(l.categoria).push(l);
        });
        return [...mapa.entries()]
            .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'es'))
            // Solo las categorías con más títulos: así cada tarjeta tiene sus
            // tres portadas reales.
            .filter(([, lista]) => lista.length >= 2)
            .slice(0, 4);
    }, [libros]);

    if (grupos.length < 2) return null;

    return (
        <section className="seccion explorar" aria-labelledby="explorar-titulo">
            <div className="contenedor">
                <div className="seccion__cabeza">
                    <h2 id="explorar-titulo" className="seccion__titulo" data-revelar="">
                        <span className="linea"><span>Explora por categoría</span></span>
                    </h2>
                    <Link to="/catalogo" className="enlace-mas">Ver todas <FaChevronRight aria-hidden="true" /></Link>
                </div>
                <p className="seccion__entrada">
                    Novela, poesía, historias para los más pequeños y mucho más. Elige un género y descubre los títulos
                    que tenemos disponibles hoy.
                </p>
                <ul className="explorar__rejilla" data-revelar="">
                    {grupos.map(([nombre, lista], i) => (
                        <li key={nombre} className="explorar__item" style={{ '--i': i }}>
                            <Link to={`/catalogo?categoria=${encodeURIComponent(nombre)}`} className="explorar__enlace">
                                <span className="explorar__libros" aria-hidden="true">
                                    {lista.slice(0, 3).map((l, k) => (
                                        <img key={l.id} src={portada(l.portada, 180)} alt="" width="90" height="135" loading="lazy" decoding="async" style={{ '--k': k }} />
                                    ))}
                                </span>
                                <span className="explorar__texto">
                                    <strong>{nombre}</strong>
                                    <span className="explorar__cuenta">{lista.length} {lista.length === 1 ? 'título' : 'títulos'}</span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
