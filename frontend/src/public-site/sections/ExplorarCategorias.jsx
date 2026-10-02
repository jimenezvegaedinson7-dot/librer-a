import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa6';

import { portada } from '../lib/formato';

// ============================================================
// EXPLORA POR CATEGORÍA
// Mosaicos con las categorías reales del catálogo: cada uno muestra las
// portadas de sus libros, cuántos títulos tiene y lleva al catálogo ya
// filtrado. Sin catálogo (cargando o error) la sección no aparece.
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
            .slice(0, 6);
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
                            <Link to={`/catalogo?categoria=${encodeURIComponent(nombre)}`} className="explorar__tarjeta">
                                <span className="explorar__portadas" aria-hidden="true">
                                    {lista.slice(0, 3).map((l) => (
                                        <img key={l.id} src={portada(l.portada, 160)} alt="" width="80" height="120" loading="lazy" decoding="async" />
                                    ))}
                                </span>
                                <span className="explorar__texto">
                                    <strong>{nombre}</strong>
                                    <span>{lista.length} {lista.length === 1 ? 'título' : 'títulos'}</span>
                                </span>
                                <FaChevronRight className="explorar__flecha" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
