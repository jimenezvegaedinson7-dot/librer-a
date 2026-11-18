import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PrecioOferta } from '../../PrecioOferta';
import LibroInicial from '../LibroInicial';
import { urlPortada } from '../../../../services/web/formato';
import { precargarImagenes } from '../../../../services/web/cacheRecursos';
import logoCarga from '../../../../assets/compartido/logo-f-blanco-96.webp';
import { estadoCinematico } from './cinematografia';
import './portada3d.css';
import './portada-mapa.css';
import './atelier-nocturno.css';

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
                        className={enEscena ? `portada3d__apilar-item${libro.id === protagonista?.id ? ' portada3d__apilar-item--central' : ''}` : 'portada-unica__reciente'}
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
                Ver este libro
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

function actualizarConexiones(conexiones, cubierta, identidad, lectura) {
    if (!conexiones || !cubierta || !identidad || !lectura) return;
    const svg = conexiones.getBoundingClientRect();
    const libro = cubierta.getBoundingClientRect();
    if (!svg.width || !svg.height || !libro.width || !libro.height) return;
    const convertir = (x, y) => ({
        x: ((x - svg.left) / svg.width) * 1000,
        y: ((y - svg.top) / svg.height) * 650
    });
    const tomar = (elemento, lado) => {
        const r = elemento.getBoundingClientRect();
        if (lado === 'derecha') return { x: r.right + 14, y: r.top + r.height * 0.45 };
        if (lado === 'izquierda') return { x: r.left - 14, y: r.top + r.height * 0.45 };
        return { x: r.left + r.width / 2, y: r.bottom + 8 };
    };
    const curva = (a, b, eje) => {
        const inicio = { x: +a.x.toFixed(1), y: +a.y.toFixed(1) };
        const fin = { x: +b.x.toFixed(1), y: +b.y.toFixed(1) };
        if (eje === 'y') {
            const t = (fin.y - inicio.y) * 0.45;
            return `M${inicio.x} ${inicio.y} C${inicio.x} ${(inicio.y + t).toFixed(1)} ${fin.x} ${(fin.y - t).toFixed(1)} ${fin.x} ${fin.y}`;
        }
        const t = (fin.x - inicio.x) * 0.45;
        return `M${inicio.x} ${inicio.y} C${(inicio.x + t).toFixed(1)} ${inicio.y} ${(fin.x - t).toFixed(1)} ${fin.y} ${fin.x} ${fin.y}`;
    };
    const dibujar = (nombre, inicio, fin, eje) => {
        const a = convertir(inicio.x, inicio.y);
        const b = convertir(fin.x, fin.y);
        const d = curva(a, b, eje);
        conexiones.querySelectorAll(`[data-rama="${nombre}"]`).forEach((path) => path.setAttribute('d', d));
        const nodo = conexiones.querySelector(`[data-nodo="${nombre}"]`);
        if (nodo) {
            nodo.setAttribute('cx', a.x.toFixed(1));
            nodo.setAttribute('cy', a.y.toFixed(1));
        }
        const punto = conexiones.querySelector(`[data-punto="${nombre}"]`);
        if (punto) {
            punto.setAttribute('cx', b.x.toFixed(1));
            punto.setAttribute('cy', b.y.toFixed(1));
        }
    };
    const centroY = libro.top + libro.height * 0.45;
    const identidadInicio = tomar(identidad, 'derecha');
    const lecturaInicio = tomar(lectura, 'izquierda');
    const tituloFin = { x: Math.max(libro.left - 14, identidadInicio.x + 14), y: centroY };
    const lecturaFin = { x: Math.min(libro.right + 14, lecturaInicio.x - 14), y: centroY };
    dibujar('titulo', identidadInicio, tituloFin, 'x');
    dibujar('lectura', lecturaInicio, lecturaFin, 'x');
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
    const conexionesRef = useRef(null);
    const motor = useRef(null);
    const [escenario, setEscenario] = useState(null);

    useEffect(() => {
        if (!espacial || lista) return undefined;
        let temporizador;
        const vigilar = () => {
            window.clearTimeout(temporizador);
            if (document.hidden) return;
            temporizador = window.setTimeout(() => setFallo(true), 10000);
        };
        vigilar();
        document.addEventListener('visibilitychange', vigilar);
        return () => {
            window.clearTimeout(temporizador);
            document.removeEventListener('visibilitychange', vigilar);
        };
    }, [espacial, clave, lista]);

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

    useLayoutEffect(() => {
        if (!libro || !escenario) return undefined;
        let vivo = true;
        const actualizar = () => actualizarConexiones(conexionesRef.current, document.querySelector('.portada-unica__cubierta'), tituloRef.current, compraRef.current);
        actualizar();
        const observador = new ResizeObserver(actualizar);
        for (const nodo of [escenario, document.querySelector('.portada-unica__cubierta'), lemaRef.current, tituloRef.current, compraRef.current]) if (nodo) observador.observe(nodo);
        window.addEventListener('resize', actualizar);
        document.fonts?.ready.then(() => { if (vivo) actualizar(); });
        return () => {
            vivo = false;
            observador.disconnect();
            window.removeEventListener('resize', actualizar);
        };
    }, [libro, escenario]);

    useEffect(() => {
        if (!espacial || cargando || !idLibro || !portadaLibro || !escenario || !lienzo.current) return undefined;
        const sec = seccion.current;
        const canvas = lienzo.current;
        const acceso = compraRef.current;
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
            sec.style.setProperty('--opacidad-libro', (1 - estado.disolucion).toFixed(4));
            const op = (ref, valor, y = 0) => {
                if (!ref.current) return;
                ref.current.style.opacity = valor.toFixed(3);
                ref.current.style.setProperty('--desplazamiento', `${y.toFixed(1)}px`);
                ref.current.style.visibility = valor < 0.01 ? 'hidden' : 'visible';
            };
            const mapa = 1 - suave(tramo(p, 0.06, 0.2));
            op(tituloRef, mapa, 10 * (1 - mapa));
            op(lemaRef, mapa, -8 * (1 - mapa));
            op(conexionesRef, mapa);
            op(pistaRef, 1 - tramo(p, 0.02, 0.08));
            op(compraRef, mapa, 8 * (1 - mapa));
            if (compraRef.current) compraRef.current.inert = mapa < 0.05;
            const ficha = suave(campana(p, 0.18, 0.26, 0.42, 0.5));
            op(fichaRef, ficha, 24 * (1 - ficha));
            op(finalRef, estado.presentacionFinal);
            if (finalRef.current) finalRef.current.inert = estado.presentacionFinal < 0.5;
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
                    const final = finalRef.current;
                    const tapaFinal = final?.querySelector('.portada3d__apilar-item--central .portada3d__apilar-tapa');
                    if (tapaFinal) {
                        const libros = final.style.getPropertyValue('--libros');
                        final.style.setProperty('--libros', '1');
                        const destino = tapaFinal.getBoundingClientRect();
                        escena.setDestinoFinal({ x: destino.left - caja.left + destino.width / 2, y: destino.top - caja.top + destino.height / 2, ancho: destino.width, alto: destino.height });
                        if (libros) final.style.setProperty('--libros', libros);
                        else final.style.removeProperty('--libros');
                    }
                };
                medir();
                const [preparada] = await Promise.all([escena.preparar(), fuentes]);
                if (!vivo || !preparada) return;
                medir();
                const observador = new ResizeObserver(medir);
                observador.observe(escenario);
                if (finalRef.current?.firstElementChild) observador.observe(finalRef.current.firstElementChild);
                limpiar.push(() => observador.disconnect());
                if (finalRef.current) {
                    const cambiosRecientes = new MutationObserver(medir);
                    cambiosRecientes.observe(finalRef.current, { childList: true, subtree: true });
                    limpiar.push(() => cambiosRecientes.disconnect());
                }
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
                                if (vivo) escena.setAnimando(true);
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
        const espera = window.requestAnimationFrame ? window.requestAnimationFrame(preparar) : window.setTimeout(preparar, 0);
        return () => {
            vivo = false;
            if (window.cancelAnimationFrame) window.cancelAnimationFrame(espera);
            else window.clearTimeout(espera);
            cancelAnimationFrame(marco);
            controlScroll?.kill();
            limpiar.forEach((terminar) => terminar());
            escena?.destruir();
            motor.current = null;
            for (const propiedad of ['--opacidad-libro', '--recorrido']) sec.style.removeProperty(propiedad);
            if (acceso) acceso.inert = false;
            for (const ref of [tituloRef, lemaRef, compraRef, pistaRef, conexionesRef]) {
                for (const propiedad of ['opacity', 'visibility', '--desplazamiento', 'clip-path']) ref.current?.style.removeProperty(propiedad);
            }
        };
    }, [espacial, cargando, idLibro, tituloLibro, autorLibro, portadaLibro, escenario, clave]);

    return (
        <section
            ref={seccion}
            className={`portada3d portada-unica ${reservaEspacial ? 'portada3d--3d' : ''} ${!espacial ? 'portada3d--estatica' : ''} ${fallo ? 'portada3d--respaldo' : ''} ${lista ? 'portada3d--lista' : ''}`}
            aria-busy={cargando && !libro}
            aria-label={libro ? `Portada de MATIDANA Libros y Cultura con el libro destacado: ${libro.titulo}` : 'Portada de MATIDANA Libros y Cultura'}>
            <h1 className="sr-only">Libros y anuncios de MATIDANA Libros y Cultura</h1>
            <div ref={setEscenario} className="portada3d__escenario">
                {libro && (
                    <svg ref={conexionesRef} className="portada-mapa__conexiones" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                        <g className="portada-mapa__halos">
                            <path data-rama="lectura" d="M790 325H762" />
                            <path data-rama="titulo" d="M210 325H238" />
                        </g>
                        <g className="portada-mapa__trazos">
                            <path data-rama="lectura" className="portada-mapa__rama portada-mapa__rama--lectura" pathLength="1" d="M790 325H762" />
                            <path data-rama="titulo" className="portada-mapa__rama portada-mapa__rama--titulo" pathLength="1" d="M210 325H238" />
                        </g>
                        <g className="portada-mapa__nodulos">
                            <circle data-nodo="lectura" cx="790" cy="325" r="4" />
                            <circle data-nodo="titulo" cx="210" cy="325" r="4" />
                        </g>
                        <g className="portada-mapa__puntos">
                            <circle data-punto="lectura" cx="762" cy="325" r="2.5" />
                            <circle data-punto="titulo" cx="238" cy="325" r="2.5" />
                        </g>
                    </svg>
                )}
                {espacial && libro && <canvas ref={lienzo} className="portada3d__lienzo" aria-hidden="true" />}
                {libro && <LibroInicial key={`${libro.id}:${libro.portada}`} libro={libro} escenario={escenario} />}
                <div className="portada3d__presentacion portada-mapa">
                    {espacial && cargando && !libro && (
                        <div className="portada3d__cargando" aria-hidden="true">
                            <img className="portada3d__cargando-logo" src={logoCarga} alt="" />
                            <span className="portada3d__spinner" />
                            <span className="portada3d__cargando-texto">Preparando la portada…</span>
                        </div>
                    )}
                    <div ref={lemaRef} className="portada-mapa__autor">
                        {libro?.autor && <><span className="portada-mapa__etiqueta">Autor</span><p className="portada3d__autor">{libro.autor}</p></>}
                    </div>
                    <div ref={tituloRef} className="portada3d__titulo portada-mapa__identidad">
                        <h2 className="portada3d__acceso-titulo portada3d__libro-titulo" aria-hidden={!libro}>
                            {libro?.titulo || ''}
                        </h2>
                        {libro?.categoria && <p className="portada-mapa__categoria"><span>Categoría</span><strong>{libro.categoria}</strong></p>}
                    </div>
                    <div ref={compraRef} className="portada3d__acceso portada3d__ficha portada-mapa__lectura">
                        <div className="portada-mapa__dato">
                            <span className="portada-mapa__etiqueta">Precio</span>
                            {libro ? <PrecioOferta libro={libro} clase="portada3d__precio" /> : <span className="precio portada3d__precio" aria-hidden="true" />}
                        </div>
                        {libro && (
                            <div className="portada-mapa__dato">
                                <span className="portada-mapa__etiqueta">Disponibilidad</span>
                                <p className={`portada3d__stock${libro.disponible ? '' : ' portada3d__stock--agotado'}`}>{libro.disponible ? `${libro.stock} ${libro.stock === 1 ? 'ejemplar disponible' : 'ejemplares disponibles'}` : 'Agotado por ahora'}</p>
                            </div>
                        )}
                        {libro && (
                            <div className="portada-mapa__dato">
                                <span className="portada-mapa__etiqueta">Edición</span>
                                <strong className="portada-mapa__valor">{libro.edicion || 'No registrada'}</strong>
                            </div>
                        )}
                        {libro?.sinopsis && (
                            <div className="portada-mapa__dato portada-mapa__dato--ficha">
                                <span className="portada-mapa__etiqueta">Ficha</span>
                                <p className="portada-mapa__descripcion">{libro.sinopsis}</p>
                            </div>
                        )}
                        <Link to={libro ? `/libro/${libro.id}` : '/catalogo'} className="portada3d__boton">
                            {libro ? 'Ver este libro' : 'Ver catálogo'}
                        </Link>
                        <p className="portada-unica__estado" role="status">
                            {espacial && cargando && !libro ? (
                                'Cargando el libro destacado…'
                            ) : error ? (
                                <>
                                    No pudimos actualizar el libro.{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFallo(false);
                                            reintentar();
                                        }}>
                                        Reintentar
                                    </button>
                                </>
                            ) : fallo ? (
                                <>
                                    La portada 3D no está disponible.{' '}
                                    <button type="button" onClick={() => setFallo(false)}>
                                        Reintentar 3D
                                    </button>
                                </>
                            ) : (
                                ''
                            )}
                        </p>
                    </div>
                </div>
                {espacial && libro && (
                    <>
                        <FichaLibro libro={libro} fichaRef={fichaRef} />
                        <div ref={finalRef} className="portada3d__final">
                            <Recientes libros={recientes} protagonista={libro} enEscena />
                            <Link to="/catalogo" className="portada3d__boton">
                                Ver catálogo
                            </Link>
                        </div>
                        <p ref={pistaRef} className="portada3d__pista" aria-hidden="true">
                            Desliza para descubrir
                        </p>
                    </>
                )}
            </div>
            {!espacial && <Recientes libros={recientes} />}
        </section>
    );
}
