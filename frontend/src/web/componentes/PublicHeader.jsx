import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Menu, X, Search, MapPin, ChevronRight, ShoppingCart, UserRound } from 'lucide-react';

import logo from '../../compartido/assets/logo-f-verde-96.webp';
import { NAVEGACION, SITIO } from '../config/site';
import { EASE } from '../config/motion';
import { useTienda } from '../tienda/TiendaContext';
import './public-header.css';

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
            <button type="submit" aria-label="Buscar"><Search aria-hidden="true" /></button>
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
    const tienda = useTienda();
    const unidades = tienda.items.reduce((s,i)=>s+i.cantidad,0);
    // Sin sesión y con el carrito vacío no se muestra el carrito.
    const verCarrito = Boolean(tienda.usuario) || unidades > 0;
    // El número solo aparece desde 1 libro; con el carrito vacío no se muestra "(0)".
    const textoCarrito = unidades ? `Carrito (${unidades})` : 'Carrito';
    const reducido = useReducedMotion();
    const { pathname, search } = useLocation();
    const [sombra, setSombra] = useState(false);
    const [abierto, setAbierto] = useState(false);
    const botonMenu = useRef(null);
    const primerEnlace = useRef(null);

    useEffect(() => {
        const alScroll = () => {
            setSombra(window.scrollY > 90);
            // Un salto directo a una sección inferior también debe dejar el
            // menú disponible, aunque la escena no llegue a dibujar un cuadro.
            const escena=document.querySelector('.portada3d--3d');
            const sitio=escena?.closest('.sitio');
            if(sitio){
                const posterior=escena.getBoundingClientRect().bottom<=0?'true':'false';
                if(sitio.dataset.navPosterior!==posterior)sitio.dataset.navPosterior=posterior;
            }
        };
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
            <div className="navegacion-publica">
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
                        <Menu aria-hidden="true" />
                    </button>
                    <Marca />
                    <Buscador id="buscar-escritorio" />
                    <div className="cabecera__acciones">
                        <Link to="/nosotros#tienda" className="cabecera__enlace"><MapPin aria-hidden="true" /> <span className="cabecera__enlace-texto">Nuestra tienda</span></Link>
                        <Link to="/cuenta" className="compra-cuenta" aria-label="Mi cuenta"><UserRound aria-hidden="true"/><span className="compra-cuenta__texto">{tienda.usuario && <small>Hola, {tienda.usuario.nombre}</small>}Mi cuenta</span></Link>
                        {verCarrito && <Link to="/carrito" className="compra-carrito" data-cantidad={unidades || undefined} aria-label={textoCarrito}><ShoppingCart aria-hidden="true"/><span>{textoCarrito}</span></Link>}
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
            </div>

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
                                    <X aria-hidden="true" />
                                </button>
                            </div>
                            <nav aria-label="Menú móvil">
                                <ul className="cajon__lista">
                                    {NAVEGACION.map(({ ruta, texto, destacado }, i) => (
                                        <li key={ruta}>
                                            <NavLink ref={i === 0 ? primerEnlace : undefined} to={ruta} end={ruta === '/'} data-destacado={destacado || undefined}>
                                                {texto} <ChevronRight aria-hidden="true" style={{ width: 16, height: 16 }} />
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                            <div className="cajon__pie">
                                <Link to="/cuenta" onClick={()=>setAbierto(false)}>Mi cuenta y mis compras</Link>
                                {verCarrito && <Link to="/carrito" onClick={()=>setAbierto(false)}>Mi carrito{unidades ? ` (${unidades})` : ''}</Link>}
                                <Link to="/nosotros#tienda" onClick={() => setAbierto(false)}>Nuestra tienda en Pallasca</Link>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {tienda.aviso && <div className="compra-notificacion" role="status"><span>{tienda.aviso}</span>
                <Link to="/carrito">Ver carrito</Link><button type="button" onClick={()=>tienda.setAviso('')} aria-label="Cerrar aviso del carrito">Cerrar</button></div>}
        </>
    );
}
