import { createElement, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    FaChevronRight, FaArrowRight, FaBookOpen, FaFeatherPointed, FaChild, FaDragon, FaRocket,
    FaMagnifyingGlass, FaHeart, FaGhost, FaScroll, FaLandmark, FaFlask, FaPalette, FaBook,
} from 'react-icons/fa6';

// Icono decorativo según el nombre real de la categoría. Si una categoría
// no está en la lista, usa el libro genérico: nunca se inventa una.
const ICONOS = [
    [/novela/i, FaBookOpen], [/poes/i, FaFeatherPointed], [/infantil|niñ/i, FaChild],
    [/fantas/i, FaDragon], [/ciencia\s*ficci/i, FaRocket], [/misterio|suspenso|polic/i, FaMagnifyingGlass],
    [/romance|amor/i, FaHeart], [/terror|horror/i, FaGhost], [/cuento|relato/i, FaScroll],
    [/historia/i, FaLandmark], [/ciencia/i, FaFlask], [/arte|cultura/i, FaPalette],
];
const iconoDe = (nombre) => (ICONOS.find(([re]) => re.test(nombre)) || [null, FaBook])[1];


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
            .slice(0, 8);
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
                                <span className="explorar__icono" aria-hidden="true">{createElement(iconoDe(nombre))}</span>
                                <span className="explorar__texto">
                                    <strong>{nombre}<span className="explorar__cuenta">({lista.length})</span></strong>
                                    <span className="explorar__ver">Ver libros <FaArrowRight aria-hidden="true" /></span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
