import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FaBars, FaXmark, FaMagnifyingGlass, FaMobileScreenButton, FaLocationDot, FaChevronRight } from 'react-icons/fa6';

import logo from '../assets/logo-f-verde-96.webp';
import { AVISOS, NAVEGACION, SITIO } from '../config/site';
import { EASE } from '../config/motion';

// Buscador de la cabecera: lleva al catálogo con la búsqueda aplicada.
function Buscador({ id }) {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { pathname } = useLocation();
    const [texto, setTexto] = useState(pathname === '/catalogo' ? params.get('q') || '' : '');
    const enviar = (e) => {
        e.preventDefault();
        const q = texto.trim();
        navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : '/catalogo');
    };
    return (
        <form className="buscador" role="search" onSubmit={enviar}>
            <label htmlFor={id} className="visualmente-oculto">Buscar en el catálogo</label>
            <input id={id} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Busca por título, autor o categoría" autoComplete="off" />
            <button type="submit" aria-label="Buscar"><FaMagnifyingGlass aria-hidden="true" /></button>
        </form>
    );
}

function Marca() {
    return (
        <Link to="/" className="marca" aria-label={`${SITIO.nombre}, inicio`}>
            <img src={logo} alt="" width="30" height="35" />
            <span>{SITIO.nombre}</span>
        </Link>
    );
}

export default function PublicHeader() {
    const reducido = useReducedMotion();
    const { pathname, search } = useLocation();
    const [sombra, setSombra] = useState(false);
    const [abierto, setAbierto] = useState(false);
    const botonMenu = useRef(null);
    const primerEnlace = useRef(null);

    useEffect(() => {
        const alScroll = () => setSombra(window.scrollY > 90);
        alScroll();
        window.addEventListener('scroll', alScroll, { passive: true });
        return () => window.removeEventListener('scroll', alScroll);
    }, []);

    // Cerrar el cajón al cambiar de página.
    const [rutaPrevia, setRutaPrevia] = useState(pathname + search);
    if (rutaPrevia !== pathname + search) {
        setRutaPrevia(pathname + search);
        if (abierto) setAbierto(false);
    }

    // Cajón móvil: Escape cierra, el foco entra y vuelve al botón, y la
    // página de fondo no se desplaza.
    useEffect(() => {
        if (!abierto) return undefined;
        const alTeclado = (e) => { if (e.key === 'Escape') setAbierto(false); };
        document.addEventListener('keydown', alTeclado);
        document.documentElement.style.overflow = 'hidden';
        primerEnlace.current?.focus();
        const boton = botonMenu.current;
        return () => {
            document.removeEventListener('keydown', alTeclado);
            document.documentElement.style.overflow = '';
            boton?.focus();
        };
    }, [abierto]);

    return (
        <>
            <div className="avisos">
                <ul className="contenedor">
                    {AVISOS.map((a) => (
                        <li key={a.texto}>{a.ruta ? <Link to={a.ruta}>{a.texto}</Link> : a.texto}</li>
                    ))}
                </ul>
            </div>

            <header className="cabecera" data-sombra={sombra}>
                <div className="contenedor cabecera__principal">
                    <button
                        ref={botonMenu}
                        type="button"
                        className="boton-menu cabecera__boton-menu"
                        aria-expanded={abierto}
                        aria-controls="cajon-menu"
                        aria-label="Abrir menú"
                        onClick={() => setAbierto(true)}
                    >
                        <FaBars aria-hidden="true" />
                    </button>
                    <Marca />
                    <Buscador id="buscar-escritorio" />
                    <div className="cabecera__acciones">
                        <Link to="/nosotros#tienda" className="cabecera__enlace"><FaLocationDot aria-hidden="true" /> Nuestra tienda</Link>
                        <Link to="/descargar" className="boton boton--chico cabecera__descarga"><FaMobileScreenButton aria-hidden="true" /> <span className="cabecera__descarga-texto">Descargar la app</span></Link>
                    </div>
                </div>
                <div className="contenedor cabecera__movil">
                    <Buscador id="buscar-movil" />
                </div>
                <nav className="menu" aria-label="Principal">
                    <ul className="contenedor">
                        {NAVEGACION.map(({ ruta, texto, destacado }) => (
                            <li key={ruta}>
                                <NavLink to={ruta} end={ruta === '/'} data-destacado={destacado || undefined}>{texto}</NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </header>

            <AnimatePresence>
                {abierto && (
                    <div className="cajon" id="cajon-menu" role="dialog" aria-modal="true" aria-label="Menú">
                        <motion.button
                            type="button"
                            className="cajon__velo"
                            aria-label="Cerrar menú"
                            tabIndex={-1}
                            onClick={() => setAbierto(false)}
                            initial={reducido ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={reducido ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
                        />
                        <motion.div
                            className="cajon__panel"
                            initial={reducido ? false : { x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={reducido ? { opacity: 0, transition: { duration: 0 } } : { x: '-100%' }}
                            transition={{ duration: 0.45, ease: EASE.salida }}
                        >
                            <div className="cajon__cabeza">
                                <Marca />
                                <button type="button" className="boton-menu" aria-label="Cerrar menú" onClick={() => setAbierto(false)}>
                                    <FaXmark aria-hidden="true" />
                                </button>
                            </div>
                            <nav aria-label="Menú móvil">
                                <ul className="cajon__lista">
                                    {NAVEGACION.map(({ ruta, texto, destacado }, i) => (
                                        <li key={ruta}>
                                            <NavLink ref={i === 0 ? primerEnlace : undefined} to={ruta} end={ruta === '/'} data-destacado={destacado || undefined}>
                                                {texto} <FaChevronRight aria-hidden="true" style={{ width: 12, height: 12 }} />
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                            <div className="cajon__pie">
                                <Link to="/nosotros#tienda" onClick={() => setAbierto(false)}>Nuestra tienda en Pallasca</Link>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
