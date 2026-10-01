import { useRef } from 'react';
import { FaMagnifyingGlass, FaBookOpen, FaCartShopping, FaHeart, FaBookmark } from 'react-icons/fa6';

import imgCatalogo from '../assets/app/catalogo.webp';
import imgInicio from '../assets/app/inicio.webp';
import imgFicha from '../assets/app/ficha-libro.webp';
import { gsap, useGSAP } from '../animation/scroll';
import CierreDescarga from '../components/CierreDescarga';

const FUNCIONES = [
    { Icono: FaMagnifyingGlass, titulo: 'Búsqueda', texto: 'Por título, autor o ISBN, con filtros por categoría.' },
    { Icono: FaBookOpen, titulo: 'Ficha de cada libro', texto: 'Portada, sinopsis, precio y ejemplares disponibles.' },
    { Icono: FaCartShopping, titulo: 'Carrito y pago en línea', texto: 'Paga con PayU y sigue tus compras desde la app.' },
    { Icono: FaHeart, titulo: 'Favoritos', texto: 'Guarda los libros que quieres leer después.' },
    { Icono: FaBookmark, titulo: 'Reservas', texto: 'Aparta un libro desde su ficha y cancélalo si cambias de idea.' },
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
        gsap.fromTo('.telefono--1', { yPercent: 10 }, { yPercent: -8, ease: 'none', scrollTrigger: disparo });
        gsap.fromTo('.telefono--2', { yPercent: 22, rotateY: 18, rotateZ: -4 }, { yPercent: -4, rotateY: 6, rotateZ: -2, ease: 'none', scrollTrigger: disparo });
        gsap.fromTo('.telefono--3', { yPercent: 30, rotateY: -18, rotateZ: 4 }, { yPercent: 0, rotateY: -6, rotateZ: 2, ease: 'none', scrollTrigger: disparo });
        gsap.from('.app__lista li', {
            opacity: 0,
            x: -24,
            duration: 0.9,
            ease: 'expo.out',
            stagger: 0.08,
            scrollTrigger: { trigger: '.app__lista', start: 'top 80%' },
        });
    }, { scope: seccion, dependencies: [reducido] });

    return (
        <section id="app" ref={seccion} className="seccion app verde-claro" aria-labelledby="app-titulo">
            <div className="contenedor app__rejilla">
                <div>
                    <h1 id="app-titulo" className="seccion__titulo">Toda la librería cabe en la app</h1>
                    <p className="seccion__entrada">
                        Desde el inicio hasta el pago: estas son pantallas reales de la app de Librería del Saber.
                    </p>
                    <ul className="app__lista">
                        {FUNCIONES.map(({ Icono, titulo, texto }) => (
                            <li key={titulo}>
                                <Icono aria-hidden="true" />
                                <p><b>{titulo}</b><span>{texto}</span></p>
                            </li>
                        ))}
                    </ul>
                    <p className="app__nota">Capturas de la app Android con una cuenta de demostración.</p>
                    <CierreDescarga />
                </div>

                <div className="app__telefonos" style={{ perspective: '1400px' }}>
                    <Telefono clase="telefono--2" src={imgInicio} alt="Pantalla de inicio de la app con búsqueda, destacado y categorías" />
                    <Telefono clase="telefono--3" src={imgFicha} alt="Ficha del libro 1984 con precio, ejemplares disponibles y botones Reservar y Añadir" />
                    <Telefono clase="telefono--1" src={imgCatalogo} alt="Catálogo de la app con categorías y libros con precio" />
                </div>
            </div>
        </section>
    );
}
