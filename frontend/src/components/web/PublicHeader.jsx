import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Menu, X, Search, MapPin, ChevronDown, ChevronRight, ShoppingCart, UserRound } from 'lucide-react';
import logo from '../../assets/compartido/logo-f-verde-96.webp';
import { NAVEGACION, SITIO, prioridadCategoria } from '../../models/config/web/site';
import { EASE } from '../../models/config/web/motion';
import { useTienda } from './tienda/TiendaContext';
import './public-header.css';

const ENLACES_CABECERA = NAVEGACION.filter(({ texto }) => texto !== 'Catálogo');
const [ENLACE_INICIO, ...ENLACES_RESTO] = ENLACES_CABECERA;

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
            <label htmlFor={id} className="visualmente-oculto">
                Buscar en el catálogo
            </label>
            <div className="buscador__wrapper">
                <input id={id} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Busca por título, autor o categoría" autoComplete="off" />
                <button type="submit" aria-label="Buscar">
                    <Search aria-hidden="true" />
                </button>
            </div>
        </form>
    );
}

function Marca() {
    const [nombre, ...descriptor] = SITIO.nombre.split(' ');
    return (
        <Link to="/" className="marca" aria-label={`${SITIO.nombre}, inicio`}>
            <img src={logo} alt="" width="30" height="35" />
            <span className="marca__texto">
                <strong>{nombre}</strong>
                <small>{descriptor.join(' ')}</small>
            </span>
        </Link>
    );
}

function ordenLibrosDestacados(a, b) {
    return Number(b.masVendido) - Number(a.masVendido) || Number(b.esNuevo) - Number(a.esNuevo) || a.id - b.id;
}

function MenuCategorias({ categorias, enlaces }) {
    const [abierta, setAbierta] = useState(null);
    const { pathname, search } = useLocation();
    const [rutaPrevia, setRutaPrevia] = useState(pathname + search);
    if (rutaPrevia !== pathname + search) {
        setRutaPrevia(pathname + search);
        if (abierta) setAbierta(null);
    }

    useEffect(() => {
        const alTeclado = (e) => {
            if (e.key === 'Escape') setAbierta(null);
        };
        document.addEventListener('keydown', alTeclado);
        return () => document.removeEventListener('keydown', alTeclado);
    }, []);

    if (!categorias.length) return null;

    return categorias.map(({ nombre, cantidad, libros }, indice) => {
        const panelId = `menu-categoria-${indice}`;
        const etiquetaCantidad = cantidad === 1 ? 'título' : 'títulos';
        return (
            <li
                key={nombre}
                className="menu__categoria"
                data-abierto={abierta === nombre || undefined}
                onMouseEnter={() => setAbierta(nombre)}
                onMouseLeave={() => setAbierta(null)}
                onFocus={() => setAbierta(nombre)}
                onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setAbierta(null);
                }}>
                <Link
                    className="menu__categoria-enlace"
                    to={`/catalogo?categoria=${encodeURIComponent(nombre)}`}
                    aria-haspopup="true"
                    aria-expanded={abierta === nombre}
                    aria-controls={panelId}>
                    {nombre}
                    <span className="menu__cuenta" aria-hidden="true">
                        {cantidad}
                    </span>
                    <ChevronDown className="menu__flecha" aria-hidden="true" />
                </Link>
                <div className="menu__desplegable" id={panelId} aria-label={`Enlaces de ${nombre}`}>
                    <section className="menu__bloque">
                        <h3>Explorar {nombre}</h3>
                        <Link className="menu__destacado" to={`/catalogo?categoria=${encodeURIComponent(nombre)}`}>
                            Ver los {cantidad} {etiquetaCantidad} de {nombre}
                        </Link>
                        <p>Explora también el resto del catálogo, la app y la librería de Pallasca.</p>
                    </section>
                    <section className="menu__bloque">
                        <h3>Enlaces de MATIDANA</h3>
                        <ul>
                            {enlaces.map(({ ruta, texto }) => (
                                <li key={ruta}>
                                    <Link to={ruta}>{texto}</Link>
                                </li>
                            ))}
                            <li>
                                <Link to={SITIO.rutaReclamaciones}>Libro de reclamaciones</Link>
                            </li>
                        </ul>
                    </section>
                    <section className="menu__bloque">
                        <h3>Libros de {nombre}</h3>
                        {libros.length ? (
                            <ul className="menu__libros">
                                {libros.map((libro) => (
                                    <li key={libro.id}>
                                        <Link to={`/libro/${libro.id}`}>
                                            {libro.portada && <img src={libro.portada} alt="" width="34" height="48" loading="lazy" />}
                                            <span>
                                                <strong>{libro.titulo}</strong>
                                                {libro.autor && <small>{libro.autor}</small>}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>Cuando haya libros disponibles aparecerán aquí.</p>
                        )}
                    </section>
                </div>
            </li>
        );
    });
}

export default function PublicHeader() {
    const tienda = useTienda();
    const unidades = tienda.items.reduce((s, i) => s + i.cantidad, 0);

    const verCarrito = Boolean(tienda.usuario) || unidades > 0;

    const categorias = useMemo(() => {
        const grupos = new Map();
        for (const libro of tienda.libros) {
            const nombre = String(libro.categoria || '').trim();
            if (!nombre) continue;
            if (!grupos.has(nombre)) grupos.set(nombre, []);
            grupos.get(nombre).push(libro);
        }
        return [...grupos]
            .map(([nombre, libros]) => ({ nombre, cantidad: libros.length, libros: [...libros].sort(ordenLibrosDestacados).slice(0, 8) }))
            .sort((a, b) => prioridadCategoria(a.nombre) - prioridadCategoria(b.nombre) || b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'))
            .slice(0, 5);
    }, [tienda.libros]);

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
        };
        alScroll();
        window.addEventListener('scroll', alScroll, { passive: true });
        return () => window.removeEventListener('scroll', alScroll);
    }, []);

    const [rutaPrevia, setRutaPrevia] = useState(pathname + search);
    if (rutaPrevia !== pathname + search) {
        setRutaPrevia(pathname + search);
        if (abierto) setAbierto(false);
    }

    useEffect(() => {
        if (!abierto) return undefined;
        const alTeclado = (e) => {
            if (e.key === 'Escape') setAbierto(false);
        };
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
                    <div className="hightlights">
                        <div className="hightlight-up">
                            <div className="contenedor hightlight-contenido">
                                <Link to="/catalogo">Novedades cada semana</Link>
                                <Link to="/nosotros#tienda">Recojo gratis en librería</Link>
                                <Link to="/aplicacion">Descarga nuestra app</Link>
                            </div>
                        </div>
                        <div className="hightlight-down">
                            <div className="contenedor hightlight-contenido">
                                <Link to="/nosotros">Nuestra librería</Link>
                                <Link to={SITIO.rutaReclamaciones}>Libro de reclamaciones</Link>
                                <a href={`mailto:${SITIO.enlaces.correo}`}>Escríbenos</a>
                            </div>
                        </div>
                    </div>
                    <div className="contenedor cabecera__principal">
                        <button
                            ref={botonMenu}
                            type="button"
                            className="boton-menu cabecera__boton-menu"
                            aria-expanded={abierto}
                            aria-controls="cajon-menu"
                            aria-label="Abrir menú"
                            onClick={() => setAbierto(true)}>
                            <Menu aria-hidden="true" />
                        </button>
                        <Marca />
                        <Buscador id="buscar-escritorio" />
                        <div className="cabecera__acciones">
                            <Link to="/nosotros#tienda" className="cabecera__enlace">
                                <MapPin aria-hidden="true" />{' '}
                                <span className="cabecera__enlace-texto">
                                    <small>Visítanos en</small>Nuestra tienda
                                </span>
                            </Link>
                            <Link to="/cuenta" className="compra-cuenta" aria-label="Mi cuenta">
                                <UserRound aria-hidden="true" />
                                <span className="compra-cuenta__texto">
                                    <small>{tienda.usuario ? `Hola, ${tienda.usuario.nombre}` : 'Hola, identifícate'}</small>Mi cuenta
                                </span>
                            </Link>
                            {verCarrito && (
                                <Link to="/carrito" className="compra-carrito" aria-label={textoCarrito}>
                                    <ShoppingCart aria-hidden="true" />
                                    <span>{textoCarrito}</span>
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="contenedor cabecera__movil">
                        <Buscador id="buscar-movil" />
                    </div>
                    <nav className="menu" aria-label="Principal">
                        <ul className="contenedor">
                            {ENLACE_INICIO && (
                                <li key={ENLACE_INICIO.ruta}>
                                    <NavLink to={ENLACE_INICIO.ruta} end={ENLACE_INICIO.ruta === '/'}>
                                        {ENLACE_INICIO.texto}
                                    </NavLink>
                                </li>
                            )}
                            <MenuCategorias categorias={categorias} enlaces={ENLACES_CABECERA} />
                            {ENLACES_RESTO.map(({ ruta, texto, destacado }) => (
                                <li key={ruta}>
                                    <NavLink to={ruta} end={ruta === '/'} data-destacado={destacado || undefined}>
                                        {texto}
                                    </NavLink>
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
                            transition={{ duration: 0.45, ease: EASE.salida }}>
                            <div className="cajon__cabeza">
                                <Marca />
                                <button type="button" className="boton-menu" aria-label="Cerrar menú" onClick={() => setAbierto(false)}>
                                    <X aria-hidden="true" />
                                </button>
                            </div>
                            <nav aria-label="Menú móvil">
                                <ul className="cajon__lista">
                                    {ENLACES_CABECERA.map(({ ruta, texto, destacado }, i) => (
                                        <li key={ruta}>
                                            <NavLink ref={i === 0 ? primerEnlace : undefined} to={ruta} end={ruta === '/'} data-destacado={destacado || undefined}>
                                                {texto} <ChevronRight aria-hidden="true" style={{ width: 16, height: 16 }} />
                                            </NavLink>
                                        </li>
                                    ))}
                                    {categorias.length > 0 && (
                                        <li className="cajon__categorias">
                                            <p>Categorías</p>
                                            <ul>
                                                {categorias.map(({ nombre, cantidad }) => (
                                                    <li key={nombre}>
                                                        <Link to={`/catalogo?categoria=${encodeURIComponent(nombre)}`} onClick={() => setAbierto(false)}>
                                                            {nombre} <span aria-hidden="true">{cantidad}</span>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    )}
                                </ul>
                            </nav>
                            <div className="cajon__pie">
                                <Link to="/cuenta" onClick={() => setAbierto(false)}>
                                    Mi cuenta y mis compras
                                </Link>
                                {verCarrito && (
                                    <Link to="/carrito" onClick={() => setAbierto(false)}>
                                        Mi carrito{unidades ? ` (${unidades})` : ''}
                                    </Link>
                                )}
                                <Link to="/nosotros#tienda" onClick={() => setAbierto(false)}>
                                    Nuestra tienda en Pallasca
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {tienda.aviso && (
                <div className="compra-notificacion" role="status">
                    <span>{tienda.aviso}</span>
                    <Link to="/carrito">Ver carrito</Link>
                    <button type="button" onClick={() => tienda.setAviso('')} aria-label="Cerrar aviso del carrito">
                        Cerrar
                    </button>
                </div>
            )}
        </>
    );
}
