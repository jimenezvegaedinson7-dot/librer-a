import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaMagnifyingGlass, FaBook, FaCartShopping, FaHeart, FaBookmark, FaDownload, FaChevronRight } from 'react-icons/fa6';

import imgCatalogo from '../assets/app/catalogo.webp';
import imgInicio from '../assets/app/inicio.webp';
import imgFicha from '../assets/app/ficha-libro.webp';
import iconoApp from '../assets/app-icono.webp';
import { gsap, useGSAP } from '../animation/scroll';
import './aplicacion.css';

// ============================================================
// LA APLICACIÓN
// Portada verde profunda con el icono real de la app, el título y la
// descarga; a la derecha, tres pantallas reales en teléfonos que se mueven
// con el scroll. Debajo, las funciones en tarjetas.
// ============================================================

const FUNCIONES = [
    { Icono: FaMagnifyingGlass, titulo: 'Búsqueda', texto: 'Por título, autor o ISBN, con filtros por categoría.' },
    { Icono: FaBook, titulo: 'Ficha de cada libro', texto: 'Portada, sinopsis, precio y ejemplares disponibles.' },
    { Icono: FaCartShopping, titulo: 'Carrito y pago en línea', texto: 'Paga con PayU y sigue tus compras desde la app.' },
    { Icono: FaHeart, titulo: 'Favoritos', texto: 'Guarda los libros que quieres leer después.' },
    { Icono: FaBookmark, titulo: 'Reservas anteriores', texto: 'Consulta el historial y cancela las reservas que siguen activas.' },
];

function Telefono({ clase, src, alt }) {
    return (
        <figure className={`telefono ${clase}`} style={{ margin: 0 }}>
            <img src={src} alt={alt} width="390" height="844" loading="lazy" decoding="async" />
        </figure>
    );
}

export default function MobileExperience({ reducido }) {
    const seccion = useRef(null);

    useGSAP(() => {
        if (reducido) return;
        const disparo = { trigger: seccion.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 };
        // Solo suben desde su sitio: si bajaran, la portada (overflow: clip) los recortaría.
        gsap.fromTo('.telefono--1', { yPercent: 0 }, { yPercent: -8, ease: 'none', scrollTrigger: disparo });
        gsap.fromTo('.telefono--2', { yPercent: 0, rotateY: 12, rotateZ: -3 }, { yPercent: -10, rotateY: 6, rotateZ: -2, ease: 'none', scrollTrigger: disparo });
        gsap.fromTo('.telefono--3', { yPercent: 0, rotateY: -12, rotateZ: 3 }, { yPercent: -12, rotateY: -6, rotateZ: 2, ease: 'none', scrollTrigger: disparo });
        gsap.from('.app-portada__texto > *', { opacity: 0, y: 24, duration: 0.45, ease: 'expo.out', stagger: 0.05 });
        gsap.from('.app-funcion', {
            opacity: 0,
            y: 30,
            duration: 0.45,
            ease: 'expo.out',
            stagger: 0.05,
            scrollTrigger: { trigger: '.app-funciones', start: 'top 82%' },
        });
    }, { scope: seccion, dependencies: [reducido] });

    return (
        <div ref={seccion} className="app-pagina">
            <section id="app" className="seccion app app-portada" aria-labelledby="app-titulo">
                <div className="contenedor app__rejilla">
                    <div className="app-portada__texto">
                        <img className="icono-app icono-app--grande" src={iconoApp} alt="Icono de la app Librería del Saber" width="88" height="88" />
                        <h1 id="app-titulo" className="app-portada__titulo">Toda la librería cabe en la app</h1>
                        <p className="app-portada__entrada">
                            Explora el catálogo, guarda tus favoritos y paga en línea desde tu teléfono.
                            Las reservas anteriores se conservan en el historial.
                        </p>
                        <div className="app-portada__acciones">
                            <Link to="/descargar" className="boton"><FaDownload aria-hidden="true" /> Descargar la app</Link>
                            <Link to="/catalogo" className="enlace-mas">Ver el catálogo <FaChevronRight aria-hidden="true" /></Link>
                        </div>
                        <p className="app__nota">Gratis para Android · Capturas de una versión anterior con una cuenta de demostración.</p>
                    </div>

                    <div className="app__telefonos" style={{ perspective: '1400px' }}>
                        <Telefono clase="telefono--2" src={imgInicio} alt="Pantalla de inicio de la app con búsqueda, destacado y categorías" />
                        <Telefono clase="telefono--3" src={imgFicha} alt="Ficha del libro 1984 con precio, ejemplares disponibles y botones Reservar y Añadir" />
                        <Telefono clase="telefono--1" src={imgCatalogo} alt="Catálogo de la app con categorías y libros con precio" />
                    </div>
                </div>
            </section>

            <section className="seccion app-funciones-seccion" aria-labelledby="funciones-titulo">
                <div className="contenedor">
                    <h2 id="funciones-titulo" className="seccion__titulo">Todo lo que puedes hacer</h2>
                    <p className="seccion__entrada">Cada función existe hoy en la app: nada de promesas para más adelante.</p>
                    <ul className="app-funciones app__lista">
                        {FUNCIONES.map(({ Icono, titulo, texto }) => (
                            <li key={titulo} className="app-funcion">
                                <span className="app-funcion__icono" aria-hidden="true"><Icono /></span>
                                <p><b>{titulo}</b><span>{texto}</span></p>
                            </li>
                        ))}
                    </ul>
                    <div className="cierre-descarga">
                        <p>La app es gratis y está disponible para Android.</p>
                        <Link to="/descargar" className="boton"><FaDownload aria-hidden="true" /> Descargar la app</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
