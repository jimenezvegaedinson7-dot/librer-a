import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowDown, FaArrowRight } from 'react-icons/fa6';
import { PrecioOferta } from '../../componentes/PrecioOferta';
import LibroInicial from '../LibroInicial';
import { urlPortada } from '../../lib/formato';
import { precargarImagenes } from '../../lib/cacheRecursos';
import { estadoCinematico } from './cinematografia';
import './portada3d.css';

const cargarEscena = () => import('./escenaLibro');

const cargarMovimiento = () => import('../../animacion/scroll');

const tramo = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

const campana = (p, a, b, c, d) => Math.min(tramo(p, a, b), 1 - tramo(p, c, d));

const suave = (p) => p * p * (3 - 2 * p);

function ultimosAgregados(libros = []) {
    const fecha = (libro) => Date.parse(libro.creadoEn) || 0;
    return [...libros]
        .filter((libro) => libro.estado === 1 && urlPortada(libro.portada) && libro.precio > 0)
        .sort((a, b) => fecha(b) - fecha(a) || b.id - a.id)
        .slice(0, 5);
}

function Recientes({ libros, protagonista = null, enEscena = false }) {
    const ordenados = ultimosAgregados(libros);
    const recientes = protagonista && enEscena ? [protagonista, ...ordenados.filter((libro) => libro.id !== protagonista.id)].slice(0, 5) : ordenados;
    if (!recientes.length) return null;
    const muestra = enEscena ? [recientes[3], recientes[1], recientes[0], recientes[2], recientes[4]].filter(Boolean) : recientes;
    const medio = (muestra.length - 1) / 2;
    return (
        <section className={enEscena ? 'portada3d__escena-libros' : 'portada-unica__recientes portada3d__ultimos'} aria-label="Últimos libros agregados">
            {enEscena ? <p className="portada3d__escena-libros-titulo">Últimos libros agregados</p> : <h2>Últimos libros agregados</h2>}
            <div className={enEscena ? 'portada3d__apilar' : 'portada-unica__rejilla'} role="list" data-final="true">
                {muestra.map((libro, i) => (
                    <article
                        key={libro.id}
                        className={enEscena ? 'portada3d__apilar-item' : 'portada-unica__reciente'}
                        role="listitem"
                        style={enEscena ? { '--lado': i - medio, '--orden': Math.abs(i - medio) } : undefined}>
                        <Link to={`/libro/${libro.id}`} className="portada3d__apilar-link">
                            <div className="portada3d__apilar-tapa">
                                <img src={urlPortada(libro.portada, 320)} alt={`Portada de ${libro.titulo}`} width="160" height="240" loading="lazy" decoding="async" />
                                {libro.descuento > 0 && <span className="portada3d__apilar-descuento">-{libro.descuento}%</span>}
                            </div>
                            <div className="portada3d__apilar-info">
                                <h3 className="portada3d__apilar-titulo">{libro.titulo}</h3>
                                {!enEscena && libro.autor && <p className="portada3d__apilar-autor">{libro.autor}</p>}
                                <PrecioOferta libro={libro} clase="portada3d__apilar-precio" />
                            </div>
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}

function FichaLibro({ libro, fichaRef }) {
    return (
        <div className="portada3d__ficha portada3d__ficha--flotante" ref={fichaRef}>
            <h2 className="portada3d__libro-titulo">{libro.titulo}</h2>
            {libro.autor && <p className="portada3d__autor">{libro.autor}</p>}
            <PrecioOferta libro={libro} clase="portada3d__precio" />
            <p className={`portada3d__stock ${libro.disponible ? '' : 'portada3d__stock--agotado'}`}>
                {libro.disponible ? `Disponible · ${libro.stock} ${libro.stock === 1 ? 'ejemplar' : 'ejemplares'}` : 'Agotado por ahora'}
            </p>
            {libro.sinopsis && <p className="portada3d__sinopsis">{libro.sinopsis}</p>}
            <Link to={`/libro/${libro.id}`} className="portada3d__boton">
                Ver este libro <FaArrowRight aria-hidden="true" />
            </Link>
        </div>
    );
}

function contornoProyectado(puntos) {
    const ordenados = [...puntos].sort((a, b) => a.x - b.x || a.y - b.y);
    const cruz = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const mitad = (lista) => {
        const resultado = [];
        for (const punto of lista) {
            while (resultado.length > 1 && cruz(resultado.at(-2), resultado.at(-1), punto) <= 0) resultado.pop();
            resultado.push(punto);
        }
        return resultado.slice(0, -1);
    };
    return [...mitad(ordenados), ...mitad([...ordenados].reverse())];
}

function soportaWebGL() {
    try {
        const contexto = document.createElement('canvas').getContext('webgl2');
        contexto?.getExtension('WEBGL_lose_context')?.loseContext();
        return Boolean(contexto);
    } catch {
        return false;
    }
}

export default function PortadaEspacial({ reducido, protagonista, recientes = [] }) {
    const { cargando, libro, crudo, error, reintentar } = protagonista;
    const [webgl] = useState(soportaWebGL);
    const mediaEstatica = '(max-height: 600px), (max-width: 360px) and (max-height: 740px)';
    const [pantallaBaja, setPantallaBaja] = useState(() => window.matchMedia(mediaEstatica).matches);
    const [fallo, setFallo] = useState(false);
    const conexion = navigator.connection;
    const modo3d = webgl && !reducido && !pantallaBaja && !conexion?.saveData && !/(^|-)2g$/.test(conexion?.effectiveType || '');
    const reservaEspacial = modo3d && (cargando || Boolean(libro));
    const espacial = reservaEspacial && !fallo;
    const idLibro = libro?.id;
    const tituloLibro = libro?.titulo;
    const autorLibro = libro?.autor;
    const portadaLibro = crudo?.portada;
    const clave = JSON.stringify([espacial, idLibro, portadaLibro, tituloLibro, autorLibro]);
    const [preparacion, setPreparacion] = useState({ clave, lista: false });
    if (preparacion.clave !== clave) setPreparacion({ clave, lista: false });
    const lista = espacial && preparacion.clave === clave && preparacion.lista;
    const seccion = useRef(null);
    const lienzo = useRef(null);
    const tituloRef = useRef(null);
    const lemaRef = useRef(null);
    const fichaRef = useRef(null);
    const finalRef = useRef(null);
    const pistaRef = useRef(null);
    const compraRef = useRef(null);
    const motor = useRef(null);
    const [escenario, setEscenario] = useState(null);

    useEffect(() => {
        const media = window.matchMedia(mediaEstatica);
        const actualizar = () => setPantallaBaja(media.matches);
        media.addEventListener('change', actualizar);
        return () => media.removeEventListener('change', actualizar);
    }, []);

    useLayoutEffect(() => {
        const sec = seccion.current;
        const cabecera = document.querySelector('.cabecera');
        const navegacion = document.querySelector('.navegacion-publica');
        const sitio = sec.closest('.sitio');
        const barra = document.querySelector('.barra-movil');
        const medir = () => {
            const altura = navegacion?.offsetHeight || cabecera?.offsetHeight || 0;
            sec.style.setProperty('--cabecera', `${altura}px`);
            const fija = barra && getComputedStyle(barra).display !== 'none' && ['fixed', 'sticky'].includes(getComputedStyle(barra).position);
            sec.style.setProperty('--barra', `${fija ? barra.offsetHeight : 0}px`);
            sitio?.style.setProperty('--altura-nav', `${altura}px`);
        };
        if (sitio) {
            sitio.style.setProperty('--revelar-nav', '1');
            for (const fase of ['linea', 'cuerpo', 'enlaces']) sitio.style.setProperty(`--nav-${fase}`, '1');
            sitio.dataset.navVisible = 'true';
        }
        medir();
        const observador = new ResizeObserver(medir);
        for (const nodo of [cabecera, navegacion, barra]) if (nodo) observador.observe(nodo);
        window.addEventListener('resize', medir);
        return () => {
            observador.disconnect();
            window.removeEventListener('resize', medir);
            for (const propiedad of ['--altura-nav', '--revelar-nav', '--nav-linea', '--nav-cuerpo', '--nav-enlaces']) sitio?.style.removeProperty(propiedad);
            if (sitio) delete sitio.dataset.navVisible;
        };
    }, []);

    useEffect(() => {
        if (!espacial || cargando || !idLibro || !portadaLibro || !escenario || !lienzo.current) return undefined;
        const sec = seccion.current;
        const canvas = lienzo.current;
        let vivo = true,
            escena = null,
            marco = 0,
            visible = true,
            controlScroll = null,
            ultimoCuadro = 0,
            ultimoProgreso = null,
            cajaTitulo = null,
            ultimoRecorte = '';
        let presentada = false,
            recientesPreparados = false;
        const limpiar = [];
        const estilo = getComputedStyle(tituloRef.current);
        const fuentes = document.fonts
            ? Promise.all([document.fonts.load(`${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`), document.fonts.load('400 16px "Work Sans"')]).catch(() => {})
            : Promise.resolve();
        const compacto = window.matchMedia('(max-width: 900px)').matches;
        const movil = compacto || window.matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4 || navigator.hardwareConcurrency <= 4;
        const aplicar = (p) => {
            sec.style.setProperty('--recorrido', p.toFixed(4));
            const estado = estadoCinematico(p);
            const op = (ref, valor, y = 0) => {
                if (!ref.current) return;
                ref.current.style.opacity = valor.toFixed(3);
                ref.current.style.setProperty('--desplazamiento', `${y.toFixed(1)}px`);
                ref.current.style.visibility = valor < 0.01 ? 'hidden' : 'visible';
            };
            const titulo = 1 - suave(tramo(p, 0.02, 0.12));
            op(tituloRef, titulo, -40 * (1 - titulo));
            op(lemaRef, titulo * (1 - tramo(p, 0.08, 0.2)), -20 * (1 - titulo));
            op(pistaRef, 1 - tramo(p, 0.02, 0.08));
            op(compraRef, 1 - suave(tramo(p, 0.12, 0.2)));
            const ficha = suave(campana(p, 0.18, 0.26, 0.42, 0.5));
            op(fichaRef, ficha, 24 * (1 - ficha));
            op(finalRef, estado.presentacionFinal, 24 * (1 - estado.presentacionFinal));
            if (finalRef.current) finalRef.current.inert = estado.presentacionFinal < 0.05;
            finalRef.current?.style.setProperty('--formar', estado.presentacionFinal.toFixed(4));
            finalRef.current?.style.setProperty('--libros', suave(tramo(p, 0.76, 0.9)).toFixed(4));
            if (!recientesPreparados && p > 0.4) {
                recientesPreparados = true;
                finalRef.current?.querySelectorAll('img').forEach((imagen) => {
                    imagen.loading = 'eager';
                });
            }
        };
        const preparar = async () => {
            try {
                const [{ default: EscenaLibro }, { ScrollTrigger }] = await Promise.all([cargarEscena(), cargarMovimiento()]);
                if (!vivo || !canvas.isConnected) return;
                const limite = setTimeout(() => vivo && setFallo(true), 10000);
                limpiar.push(() => clearTimeout(limite));
                escena = new EscenaLibro(canvas, {
                    portadaUrl: urlPortada(portadaLibro, 1024),
                    titulo: tituloLibro,
                    autor: autorLibro,
                    movil,
                    compacto,
                    alDibujar: (puntos, ancho, alto) => {
                        if (!vivo || !tituloRef.current || !cajaTitulo || !ancho || !alto) return;
                        const titulo = tituloRef.current;
                        const desplazamiento = parseFloat(titulo.style.getPropertyValue('--desplazamiento')) || 0;
                        const superior = cajaTitulo.top + desplazamiento;
                        const xs = puntos.map((punto) => punto.x),
                            ys = puntos.map((punto) => punto.y);
                        if (
                            Math.max(...xs) < cajaTitulo.left ||
                            Math.min(...xs) > cajaTitulo.left + cajaTitulo.width ||
                            Math.max(...ys) < superior ||
                            Math.min(...ys) > superior + cajaTitulo.height
                        ) {
                            if (ultimoRecorte) titulo.style.removeProperty('clip-path');
                            ultimoRecorte = '';
                            return;
                        }
                        const contorno = contornoProyectado(puntos.map((punto) => ({ x: punto.x - cajaTitulo.left, y: punto.y - superior })));
                        const agujero = contorno.map((punto, i) => `${i ? 'L' : 'M'}${punto.x.toFixed(1)} ${punto.y.toFixed(1)}`).join(' ');
                        const recorte = `path(evenodd, "M0 0 H${cajaTitulo.width} V${cajaTitulo.height} H0 Z ${agujero} Z")`;
                        if (recorte !== ultimoRecorte) titulo.style.clipPath = recorte;
                        ultimoRecorte = recorte;
                    },
                    alCargarPortada: (correcta) => {
                        if (vivo) {
                            if (!correcta) setFallo(true);
                        }
                    }
                });
                escena.setEntrada(1);
                motor.current = escena;
                const medir = () => {
                    if (!vivo || !escenario.isConnected) return;
                    const caja = escenario.getBoundingClientRect();
                    if (escena.ancho !== caja.width || escena.alto !== caja.height) escena.redimensionar(caja.width, caja.height);
                    const titulo = tituloRef.current.getBoundingClientRect();
                    const desplazamiento = parseFloat(tituloRef.current.style.getPropertyValue('--desplazamiento')) || 0;
                    cajaTitulo = { left: titulo.left - caja.left, top: titulo.top - caja.top - desplazamiento, width: titulo.width, height: titulo.height };
                };
                medir();
                const [preparada] = await Promise.all([escena.preparar(), fuentes]);
                if (!vivo || !preparada) return;
                medir();
                const observador = new ResizeObserver(medir);
                observador.observe(escenario);
                limpiar.push(() => observador.disconnect());
                controlScroll = ScrollTrigger.create({
                    trigger: sec,
                    start: 'top top',
                    end: 'bottom bottom',
                    invalidateOnRefresh: true,
                    onUpdate: (control) => escena.setProgreso(control.progress)
                });
                aplicar(0);
                const bucle = (ahora) => {
                    marco = 0;
                    if (!vivo || !visible || document.hidden || !escenario.isConnected) return;
                    try {
                        const intervalo = 1000 / 30;
                        if (!escena.software || ahora - ultimoCuadro >= intervalo - 0.5) {
                            const estado = escena.dibujar();
                            ultimoCuadro = escena.software ? ahora - ((ahora - ultimoCuadro) % intervalo) : ahora;
                            if (estado && ultimoProgreso !== estado.p) {
                                aplicar(estado.p);
                                ultimoProgreso = estado.p;
                            }
                            if (!presentada && estado) {
                                presentada = true;
                                clearTimeout(limite);
                                setPreparacion((anterior) => (anterior.clave === clave ? { clave, lista: true } : anterior));
                                precargarImagenes([urlPortada(portadaLibro, 1024)]);
                                const activar = setTimeout(() => {
                                    if (vivo) escena.setAnimando(true);
                                }, 200);
                                limpiar.push(() => clearTimeout(activar));
                                requestAnimationFrame(() => vivo && ScrollTrigger.refresh());
                            }
                        }
                    } catch {
                        setFallo(true);
                        return;
                    }
                    marco = requestAnimationFrame(bucle);
                };
                const arrancar = () => {
                    if (!marco && vivo && visible && !document.hidden) marco = requestAnimationFrame(bucle);
                };
                const perderContexto = (evento) => {
                    evento.preventDefault();
                    if (vivo) setFallo(true);
                };
                canvas.addEventListener('webglcontextlost', perderContexto);
                limpiar.push(() => canvas.removeEventListener('webglcontextlost', perderContexto));
                const mover = (evento) => {
                    if (!vivo || !escenario.isConnected) return;
                    const caja = escenario.getBoundingClientRect();
                    if (caja.width && caja.height) escena.setPuntero(((evento.clientX - caja.left) / caja.width) * 2 - 1, ((evento.clientY - caja.top) / caja.height) * 2 - 1);
                };
                window.addEventListener('pointermove', mover, { passive: true });
                limpiar.push(() => window.removeEventListener('pointermove', mover));
                const interseccion = new IntersectionObserver(([entrada]) => {
                    visible = entrada.isIntersecting;
                    if (visible) ultimoProgreso = null;
                    arrancar();
                });
                interseccion.observe(escenario);
                limpiar.push(() => interseccion.disconnect());
                document.addEventListener('visibilitychange', arrancar);
                limpiar.push(() => document.removeEventListener('visibilitychange', arrancar));
                arrancar();
                requestAnimationFrame(() => vivo && ScrollTrigger.refresh());
            } catch {
                if (vivo) setFallo(true);
            }
        };
        const espera = window.requestIdleCallback ? window.requestIdleCallback(preparar, { timeout: 500 }) : window.setTimeout(preparar, 0);
        return () => {
            vivo = false;
            if (window.cancelIdleCallback) window.cancelIdleCallback(espera);
            else window.clearTimeout(espera);
            cancelAnimationFrame(marco);
            controlScroll?.kill();
            limpiar.forEach((terminar) => terminar());
            escena?.destruir();
            motor.current = null;
            for (const ref of [tituloRef, lemaRef, compraRef, pistaRef]) {
                for (const propiedad of ['opacity', 'visibility', '--desplazamiento', 'clip-path']) ref.current?.style.removeProperty(propiedad);
            }
        };
    }, [espacial, cargando, idLibro, tituloLibro, autorLibro, portadaLibro, escenario, clave]);

    return (
        <section
            ref={seccion}
            className={`portada3d portada-unica ${reservaEspacial ? 'portada3d--3d' : ''} ${!espacial ? 'portada3d--estatica' : ''} ${lista ? 'portada3d--lista' : ''}`}
            aria-busy={cargando && !libro}
            aria-label={libro ? `Portada de MATIDANA Libros y Cultura con el libro destacado: ${libro.titulo}` : 'Portada de MATIDANA Libros y Cultura'}>
            <h1 className="sr-only">Libros y anuncios de MATIDANA Libros y Cultura</h1>
            <div ref={setEscenario} className="portada3d__escenario">
                {espacial && libro && <canvas ref={lienzo} className="portada3d__lienzo" aria-hidden="true" />}
                {libro && <LibroInicial key={`${libro.id}:${libro.portada}`} libro={libro} escenario={escenario} />}
                <div className="portada3d__presentacion">
                    <div ref={tituloRef} className="portada3d__titulo" aria-hidden="true">
                        <span>MATIDANA</span>
                        <span>Libros y Cultura</span>
                    </div>
                    <div ref={compraRef} className="portada3d__acceso portada3d__ficha">
                        <h2 className="portada3d__acceso-titulo portada3d__libro-titulo" aria-hidden={!libro}>
                            {libro?.titulo || ''}
                        </h2>
                        <span className="portada3d__autor" aria-hidden={!libro?.autor}>
                            {libro?.autor || ''}
                        </span>
                        {libro ? <PrecioOferta libro={libro} clase="portada3d__precio" /> : <span className="precio portada3d__precio" aria-hidden="true" />}
                        <Link to={libro ? `/libro/${libro.id}` : '/catalogo'} className="portada3d__boton">
                            {libro ? 'Ver este libro' : 'Ver catálogo'} <FaArrowRight aria-hidden="true" />
                        </Link>
                        <p className="portada-unica__estado" role="status">
                            {cargando && !libro ? (
                                'Cargando el libro destacado…'
                            ) : error ? (
                                <>
                                    No pudimos actualizar el libro.{' '}
                                    <button type="button" onClick={reintentar}>
                                        Reintentar
                                    </button>
                                </>
                            ) : (
                                ''
                            )}
                        </p>
                    </div>
                </div>
                <p ref={lemaRef} className="portada3d__lema portada3d__lema--flotante">
                    Historias que abren otros mundos.
                </p>
                {espacial && libro && (
                    <>
                        <FichaLibro libro={libro} fichaRef={fichaRef} />
                        <div ref={finalRef} className="portada3d__final">
                            <Recientes libros={recientes} protagonista={libro} enEscena />
                            <Link to="/catalogo" className="portada3d__boton">
                                Ver catálogo <FaArrowRight aria-hidden="true" />
                            </Link>
                        </div>
                        <p ref={pistaRef} className="portada3d__pista" aria-hidden="true">
                            <FaArrowDown /> Desliza para descubrir
                        </p>
                    </>
                )}
            </div>
            {!espacial && <Recientes libros={recientes} />}
        </section>
    );
}
