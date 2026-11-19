import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Menu, X, Search, MapPin, ChevronDown, ChevronRight, ShoppingCart, UserRound } from 'lucide-react';
import logo from '../../assets/compartido/logo-f-verde-96.webp';
import {
    BLOQUES_POR_SECCION,
    CATEGORIA_DESTACADA_POR_SECCION,
    CATEGORIAS_RELACIONADAS,
    NAVEGACION,
    SITIO,
    etiquetaCortaCategoria,
    prioridadCategoria
} from '../../models/config/web/site';
import { EASE } from '../../models/config/web/motion';
import { autoresConMasLibros, seriesDe } from '../../services/web/tienda/libroComercial';
import { useTienda } from './tienda/TiendaContext';
import './public-header.css';

const ENLACES_CABECERA = NAVEGACION.filter(({ texto }) => texto !== 'Catálogo');
const [ENLACE_INICIO, ...ENLACES_RESTO] = ENLACES_CABECERA;
const MARGEN_INFERIOR_MEGA = 20;

function Buscador({ id }) {
    const abierto = useRef(false);
    const abrir = () => {
        if (abierto.current) return;
        abierto.current = true;
        window.open('/buscar', '_blank', 'noopener,noreferrer');
    };
    return (
        <form
            className="buscador"
            role="search"
            onSubmit={(e) => {
                e.preventDefault();
                abrir();
            }}
        >
            <label htmlFor={id} className="visualmente-oculto">
                Buscar en el catálogo
            </label>
            <div className="buscador__wrapper">
                <input
                    id={id}
                    type="search"
                    readOnly
                    onFocus={abrir}
                    onClick={abrir}
                    placeholder="Busca por título, autor o categoría"
                    autoComplete="off"
                />
                <button type="submit" aria-label="Abrir buscador">
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
    return Number(b.masVendido) - Number(a.masVendido) || Number(b.descuento) - Number(a.descuento) || Number(b.esNuevo) - Number(a.esNuevo) || a.id - b.id;
}

function etiquetaCantidad(cantidad) {
    return cantidad === 1 ? 'título' : 'títulos';
}

function precioTexto(libro) {
    const valor = Number(libro?.precioFinal);
    return Number.isFinite(valor) && valor > 0 ? `S/ ${valor.toFixed(2)}` : '';
}

function resumenDe(libro) {
    const texto = String(libro?.sinopsis || libro?.descripcion || '')
        .replace(/\s+/g, ' ')
        .trim();
    return texto.length > 140 ? `${texto.slice(0, 140).trimEnd()}…` : texto;
}

function destacadosDe(libros) {
    const vistos = new Set();
    const elegidos = [];
    const candidatos = [
        ...libros.filter((libro) => libro.masVendido),
        ...libros.filter((libro) => libro.descuento > 0),
        ...libros.filter((libro) => libro.esNuevo),
        ...libros
    ];
    for (const libro of candidatos) {
        if (elegidos.length === 3) break;
        if (!libro?.id || vistos.has(libro.id)) continue;
        vistos.add(libro.id);
        elegidos.push(libro);
    }
    return elegidos;
}

function urlsCategoria(nombre) {
    const codificado = encodeURIComponent(nombre);
    return {
        todo: `/catalogo?categoria=${codificado}`,
        ofertas: `/catalogo?categoria=${codificado}&ofertas=1`,
        stock: `/catalogo?categoria=${codificado}&stock=1`
    };
}

function MenuCategorias({ categorias, activa, abrir, cerrar, enlacesRef }) {
    return categorias.map((categoria, indice) => {
        const { nombre } = categoria;
        const abierta = activa?.nombre === nombre;
        const alTeclado = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                cerrar();
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const paso = e.key === 'ArrowRight' ? 1 : -1;
                const destino = (indice + paso + categorias.length) % categorias.length;
                enlacesRef.current[destino]?.focus();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                abrir(categoria);
                requestAnimationFrame(() => document.querySelector('#mega-menu-categorias a')?.focus());
            }
        };
        return (
            <li key={nombre} className="menu__categoria" data-abierto={abierta || undefined}>
                <Link
                    ref={(elemento) => {
                        enlacesRef.current[indice] = elemento;
                    }}
                    className="menu__categoria-enlace"
                    to={urlsCategoria(nombre).todo}
                    aria-haspopup="true"
                    aria-expanded={abierta}
                    aria-controls="mega-menu-categorias"
                    onMouseEnter={() => abrir(categoria)}
                    onFocus={() => abrir(categoria)}
                    onKeyDown={alTeclado}
                    onClick={cerrar}>
                    {etiquetaCortaCategoria(nombre)}
                </Link>
            </li>
        );
    });
}

function MegaMenu({ categoria, todasCategorias, posicion, reducido, panelRef, cancelarCierre, cerrar, onEscape }) {
    const destacados = useMemo(() => (categoria ? destacadosDe(categoria.libros) : []), [categoria]);
    const autores = useMemo(() => (categoria ? autoresConMasLibros(categoria.libros) : []), [categoria]);
    const series = useMemo(() => (categoria ? seriesDe(categoria.libros) : []), [categoria]);
    const seccionRelacionada = useMemo(() => {
        if (!categoria) return null;
        const nombre = CATEGORIA_DESTACADA_POR_SECCION[categoria.nombre];
        return nombre ? todasCategorias.find((opcion) => opcion.nombre === nombre) || null : null;
    }, [categoria, todasCategorias]);
    const relacionadas = useMemo(() => {
        if (!categoria) return [];
        return (CATEGORIAS_RELACIONADAS[categoria.nombre] || [])
            .map((nombre) => todasCategorias.find((opcion) => opcion.nombre === nombre))
            .filter(Boolean);
    }, [categoria, todasCategorias]);
    const colecciones = useMemo(() => {
        if (!categoria) return [];
        const { nombre, libros: lista } = categoria;
        const urls = urlsCategoria(nombre);
        return [
            { id: 'imprescindibles', titulo: `Imprescindibles de ${nombre}`, libros: destacadosDe(lista), to: urls.todo },
            { id: 'vendidos', titulo: 'Los más vendidos', libros: lista.filter((libro) => libro.masVendido), to: urls.todo },
            { id: 'nuevos', titulo: 'Novedades', libros: lista.filter((libro) => libro.esNuevo), to: urls.todo },
            { id: 'ofertas', titulo: 'Ofertas', libros: lista.filter((libro) => libro.descuento > 0), to: urls.ofertas },
            { id: 'stock', titulo: 'Disponible ahora', libros: lista.filter((libro) => libro.disponible), to: urls.stock }
        ]
            .filter((grupo) => grupo.libros.length > 0)
            .map((grupo) => ({ ...grupo, cantidad: grupo.libros.length, libros: grupo.libros.slice(0, 3) }));
    }, [categoria]);

    const bloquesCentrales = useMemo(() => {
        if (!categoria) return [];
        const ids = BLOQUES_POR_SECCION[categoria.nombre] || ['nuevos', 'ofertas'];
        return colecciones.filter((grupo) => grupo.id !== 'imprescindibles' && ids.includes(grupo.id));
    }, [categoria, colecciones]);

    const variantesPanel = {
        oculto: { opacity: 0, y: reducido ? 0 : -6, height: 0 },
        visible: { opacity: 1, y: 0, height: posicion.alto },
        salida: { opacity: 0, y: reducido ? 0 : -6, height: 0 }
    };
    const variantesColumna = {
        oculto: { opacity: 0, y: reducido ? 0 : 16 },
        visible: (indice) => ({
            opacity: 1,
            y: 0,
            transition: reducido ? { duration: 0 } : { duration: 0.42, delay: 0.08 + indice * 0.07, ease: EASE.salida }
        }),
        salida: { opacity: 0, y: reducido ? 0 : 8, transition: { duration: reducido ? 0 : 0.16, ease: EASE.suave } }
    };

    const { nombre = '', cantidad = 0, libros = [] } = categoria || {};
    const urls = urlsCategoria(nombre);
    const unidad = etiquetaCantidad(cantidad);
    const recomendado = destacados[0];

    return (
        <AnimatePresence>
            {categoria && posicion.ancho > 0 && (
                <motion.div
                key="mega-menu-categorias"
                ref={panelRef}
                id="mega-menu-categorias"
                role="region"
                aria-label={`Mega menú de ${nombre}`}
                className={`mega-menu${libros.length ? '' : ' mega-menu--vacio'}`}
                style={{
                    top: posicion.top,
                    left: posicion.left,
                    width: posicion.ancho,
                    backgroundColor: posicion.fondo,
                    transformOrigin: 'top center',
                    willChange: 'height, opacity, transform'
                }}
                variants={variantesPanel}
                initial={reducido ? false : 'oculto'}
                animate="visible"
                exit="salida"
                transition={reducido ? { duration: 0 } : { duration: 0.34, ease: EASE.salida }}
                onMouseEnter={cancelarCierre}
                onMouseLeave={cerrar}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        onEscape();
                    }
                }}>
                <motion.div
                    key={nombre}
                    className={`mega-menu__interno${libros.length ? '' : ' mega-menu__interno--vacio'}`}
                    variants={variantesColumna}
                    initial={reducido ? false : 'oculto'}
                    animate="visible"
                    exit="salida">
                    <motion.section
                        className="mega-menu__columna mega-menu__lateral"
                        aria-label={`Explorar ${nombre}`}
                        custom={0}
                        variants={variantesColumna}>
                        <div className="mega-menu__lateral-dos">
                            <div className="mega-menu__lateral-seccion">
                                {colecciones.length > 0 && (
                                    <div className="mega-menu__grupo">
                                        <h3>Colecciones</h3>
                                        <ul className="mega-menu__enlaces">
                                            {colecciones.map((grupo) => (
                                                <li key={grupo.id}>
                                                    <Link to={grupo.to} onClick={cerrar}>
                                                        <span>{grupo.titulo}</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {autores.length > 0 && (
                                    <div className="mega-menu__grupo">
                                        <h3>Autores destacados</h3>
                                        <ul className="mega-menu__enlaces">
                                            {autores.map((autor) => (
                                                <li key={autor.nombre}>
                                                    <Link
                                                        to={`/catalogo?categoria=${encodeURIComponent(nombre)}&q=${encodeURIComponent(autor.nombre)}`}
                                                        onClick={cerrar}>
                                                        <span>{autor.nombre}</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="mega-menu__lateral-seccion">
                                {series.length > 0 && (
                                    <div className="mega-menu__grupo">
                                        <h3>Series y sagas</h3>
                                        <ul className="mega-menu__enlaces">
                                            {series.map((serie) => (
                                                <li key={serie.nombre}>
                                                    <Link
                                                        to={`/catalogo?categoria=${encodeURIComponent(nombre)}&q=${encodeURIComponent(serie.nombre)}`}
                                                        onClick={cerrar}>
                                                        <span>{serie.nombre}</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="mega-menu__grupo">
                                    <h3>Otras secciones</h3>
                                    <ul className="mega-menu__enlaces">
                                        {relacionadas.map((opcion) => (
                                            <li key={opcion.nombre}>
                                                <Link to={urlsCategoria(opcion.nombre).todo} onClick={cerrar}>
                                                    <span>{opcion.nombre}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {libros.length > 0 && (
                        <>
                            <motion.section
                                className="mega-menu__columna mega-menu__central"
                                aria-label={`Selección destacada de ${nombre}`}
                                custom={1}
                                variants={variantesColumna}>
                                <div className="mega-menu__bloque">
                                    <p className="mega-menu__etiqueta">Selección destacada</p>
                                    <h3 className="mega-menu__subtitulo">Para empezar con {nombre}</h3>
                                    <ul className="mega-menu__destacados">
                                        {destacados.map((libro) => (
                                            <li key={libro.id}>
                                                <Link to={`/libro/${libro.id}`} onClick={cerrar}>
                                                    {libro.portada && <img src={libro.portada} alt="" width="72" height="108" loading="lazy" />}
                                                    <span className="mega-menu__destacado-cuerpo">
                                                        <strong>{libro.titulo}</strong>
                                                        {libro.autor && <small>{libro.autor}</small>}
                                                        {precioTexto(libro) && <b>{precioTexto(libro)}</b>}
                                                    </span>
                                                    <ChevronRight className="mega-menu__chevron" aria-hidden="true" />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {seccionRelacionada && seccionRelacionada.libros.length > 0 && (
                                    <div className="mega-menu__bloque">
                                        <div className="mega-menu__bloque-cabeza">
                                            <p className="mega-menu__etiqueta">{seccionRelacionada.nombre}</p>
                                            <small>{etiquetaCantidad(seccionRelacionada.cantidad)}</small>
                                        </div>
                                        <ul className="mega-menu__miniaturas">
                                            {seccionRelacionada.libros.slice(0, 3).map((libro) => (
                                                <li key={libro.id}>
                                                    <Link to={`/libro/${libro.id}`} onClick={cerrar}>
                                                        {libro.portada && <img src={libro.portada} alt="" loading="lazy" />}
                                                        <span>{libro.titulo}</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link
                                            className="mega-menu__ver mega-menu__ver--corto"
                                            to={urlsCategoria(seccionRelacionada.nombre).todo}
                                            onClick={cerrar}>
                                            Ver {seccionRelacionada.nombre.toLowerCase()}
                                        </Link>
                                    </div>
                                )}
                                {bloquesCentrales.map((grupo) => (
                                    <div className="mega-menu__bloque" key={grupo.id}>
                                        <div className="mega-menu__bloque-cabeza">
                                            <p className="mega-menu__etiqueta">{grupo.titulo}</p>
                                            <small>{grupo.cantidad}</small>
                                        </div>
                                        <ul className="mega-menu__miniaturas">
                                            {grupo.libros.map((libro) => (
                                                <li key={libro.id}>
                                                    <Link to={`/libro/${libro.id}`} onClick={cerrar}>
                                                        {libro.portada && <img src={libro.portada} alt="" loading="lazy" />}
                                                        <span>{libro.titulo}</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link className="mega-menu__ver mega-menu__ver--corto" to={grupo.to} onClick={cerrar}>
                                            Ver {grupo.titulo.toLowerCase()}
                                        </Link>
                                    </div>
                                ))}
                                <Link className="mega-menu__ver" to={urls.todo} onClick={cerrar}>
                                    Ver toda la selección de {nombre}
                                </Link>
                            </motion.section>

                            <motion.section
                                className="mega-menu__columna mega-menu__productos"
                                aria-label={`Libros de ${nombre}`}
                                custom={2}
                                variants={variantesColumna}>
                                <div className="mega-menu__cabeza-lista">
                                    <div>
                                        <p className="mega-menu__etiqueta">Catálogo</p>
                                        <h3 className="mega-menu__subtitulo">Libros de {nombre}</h3>
                                    </div>
                                    <span className="mega-menu__conteo">{cantidad}</span>
                                </div>
                                {recomendado && (
                                    <article className="mega-menu__recomendado">
                                        <p className="mega-menu__etiqueta">Recomendado en {nombre}</p>
                                        <Link to={`/libro/${recomendado.id}`} onClick={cerrar}>
                                            {recomendado.portada && <img src={recomendado.portada} alt="" width="82" height="123" loading="lazy" />}
                                            <span className="mega-menu__recomendado-cuerpo">
                                                <strong>{recomendado.titulo}</strong>
                                                {recomendado.autor && <small>{recomendado.autor}</small>}
                                                {resumenDe(recomendado) && <span>{resumenDe(recomendado)}</span>}
                                                {precioTexto(recomendado) && <b>{precioTexto(recomendado)}</b>}
                                            </span>
                                        </Link>
                                        <Link className="mega-menu__ver mega-menu__ver--corto" to={`/libro/${recomendado.id}`} onClick={cerrar}>
                                            Ver más
                                        </Link>
                                    </article>
                                )}
                                <ul className="mega-menu__rejilla">
                                    {libros.slice(0, 6).map((libro) => (
                                        <li key={libro.id}>
                                            <Link to={`/libro/${libro.id}`} onClick={cerrar}>
                                                <span className="mega-menu__portada">
                                                    {libro.portada && <img src={libro.portada} alt="" width="80" height="120" loading="lazy" />}
                                                </span>
                                                <strong>{libro.titulo}</strong>
                                                {libro.autor && <small>{libro.autor}</small>}
                                                {precioTexto(libro) && <b>{precioTexto(libro)}</b>}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <Link className="mega-menu__ver" to={urls.todo} onClick={cerrar}>
                                    Ver los {cantidad} {unidad} de {nombre}
                                </Link>
                            </motion.section>
                        </>
                    )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function CategoriasMovil({ categorias, abierta, alternar, cerrarMenu }) {
    return (
        <div className="cajon__categorias">
            <p>Categorías</p>
            <ul>
                {categorias.map(({ nombre, cantidad, libros }, indice) => {
                    const desplegada = abierta === nombre;
                    return (
                        <li key={nombre} className="cajon__categoria">
                            <button
                                type="button"
                                aria-expanded={desplegada}
                                aria-controls={`cajon-categoria-${indice}`}
                                onClick={() => alternar(nombre)}>
                                <span>{nombre}</span>
                                <small>{cantidad}</small>
                                <ChevronDown aria-hidden="true" />
                            </button>
                            {desplegada && (
                                <div className="cajon__categoria-contenido" id={`cajon-categoria-${indice}`}>
                                    <Link to={urlsCategoria(nombre).todo} onClick={cerrarMenu}>
                                        Ver todos los {cantidad} {etiquetaCantidad(cantidad)} de {nombre}
                                    </Link>
                                    {autoresConMasLibros(libros)
                                        .slice(0, 4)
                                        .map((autor) => (
                                            <Link
                                                key={autor.nombre}
                                                to={`/catalogo?categoria=${encodeURIComponent(nombre)}&q=${encodeURIComponent(autor.nombre)}`}
                                                onClick={cerrarMenu}>
                                                {autor.nombre} <span>{autor.cantidad}</span>
                                            </Link>
                                        ))}
                                    <ul className="cajon__categoria-libros">
                                        {libros.slice(0, 4).map((libro) => (
                                            <li key={libro.id}>
                                                <Link to={`/libro/${libro.id}`} onClick={cerrarMenu}>
                                                    {libro.portada && <img src={libro.portada} alt="" loading="lazy" />}
                                                    <span>{libro.titulo}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default function PublicHeader() {
    const tienda = useTienda();
    const unidades = tienda.items.reduce((s, i) => s + i.cantidad, 0);
    const verCarrito = Boolean(tienda.usuario) || unidades > 0;

    const todasCategorias = useMemo(() => {
        const grupos = new Map();
        for (const libro of tienda.libros) {
            const nombre = String(libro.categoria || '').trim();
            if (!nombre) continue;
            if (!grupos.has(nombre)) grupos.set(nombre, []);
            grupos.get(nombre).push(libro);
        }
        return [...grupos]
            .map(([nombre, libros]) => ({ nombre, cantidad: libros.length, libros: [...libros].sort(ordenLibrosDestacados) }))
            .sort((a, b) => prioridadCategoria(a.nombre) - prioridadCategoria(b.nombre) || b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));
    }, [tienda.libros]);

    const categorias = useMemo(() => todasCategorias.slice(0, 5), [todasCategorias]);

    const textoCarrito = unidades ? `Carrito (${unidades})` : 'Carrito';
    const reducido = useReducedMotion();
    const { pathname, search } = useLocation();
    const rutaActual = pathname + search;

    const [sombra, setSombra] = useState(false);
    const [abierto, setAbierto] = useState(false);
    const [categoriaMovil, setCategoriaMovil] = useState(null);
    const [megaAbierto, setMegaAbierto] = useState(null);
    const [posicionMega, setPosicionMega] = useState({ top: 0, left: 0, ancho: 0, alto: 0, fondo: '#ffffff' });

    const botonMenu = useRef(null);
    const primerEnlace = useRef(null);
    const navRef = useRef(null);
    const panelMegaRef = useRef(null);
    const enlacesCategoriaRef = useRef([]);
    const temporizadorCierre = useRef(null);
    const rutaAnterior = useRef(rutaActual);

    const cancelarCierre = useCallback(() => {
        if (temporizadorCierre.current) clearTimeout(temporizadorCierre.current);
        temporizadorCierre.current = null;
    }, []);

    const cerrar = useCallback(() => {
        cancelarCierre();
        setMegaAbierto(null);
    }, [cancelarCierre]);

    const cerrarDiferido = useCallback(() => {
        cancelarCierre();
        temporizadorCierre.current = setTimeout(() => setMegaAbierto(null), 160);
    }, [cancelarCierre]);

    const abrir = useCallback(
        (categoria) => {
            cancelarCierre();
            setMegaAbierto(categoria);
        },
        [cancelarCierre]
    );

    const actualizarPosicion = useCallback(() => {
        const nav = navRef.current;
        const lista = nav?.querySelector('ul');
        if (!nav || !lista) return;
        const rectanguloNav = nav.getBoundingClientRect();
        const margen = window.innerWidth <= 640 ? 12 : MARGEN_INFERIOR_MEGA;
        setPosicionMega({
            top: Math.round(rectanguloNav.bottom + 1),
            left: 0,
            ancho: document.documentElement.clientWidth,
            alto: Math.max(0, Math.round(window.innerHeight - rectanguloNav.bottom - 1 - margen)),
            fondo: getComputedStyle(nav).backgroundColor || '#ffffff'
        });
    }, []);

    useLayoutEffect(() => {
        if (!megaAbierto) return undefined;
        actualizarPosicion();
        window.addEventListener('resize', actualizarPosicion);
        window.addEventListener('scroll', actualizarPosicion, { passive: true });
        return () => {
            window.removeEventListener('resize', actualizarPosicion);
            window.removeEventListener('scroll', actualizarPosicion);
        };
    }, [megaAbierto, actualizarPosicion]);

    useEffect(() => {
        const alScroll = () => setSombra(window.scrollY > 90);
        alScroll();
        window.addEventListener('scroll', alScroll, { passive: true });
        return () => window.removeEventListener('scroll', alScroll);
    }, []);

    useEffect(() => {
        if (rutaAnterior.current === rutaActual) return;
        rutaAnterior.current = rutaActual;
        cerrar();
        setAbierto(false);
        setCategoriaMovil(null);
    }, [rutaActual, cerrar]);

    useEffect(() => {
        if (!megaAbierto) return undefined;
        const alPuntero = (e) => {
            if (!navRef.current?.contains(e.target) && !panelMegaRef.current?.contains(e.target)) cerrar();
        };
        const alEnfocar = (e) => {
            if (!navRef.current?.contains(e.target) && !panelMegaRef.current?.contains(e.target)) cerrar();
        };
        document.addEventListener('pointerdown', alPuntero);
        document.addEventListener('focusin', alEnfocar);
        return () => {
            document.removeEventListener('pointerdown', alPuntero);
            document.removeEventListener('focusin', alEnfocar);
        };
    }, [megaAbierto, cerrar]);

    useEffect(() => cancelarCierre, [cancelarCierre]);

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

    const volverAlEnlace = () => {
        const indice = categorias.findIndex((categoria) => categoria.nombre === megaAbierto?.nombre);
        cerrar();
        requestAnimationFrame(() => enlacesCategoriaRef.current[indice]?.focus());
    };

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
                    <nav
                        ref={navRef}
                        className="menu"
                        aria-label="Principal"
                        onMouseEnter={cancelarCierre}
                        onMouseLeave={cerrarDiferido}>
                        <ul className="contenedor">
                            {ENLACE_INICIO && (
                                <li key={ENLACE_INICIO.ruta}>
                                    <NavLink to={ENLACE_INICIO.ruta} end={ENLACE_INICIO.ruta === '/'}>
                                        {ENLACE_INICIO.texto}
                                    </NavLink>
                                </li>
                            )}
                            <MenuCategorias
                                categorias={categorias}
                                activa={megaAbierto}
                                abrir={abrir}
                                cerrar={cerrar}
                                enlacesRef={enlacesCategoriaRef}
                            />
                            {ENLACES_RESTO.map(({ ruta, texto, destacado }) => (
                                <li key={ruta}>
                                    <NavLink to={ruta} end={ruta === '/'} data-destacado={destacado || undefined} onClick={cerrar}>
                                        {texto}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </header>
            </div>

            <MegaMenu
                categoria={megaAbierto}
                todasCategorias={todasCategorias}
                posicion={posicionMega}
                reducido={reducido}
                panelRef={panelMegaRef}
                cancelarCierre={cancelarCierre}
                cerrar={cerrar}
                onEscape={volverAlEnlace}
            />

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
                                        <CategoriasMovil
                                            categorias={todasCategorias}
                                            abierta={categoriaMovil}
                                            alternar={(nombre) => setCategoriaMovil((actual) => (actual === nombre ? null : nombre))}
                                            cerrarMenu={() => setAbierto(false)}
                                        />
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
