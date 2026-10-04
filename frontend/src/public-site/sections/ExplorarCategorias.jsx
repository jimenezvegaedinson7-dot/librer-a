import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { portada } from '../lib/formato';
import { FaChevronRight } from 'react-icons/fa6';

// ============================================================
// EXPLORA POR CATEGORÍA
// Las 4 categorías con más títulos del catálogo real, en tarjetas marfil:
// tres libros de pie con las portadas reales de la categoría, un adorno
// de línea dorada según el género, el nombre en serif, cuántos títulos
// tiene y un botón circular. Cada una lleva al catálogo ya filtrado.
// Sin catálogo (cargando o error) la sección no aparece.
// ============================================================

// Adornos de línea fina (dorado), uno por género; el resto usa hojas.
const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
const ADORNOS = {
    novela: ( // pluma con un rizo de tinta
        <g {...trazo}>
            <path d="M74 8C46 22 30 52 24 96c14-20 30-40 50-88Z" />
            <path d="M74 8C58 34 42 62 24 96" />
            <path d="M66 20l-14 4M60 32l-14 3M53 45l-13 2M46 58l-11 1M39 71l-9 1" opacity=".7" />
            <path d="M24 96c-4 8-12 10-16 6s2-10 8-8c8 3 6 14 18 12 6-1 10-4 14-2" />
        </g>
    ),
    cuento: ( // ramas con hojas y destellos
        <g {...trazo}>
            <path d="M40 112C38 80 44 52 58 26" />
            <path d="M44 88c-12-2-18-10-18-18 10 0 17 7 18 18ZM47 66c10-4 17-12 16-21-9 2-15 10-16 21ZM42 74c-11-5-15-13-14-21 9 3 14 11 14 21ZM51 46c-9-5-12-12-10-19 8 3 12 10 10 19Z" />
            <path d="M70 14l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM84 34l1.2 3.6 3.6 1.2-3.6 1.2L84 44l-1.2-3.6-3.6-1.2 3.6-1.2L84 34Z" />
        </g>
    ),
    poesía: ( // flor de trazo fino
        <g {...trazo}>
            <path d="M46 114C46 88 44 66 48 44" />
            <path d="M48 44c-8-10-8-22 0-30 8 8 8 20 0 30ZM48 44c-12-2-20-10-22-20 11 0 19 8 22 20ZM48 44c12-2 20-10 22-20-11 0-19 8-22 20Z" />
            <path d="M46 84c-10-2-16-8-18-16 9 0 15 6 18 16ZM47 72c9-3 14-9 15-17-8 1-13 7-15 17Z" />
            <circle cx="48" cy="40" r="2.2" />
        </g>
    ),
    ensayo: ( // columna clásica
        <g {...trazo}>
            <path d="M22 30h52M26 30c-6 0-9-4-8-8 1-5 8-5 9-1 1 3-2 5-4 4M70 30c6 0 9-4 8-8-1-5-8-5-9-1-1 3 2 5 4 4" />
            <path d="M28 36h40M30 36v72M38 36v72M48 36v72M58 36v72M66 36v72" opacity=".8" />
            <path d="M24 108h48M20 114h56" />
        </g>
    ),
};
const ADORNO_GENERICO = ADORNOS.cuento;
const adornoDe = (nombre) => ADORNOS[String(nombre).toLowerCase()] || ADORNO_GENERICO;

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
            .filter(([, lista]) => lista.length >= 2)
            .slice(0, 4)
            // Para los libros de la tarjeta se prefieren los que tienen portada.
            .map(([nombre, lista]) => [nombre, lista, [...lista].sort((a, b) => Number(Boolean(b.portada)) - Number(Boolean(a.portada))).slice(0, 3)]);
    }, [libros]);

    if (grupos.length < 2) return null;

    return (
        <section className="seccion categorias" aria-labelledby="explorar-titulo">
            <svg className="categorias__curvas" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
                <path d="M400 20C300 60 260 160 300 260s60 140 20 180" />
                <path d="M400 80C320 110 290 190 320 270s40 120 10 150" />
            </svg>
            <div className="contenedor">
                <div className="categorias__cabeza">
                    <div>
                        <h2 id="explorar-titulo" className="categorias__titulo" data-revelar="">Explora por categoría</h2>
                        <p className="categorias__entrada">
                            Novela, poesía, historias para los más pequeños y mucho más. Elige un género y descubre los títulos
                            que tenemos disponibles hoy.
                        </p>
                    </div>
                    <Link to="/catalogo" className="categorias__todas">Ver todas <FaChevronRight aria-hidden="true" /></Link>
                </div>
                <ul className="categorias__rejilla" data-revelar="">
                    {grupos.map(([nombre, lista, muestra], i) => (
                        <li key={nombre} className="categorias__item" style={{ '--i': i }}>
                            <Link to={`/catalogo?categoria=${encodeURIComponent(nombre)}`} className="categoria">
                                <span className="categoria__escena" aria-hidden="true">
                                    <svg className="categoria__adorno" viewBox="0 0 96 120" focusable="false">{adornoDe(nombre)}</svg>
                                    <span className="categoria__libros">
                                        {muestra.map((l, k) => (
                                            <span key={l.id} className="categoria__libro" style={{ '--k': k }}>
                                                <img src={portada(l.portada, 220)} alt="" width="110" height="165" loading="lazy" decoding="async" />
                                            </span>
                                        ))}
                                    </span>
                                </span>
                                <span className="categoria__pie">
                                    <span>
                                        <strong className="categoria__nombre">{nombre}</strong>
                                        <span className="categoria__cuenta">{lista.length} {lista.length === 1 ? 'título' : 'títulos'}</span>
                                    </span>
                                    <span className="categoria__flecha" aria-hidden="true"><FaChevronRight /></span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
