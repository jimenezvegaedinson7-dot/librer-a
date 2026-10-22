import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowDown, FaArrowRight } from 'react-icons/fa6';

import env from '../../../compartido/config/env';
import { gsap, ScrollTrigger } from '../../animacion/scroll';
import { libroComercial } from '../../tienda/libroComercial';
import { PrecioOferta } from '../../componentes/PrecioOferta';
import { urlPortada } from '../../lib/formato';
import { SITIO, MOSTRAR_CARRUSEL_INICIO } from '../../config/site';
import Hero from '../Hero';
import { estadoCinematico } from './cinematografia';
import { leerProtagonista, guardarProtagonista, leerRecientes, guardarRecientes } from './cachePortada';
import { precargarImagenes } from '../../lib/cacheRecursos';
import './portada3d.css';

const cargarEscena = () => import('./escenaLibro');

// ============================================================
// PORTADA ESPACIAL: un único libro real del catálogo en una escena 3D.
// La animación avanza y retrocede con el scroll (GSAP ScrollTrigger con
// scrub). La escena 3D se carga aparte; sin WebGL o con movimiento
// reducido se muestra una portada estática con el mismo libro.
// ============================================================

// Últimos libros agregados: activos y con portada, por fecha real de alta
// (creado_en); el número de registro solo desempata libros sin fecha.
function ultimosAgregados(libros = [], cantidad = 5) {
    const fecha = (l) => { const f = Date.parse(l.creadoEn); return Number.isFinite(f) ? f : -Infinity; };
    return libros
        .filter((l) => l.estado === 1 && l.portada && urlPortada(l.portada) && l.precio > 0)
        .sort((a, b) => fecha(b) - fecha(a) || b.id - a.id)
        .slice(0, cantidad);
}

function UltimosLibros({ libros = [], className = '' }) {
    const seccion = useRef(null);
    const escena = useRef(null);

    const fecha = (l) => { const f = Date.parse(l.creadoEn); return Number.isFinite(f) ? f : -Infinity; };
    const recientes = [...libros]
        .filter((l) => l.estado === 1 && l.portada && urlPortada(l.portada) && l.precio > 0)
        .sort((a, b) => fecha(b) - fecha(a) || b.id - a.id)
        .slice(0, 5);

    const central = recientes[0];
    const lista = central ? [recientes[3], recientes[1], central, recientes[2], recientes[4]].filter(Boolean) : [];

    useEffect(() => {
        const sec = seccion.current;
        const cont = escena.current;
        if (!sec || !cont || lista.length < 1) return undefined;
        const media = gsap.matchMedia();
        media.add({ reducido: '(prefers-reduced-motion: reduce)', movil: '(max-width: 900px)', normal: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
            if (ctx.conditions.reducido || ctx.conditions.movil || lista.length !== 5) {
                cont.setAttribute('data-final', 'true');
                return () => cont.removeAttribute('data-final');
            }
            const items = Array.from(cont.querySelectorAll('.portada3d__apilar-item'));
            if (items.length !== 5) return;

            // La cuadrícula reserva una columna real a cada ficha. Solo las
            // tapas giran: la tipografía nunca se inclina ni invade al vecino.
            const tapas = items.map((el) => el.querySelector('.portada3d__apilar-tapa'));
            gsap.set(items, {
                x: (_, el) => cont.clientWidth / 2 - el.offsetLeft - el.offsetWidth / 2,
                y: 0, z: -80, scale: 0.9, opacity: 0.9,
                transformOrigin: '50% 50%',
            });
            gsap.set(tapas, { rotateY: 0, rotateZ: 0, transformPerspective: 1600 });
            gsap.set(items[2], { z: 0, scale: 1, opacity: 1, zIndex: 5 });

            const tl = gsap.timeline({
                paused: true,
                defaults: { duration: 1.55, ease: 'power3.out' },
                onComplete: () => cont.setAttribute('data-final', 'true'),
            });

            items.forEach((el, i) => {
                const inicio = Math.abs(i - 2) * 0.16;
                tl.to(el, { x: 0, y: 0, z: 0, scale: 1, opacity: 1 }, inicio);
                tl.to(tapas[i], { rotateY: (i - 2) * 7, rotateZ: (i - 2) * 2.5 }, inicio);
            });

            tl.fromTo(cont.querySelectorAll('.portada3d__apilar-info'), { opacity: 0, y: 12 }, {
                opacity: 1, y: 0, duration: 0.55, stagger: { each: 0.05, from: 'center' }, ease: 'expo.out',
            }, 1.05);
            let iniciada = false;
            const iniciar = () => {
                if (iniciada) return;
                iniciada = true;
                cont.classList.add('portada3d__apilar--final');
                tl.play();
                io.disconnect();
            };
            const io = new IntersectionObserver(
                ([e]) => {
                    if (e.isIntersecting) iniciar();
                },
                { threshold: 0.2 }
            );
            const enfocar = () => { iniciar(); tl.progress(1); };
            cont.addEventListener('focusin', enfocar);
            io.observe(cont);
            return () => {
                io.disconnect();
                cont.removeEventListener('focusin', enfocar);
                cont.removeAttribute('data-final');
                cont.classList.remove('portada3d__apilar--final');
            };
        }, sec);

        return () => media.revert();
    }, [lista.length]);

    if (recientes.length === 0) return null;

    return (
        <section ref={seccion} className={`portada3d__ultimos portada3d__ultimos--apilado ${className}`} aria-label="Últimos libros agregados">
            <div className="portada3d__ultimos-fondo portada3d__ultimos-fondo--hueso" aria-hidden="true" />
            <div className="portada3d__ultimos-contenido">
                <div className="seccion__cabeza portada3d__ultimos-cabeza">
                    <h2 className="seccion__titulo">Últimos libros agregados</h2>
                </div>
                <div ref={escena} className="portada3d__apilar" role="list" aria-live="polite">
                    {lista.map((l, i) => (
                        <article key={l.id} className={`portada3d__apilar-item portada3d__apilar-item--${i}`} role="listitem" style={{ '--posicion': i - (lista.length - 1) / 2, zIndex: i === 2 ? 5 : 3 - Math.abs(i - 2) }}>
                            <Link to={`/libro/${l.id}`} className="portada3d__apilar-link">
                                <div className="portada3d__apilar-tapa">
                                    <img src={urlPortada(l.portada, 420)} alt={`Portada de ${l.titulo}`} width="200" height="300" loading="lazy" decoding="async" />
                                    {l.descuento > 0 && <span className="portada3d__apilar-descuento">-{l.descuento}%</span>}
                                </div>
                                <div className="portada3d__apilar-info">
                                    <h3 className="portada3d__apilar-titulo">{l.titulo}</h3>
                                    {l.autor && <p className="portada3d__apilar-autor">{l.autor}</p>}
                                    <PrecioOferta libro={l} clase="portada3d__apilar-precio" />
                                </div>
                            </Link>
                        </article>
                    ))}
                </div>
                <div className="portada3d__apilar-carrusel" role="region" aria-label="Últimos libros agregados en carrusel">
                    <ul>
                        {recientes.map((l) => (
                            <li key={l.id}>
                                <Link to={`/libro/${l.id}`} className="portada3d__apilar-link portada3d__apilar-link--móvil">
                                    <div className="portada3d__apilar-tapa">
                                        <img src={urlPortada(l.portada, 320)} alt={`Portada de ${l.titulo}`} width="160" height="240" loading="lazy" />
                                        {l.descuento > 0 && <span className="portada3d__apilar-descuento">-{l.descuento}%</span>}
                                    </div>
                                    <div className="portada3d__apilar-info">
                                        <h3 className="portada3d__apilar-titulo">{l.titulo}</h3>
                                        {l.autor && <p className="portada3d__apilar-autor">{l.autor}</p>}
                                        <PrecioOferta libro={l} clase="portada3d__apilar-precio" />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

// Últimos libros dentro del mismo escenario: aparecen después de la frase,
// uno a uno desde el centro, con el progreso del scroll (--libros).
// El libro central es el protagonista que estalló: sus pedazos lo rearman.
function UltimosEnEscena({ libros = [], protagonista = null }) {
    const ordenados = ultimosAgregados(libros);
    const recientes = protagonista
        ? [protagonista, ...ordenados.filter((l) => l.id !== protagonista.id)].slice(0, 5)
        : ordenados;
    if (recientes.length === 0) return null;
    const central = recientes[0];
    const lista = [recientes[3], recientes[1], central, recientes[2], recientes[4]].filter(Boolean);
    const medio = (lista.length - 1) / 2;
    return (
        <section className="portada3d__escena-libros" aria-label="Últimos libros agregados">
            <p className="portada3d__escena-libros-titulo">Últimos libros agregados</p>
            <div className="portada3d__apilar" role="list" data-final="true">
                {lista.map((l, i) => (
                    <article key={l.id} className="portada3d__apilar-item" role="listitem" style={{ '--lado': i - medio, '--orden': Math.abs(i - medio) }}>
                        <Link to={`/libro/${l.id}`} className="portada3d__apilar-link">
                            <div className="portada3d__apilar-tapa">
                                <img src={urlPortada(l.portada, 320)} alt={`Portada de ${l.titulo}`} width="160" height="240" loading="lazy" decoding="async" />
                                {l.descuento > 0 && <span className="portada3d__apilar-descuento">-{l.descuento}%</span>}
                            </div>
                            <div className="portada3d__apilar-info">
                                <h3 className="portada3d__apilar-titulo">{l.titulo}</h3>
                                <PrecioOferta libro={l} clase="portada3d__apilar-precio" />
                            </div>
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}

const tramo = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const campana = (p, a, b, c, d) => Math.min(tramo(p, a, b), 1 - tramo(p, c, d));

// Recorta únicamente el texto que queda detrás del volumen real proyectado.
// El contorno procede de la geometría del libro, no de una máscara decorativa.
function contornoProyectado(puntos) {
    const ordenados=[...puntos].sort((a,b)=>a.x-b.x || a.y-b.y);
    const cruz=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const mitad=(lista)=>{const r=[]; for(const p of lista){while(r.length>1&&cruz(r.at(-2),r.at(-1),p)<=0)r.pop();r.push(p);}return r.slice(0,-1);};
    return [...mitad(ordenados),...mitad([...ordenados].reverse())];
}

function soportaWebGL() {
    try {
        const c = document.createElement('canvas');
        // Three r181 requiere WebGL 2. Liberar también este contexto de prueba.
        const gl = c.getContext('webgl2');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return Boolean(gl);
    } catch { return false; }
}

function useLibroProtagonista(respaldo = null, catalogoPendiente = false) {
    const [estado, setEstado] = useState(() => {
        const crudo = leerProtagonista();
        const libro = crudo && typeof crudo === 'object' ? libroComercial(crudo) : null;
        const valido = libro && libro.estado === 1 && typeof libro.titulo === 'string' && libro.titulo.trim() && urlPortada(libro.portada) && libro.precioFinal > 0;
        return { cargando: crudo !== null && !valido, libro: valido ? libro : null, crudo: valido ? crudo : null, error: false };
    });
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let vivo = true, consulta = null, ultima = 0;
        const cargar = async () => {
            if (consulta || !vivo) return;
            ultima = Date.now();
            consulta = new AbortController();
            const limite = setTimeout(() => consulta?.abort(), 12000);
            try {
                const r = await fetch(`${env.apiUrl}/anuncios/protagonista`, { signal: consulta.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
                if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
                const json = await r.json();
                const crudo = json?.data?.libro || null;
                const libro = crudo ? libroComercial(crudo) : null;
                if (libro && (libro.estado !== 1 || !libro.titulo?.trim() || !urlPortada(libro.portada) || !(libro.precioFinal > 0))) throw new Error('Libro no elegible');
                if (vivo) {
                    setEstado((anterior) => !anterior.error && !anterior.cargando && JSON.stringify(anterior.libro) === JSON.stringify(libro)
                        ? anterior.revalidado ? anterior : { ...anterior, revalidado: true }
                        : { cargando: false, crudo, libro, error: false, revalidado: true });
                }
            } catch (e) {
                // Sin endpoint (404) se usa el respaldo del catálogo: no es un
                // error de la portada, así que no se muestra el aviso.
                if (vivo) setEstado((previo) => e.status === 404
                    ? { ...previo, cargando: false, error: !previo.libro, sinEndpoint: true }
                    : { cargando: false, libro: null, crudo: null, error: true, sinEndpoint: false });
            } finally { clearTimeout(limite); consulta = null; }
        };
        const actualizar = () => { if (!document.hidden && Date.now() - ultima > 1000) cargar(); };
        cargar();
        const intervalo = setInterval(actualizar, 60000);
        window.addEventListener('focus', actualizar);
        document.addEventListener('visibilitychange', actualizar);
        return () => { vivo = false; consulta?.abort(); clearInterval(intervalo); window.removeEventListener('focus', actualizar); document.removeEventListener('visibilitychange', actualizar); };
    }, [revision]);
    // Respaldo derivado: funciona tanto si el catálogo llega antes como después
    // del error. Una respuesta válida con libro:null se respeta, no se sustituye.
    const actual = estado.sinEndpoint
        ? respaldo
            ? JSON.stringify(estado.libro) === JSON.stringify(respaldo.libro)
                ? { ...estado, error: false, respaldo: true }
                : { ...estado, ...respaldo, error: false, respaldo: true }
            : catalogoPendiente ? { ...estado, cargando: !estado.libro, error: false }
                : { ...estado, cargando: false, libro: null, crudo: null, error: false, respaldo: true }
        : estado;
    useEffect(() => {
        // Una única escritura después del commit evita que el respaldo de un
        // cuadro anterior sobrescriba una retirada explícita del protagonista.
        if (actual.respaldo || actual.revalidado) guardarProtagonista(actual.crudo);
    }, [actual.respaldo, actual.revalidado, actual.crudo]);
    return { ...actual, reintentar: () => setRevision((n) => n + 1) };
}

function CargaPortada() {
    return (
        <div className="portada3d__cargando" role="status" aria-live="polite">
            <span className="portada3d__spinner" aria-hidden="true" />
            <span className="portada3d__cargando-texto">Preparando la portada…</span>
        </div>
    );
}

function FichaLibro({ libro, className = '', fichaRef }) {
    return (
        <div className={`portada3d__ficha ${className}`} ref={fichaRef}>
            <h2 className="portada3d__libro-titulo">{libro.titulo}</h2>
            {libro.autor && <p className="portada3d__autor">{libro.autor}</p>}
            <PrecioOferta libro={libro} clase="portada3d__precio" />
            <p className={`portada3d__stock ${libro.disponible ? '' : 'portada3d__stock--agotado'}`}>
                {libro.disponible ? `Disponible · ${libro.stock} ${libro.stock === 1 ? 'ejemplar' : 'ejemplares'}` : 'Agotado por ahora'}
            </p>
            {libro.sinopsis && <p className="portada3d__sinopsis">{libro.sinopsis}</p>}
            <Link to={`/libro/${libro.id}`} className="portada3d__boton">Ver este libro <FaArrowRight aria-hidden="true" /></Link>
        </div>
    );
}

// Portada estática: sin WebGL, con movimiento reducido o mientras carga.
function PortadaEstatica({ libro, crudo, recientes, cargando, error, reintentar }) {
    const portada = crudo ? urlPortada(crudo.portada, 700) : null;
    const [imagenFallida, setImagenFallida] = useState(false);
    return (
        <>
        <section className="portada3d portada3d--estatica" aria-label="Portada de Librería del Saber">
            {!MOSTRAR_CARRUSEL_INICIO && <h1 className="sr-only">Libros y anuncios de Librería del Saber</h1>}
            <div className="portada3d__estatica">
                <div className="portada3d__estatica-texto">
                    <p className="portada3d__marca">{SITIO.nombre}</p>
                    <p className="portada3d__lema">Libros físicos con delivery en Pallasca y recojo gratuito en tienda.</p>
                    {cargando && <p role="status">Cargando el libro protagonista…</p>}
                    {error && <p role="status">No pudimos cargar el libro destacado. Puedes explorar el catálogo o <button className="portada3d__reintentar" type="button" onClick={reintentar}>reintentar</button>.</p>}
                    {!libro && <Link to="/catalogo" className="portada3d__boton">Ver catálogo <FaArrowRight aria-hidden="true" /></Link>}
                </div>
                {libro && (
                    <div className="portada3d__estatica-libro">
                        {portada && !imagenFallida ? <img src={portada} alt={`Portada de ${libro.titulo}`} width="320" height="480" onError={() => setImagenFallida(true)} />
                            : <p className="portada3d__sin-imagen">Portada no disponible</p>}
                        <FichaLibro libro={libro} />
                    </div>
                )}
            </div>
            <UltimosLibros libros={recientes} className="portada3d__ultimos--estatica" />
        </section>
        {MOSTRAR_CARRUSEL_INICIO && <Hero />}
        </>
    );
}

export default function PortadaEspacial({ reducido, catalogo }) {
    const [recientesGuardados] = useState(leerRecientes);
    const recientes = useMemo(() => catalogo?.cargando ? recientesGuardados : ultimosAgregados(catalogo?.libros || []), [catalogo?.libros, catalogo?.cargando, recientesGuardados]);
    useEffect(() => {
        if (catalogo && !catalogo.cargando && !catalogo.error) guardarRecientes(recientes);
    }, [catalogo, recientes]);
    const primero = recientes[0];
    const respaldo = useMemo(() => {
        if (!primero) return null;
        return { libro: primero, crudo: { id_libro: primero.id, titulo: primero.titulo,
            autor: primero.autor, categoria: primero.categoria, isbn: primero.isbn,
            id_autor: primero.idAutor, id_categoria: primero.idCategoria,
            estado: primero.estado, precio: primero.precio, precio_final: primero.precioFinal,
            descuento_vigente: primero.descuento > 0 ? 1 : 0, descuento_porcentaje_efectivo: primero.descuento,
            stock: primero.stock, portada: primero.portada, descripcion: primero.sinopsis,
            creado_en: primero.creadoEn, es_nuevo: primero.esNuevo ? 1 : 0, mas_vendido: primero.masVendido ? 1 : 0 } };
    }, [primero]);
    const { cargando, libro, crudo, error, reintentar } = useLibroProtagonista(respaldo, catalogo?.cargando);
    const [webgl] = useState(() => typeof window !== 'undefined' && soportaWebGL());
    const mediaEstatica='(max-height: 600px), (max-width: 360px) and (max-height: 740px)';
    const [pantallaBaja, setPantallaBaja] = useState(() => window.matchMedia(mediaEstatica).matches);
    const modo3d = webgl && !reducido && !pantallaBaja && !navigator.connection?.saveData;
    // Descarga Three.js mientras llega Render, sin crear aún el contexto WebGL.
    useEffect(() => {
        if (modo3d) cargarEscena().catch(() => {});
    }, [modo3d]);
    useEffect(() => {
        const media = window.matchMedia(mediaEstatica);
        const actualizar = () => setPantallaBaja(media.matches);
        media.addEventListener('change', actualizar);
        return () => media.removeEventListener('change', actualizar);
    }, []);
    const [lista, setLista] = useState(false);
    const [fallo, setFallo] = useState(false);

    // El protagonista tiene prioridad; las otras tapas esperan al primer cuadro.
    useEffect(() => {
        if (!crudo) return undefined;
        const url = urlPortada(crudo.portada, 1024);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.fetchPriority = 'high';
        if (url) img.src = url;
        if (lista) {
            const ancho = window.matchMedia('(max-width: 900px)').matches ? 320 : 420;
            precargarImagenes([url, ...recientes.map((l) => urlPortada(l.portada, ancho))]);
        }
        return () => { img.onload = null; img.onerror = null; };
    }, [crudo, recientes, lista]);

    const seccion = useRef(null);
    const escenario = useRef(null);
    const lienzo = useRef(null);
    const capas = { titulo: useRef(null), lema: useRef(null), ficha: useRef(null), final: useRef(null), pista: useRef(null), velo: useRef(null), compra: useRef(null) };
    const motor = useRef(null);

    // Altura real de la cabecera fija y de la barra inferior del celular,
    // para que la escena no quede tapada por ninguna de las dos.
    useEffect(() => {
        const sec = seccion.current;
        if (!modo3d || fallo || !sec) return undefined;
        const cab = document.querySelector('.cabecera');
        const navegacion = document.querySelector('.navegacion-publica');
        const sitio = sec.closest('.sitio');
        const barra = document.querySelector('.barra-movil');
        const medir = () => {
            // La referencia empieza con navegación visible; el escenario
            // ocupa la altura disponible debajo de ella desde el primer cuadro.
            const altura = navegacion?.offsetHeight || cab?.offsetHeight || 0;
            sec.style.setProperty('--cabecera',`${altura}px`);
            sec.style.setProperty('--margen-inicial','0px');
            sitio?.style.setProperty('--altura-nav',`${altura}px`);
            const visible = barra && getComputedStyle(barra).display !== 'none' && ['fixed', 'sticky'].includes(getComputedStyle(barra).position);
            sec.style.setProperty('--barra', `${visible ? barra.offsetHeight : 0}px`);
        };
        medir();
        const ro = new ResizeObserver(medir);
        if (cab) ro.observe(cab);
        if (navegacion) ro.observe(navegacion);
        if (barra) ro.observe(barra);
        window.addEventListener('resize', medir);
        return () => { ro.disconnect(); window.removeEventListener('resize', medir); sitio?.style.removeProperty('--altura-nav'); };
    }, [modo3d, fallo, cargando, libro]);

    // Escena 3D: se importa bajo demanda (Three.js va en su propio paquete).
    useEffect(() => {
        if (!modo3d || fallo || cargando || !libro || !crudo) return undefined;
        const sec = seccion.current, espacio = escenario.current, canvas = lienzo.current;
        if (!sec || !espacio || !canvas) return undefined;
        const sitio=sec.closest('.sitio');
        let vivo = true;
        let escena = null, marco = 0, visible = true, tween = null, entrada = null, ultimoCuadro = 0, ultimoProgreso = null;
        let portadaCargada = false, fuentesListas = false, presentada = false;
        const estiloTitulo = getComputedStyle(capas.titulo.current);
        const fuentes = document.fonts ? Promise.all([
            document.fonts.load(`${estiloTitulo.fontWeight} ${estiloTitulo.fontSize} ${estiloTitulo.fontFamily}`),
            document.fonts.load('400 16px "Work Sans"'),
        ]) : Promise.resolve();
        fuentes.catch(() => {}).then(() => { fuentesListas = true; });
        if (sitio) {
            sitio.style.setProperty('--revelar-nav', '1');
            for (const fase of ['linea', 'cuerpo', 'enlaces']) sitio.style.setProperty(`--nav-${fase}`, '1');
            sitio.dataset.navVisible = 'true';
        }
        // Composición (pantalla angosta) y rendimiento (equipo modesto) por separado:
        // una laptop de pocos núcleos conserva la composición de escritorio.
        const compacto = window.matchMedia('(max-width: 900px)').matches;
        const movil = compacto || window.matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4 || navigator.hardwareConcurrency <= 4 || navigator.connection?.saveData;
        const limpiar = [];
        setLista(false);
        const limite = setTimeout(() => vivo && setFallo(true), 10000);
        limpiar.push(() => clearTimeout(limite));

        // Textos sincronizados con el mismo progreso del scroll.
        const aplicar = (p) => {
            sec.style.setProperty('--recorrido', p.toFixed(4));
            const estado=estadoCinematico(p);
            const op = (ref, v, y = 0) => { if (ref.current) { ref.current.style.opacity = v.toFixed(3); ref.current.style.setProperty('--desplazamiento', `${y.toFixed(1)}px`); ref.current.style.visibility = v < 0.01 ? 'hidden' : 'visible'; } };
            const t = 1 - tramo(p, 0.02, 0.12);
            op(capas.titulo, t, -40 * (1 - t));
            op(capas.lema, t * (1 - tramo(p, 0.08, 0.2)), -20 * (1 - t));
            op(capas.pista, 1 - tramo(p, 0.02, 0.08));
            op(capas.compra, 1 - tramo(p, 0.12, 0.2));
            const f = campana(p, 0.18, 0.26, 0.42, 0.5);
            op(capas.ficha, f, 24 * (1 - f));
            const fin = estado.presentacionFinal;
            // El bloque se enciende; libros y botón llegan con --libros y --formar.
            op(capas.final, Math.min(1, fin * 6), 0);
            capas.final.current?.style.setProperty('--formar', fin.toFixed(4));
            capas.final.current?.style.setProperty('--libros', tramo(p, 0.87, 0.96).toFixed(4));
            if (capas.velo.current) capas.velo.current.style.opacity = '0';
        };

        const bucle = (ahora) => {
            marco = 0;
            if (!vivo || !escena || !visible || document.hidden || !espacio.isConnected) return;
            try {
                if ((!movil && !escena.economico) || ahora - ultimoCuadro >= 1000 / 30) {
                    const estado=escena.dibujar();
                    ultimoCuadro=ahora;
                    if(estado){
                        if(ultimoProgreso!==estado.p){aplicar(estado.p);ultimoProgreso=estado.p;}
                        if (!presentada && portadaCargada && fuentesListas) {
                            presentada = true;
                            clearTimeout(limite);
                            setLista(true);
                            entrada?.play();
                            requestAnimationFrame(() => vivo && ScrollTrigger.refresh());
                        }
                    }
                }
            } catch { setFallo(true); return; }
            marco = requestAnimationFrame(bucle);
        };
        const arrancar = () => { if (!marco && vivo && escena && visible && !document.hidden) marco = requestAnimationFrame(bucle); };

        cargarEscena()
            .then(({ default: EscenaLibro }) => {
                if (!vivo || !canvas.isConnected) return;
                escena = new EscenaLibro(canvas, {
                    portadaUrl: urlPortada(crudo.portada, 1024),
                    titulo: libro.titulo,
                    autor: libro.autor,
                    movil,
                    compacto,
                    alDibujar: (puntos, ancho, alto) => {
                        if (!vivo || !capas.titulo.current || !ancho || !alto) return;
                        const titulo = capas.titulo.current.getBoundingClientRect();
                        const marco = espacio.getBoundingClientRect();
                        const contorno=contornoProyectado(puntos.map((p) => ({ x:p.x-titulo.left+marco.left, y:p.y-titulo.top+marco.top })));
                        const agujero=contorno.map((v,i)=>`${i?'L':'M'}${v.x.toFixed(1)} ${v.y.toFixed(1)}`).join(' ');
                        capas.titulo.current.style.clipPath=`path(evenodd, "M0 0 H${titulo.width} V${titulo.height} H0 Z ${agujero} Z")`;
                    },
                    alCargarPortada: (ok) => {
                        if (!vivo) return;
                        if (!ok) { setFallo(true); return; }
                        portadaCargada = true;
                    },
                });
                motor.current = escena;
                // Portadas de los últimos libros, medidas sin las transformaciones
                // de su entrada (offset*): ahí se reúnen las esquirlas.
                const medirDestinos = () => {
                    const cont = capas.final.current?.querySelector('.portada3d__escena-libros .portada3d__apilar');
                    if (!cont) { escena.setDestinos(null); return; }
                    const base = espacio.getBoundingClientRect(), c = cont.getBoundingClientRect();
                    // Solo la portada central: los pedazos forman primero un libro y
                    // los demás salen después desde detrás de él, dos a cada lado.
                    const centro = cont.children[Math.floor(cont.children.length / 2)];
                    escena.setDestinos([centro].filter(Boolean).map((item) => {
                        const tapa = item.querySelector('.portada3d__apilar-tapa');
                        return { left: c.left - base.left + item.offsetLeft + tapa.offsetLeft - cont.scrollLeft, top: c.top - base.top + item.offsetTop + tapa.offsetTop, width: tapa.offsetWidth, height: tapa.offsetHeight };
                    }));
                };
                const medir = () => { if (!vivo || !espacio.isConnected) return; const r = espacio.getBoundingClientRect(); escena.redimensionar(r.width, r.height); medirDestinos(); };
                medir();
                const ro = new ResizeObserver(medir); ro.observe(espacio); limpiar.push(() => ro.disconnect());

                // Entrada cinematográfica (una vez) y línea de tiempo del scroll.
                const proxy = { e: 0, p: 0 };
                entrada = gsap.to(proxy, { e: 1, duration: 3.4, ease: 'expo.out', paused: true, onUpdate: () => escena.setEntrada(proxy.e) });
                tween = gsap.to(proxy, {
                    p: 1, ease: 'none',
                    scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.65, invalidateOnRefresh: true },
                    onUpdate: () => escena.setProgreso(proxy.p),
                });
                aplicar(0);
                const perderContexto = (e) => { e.preventDefault(); if (vivo) setFallo(true); };
                canvas.addEventListener('webglcontextlost', perderContexto);
                limpiar.push(() => canvas.removeEventListener('webglcontextlost', perderContexto));

                // Puntero con inercia (la escena lo suaviza).
                const mover = (ev) => {
                    if (!vivo || !espacio.isConnected) return;
                    const r = espacio.getBoundingClientRect();
                    if (!r.width || !r.height) return;
                    escena.setPuntero(((ev.clientX - r.left) / r.width) * 2 - 1, ((ev.clientY - r.top) / r.height) * 2 - 1);
                };
                window.addEventListener('pointermove', mover, { passive: true });
                limpiar.push(() => window.removeEventListener('pointermove', mover));

                // Solo dibuja cuando la escena está a la vista y la pestaña activa.
                const superior=parseFloat(getComputedStyle(sec).getPropertyValue('--cabecera')) || 0;
                const inferior=parseFloat(getComputedStyle(sec).getPropertyValue('--barra')) || 0;
                const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if(visible)ultimoProgreso=null; arrancar(); }, { rootMargin:`-${superior}px 0px -${inferior}px 0px` });
                io.observe(espacio); limpiar.push(() => io.disconnect());
                const alVer = () => arrancar();
                document.addEventListener('visibilitychange', alVer);
                limpiar.push(() => document.removeEventListener('visibilitychange', alVer));

                arrancar();
                requestAnimationFrame(() => vivo && ScrollTrigger.refresh());
            })
            .catch(() => vivo && setFallo(true));

        return () => {
            vivo = false;
            cancelAnimationFrame(marco);
            entrada?.kill();
            tween?.scrollTrigger?.kill();
            tween?.kill();
            limpiar.forEach((f) => f());
            escena?.destruir();
            motor.current = null;
            sitio?.style.removeProperty('--revelar-nav');
            for(const fase of ['linea','cuerpo','enlaces'])sitio?.style.removeProperty(`--nav-${fase}`);
            if(sitio)delete sitio.dataset.navVisible;
            if(sitio)delete sitio.dataset.navPosterior;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modo3d, fallo, cargando, libro, crudo]);

    if (cargando && !libro) return (
        <section ref={seccion} className="portada3d portada3d--cargando" aria-label="Portada de Librería del Saber" aria-busy="true">
            <h1 className="sr-only">Libros y anuncios de Librería del Saber</h1>
            <CargaPortada />
        </section>
    );
    if (!modo3d || fallo || !libro) return <PortadaEstatica key={libro?.id || 'vacia'} libro={libro} crudo={crudo} recientes={recientes} cargando={cargando} error={error} reintentar={reintentar} />;

    return (
        <>
        <section ref={seccion} className={`portada3d portada3d--3d ${lista ? 'portada3d--lista' : ''}`} aria-busy={!lista} aria-label={`Portada de Librería del Saber con el libro destacado: ${libro.titulo}`}>
            <h1 className="sr-only">Libros y anuncios de Librería del Saber</h1>
            <div ref={escenario} className="portada3d__escenario">
                <canvas ref={lienzo} className="portada3d__lienzo" aria-hidden="true" />
                <span className="portada3d__destello" aria-hidden="true" />
                {!lista && <CargaPortada />}
                <div className="portada3d__presentacion">
                <div ref={capas.titulo} className="portada3d__titulo" aria-hidden="true">
                    <span>Librería</span><span>del Saber</span>
                </div>
                <div ref={capas.compra} className="portada3d__acceso">
                    <span className="portada3d__acceso-titulo">{libro.titulo}</span>
                    {libro.autor && <span className="portada3d__autor">{libro.autor}</span>}
                    <PrecioOferta libro={libro} clase="portada3d__precio" />
                    <Link to={`/libro/${libro.id}`} className="portada3d__boton">Ver este libro <FaArrowRight aria-hidden="true" /></Link>
                </div>
                </div>
                <p ref={capas.lema} className="portada3d__lema portada3d__lema--flotante">Historias que abren otros mundos.</p>
                <FichaLibro libro={libro} className="portada3d__ficha--flotante" fichaRef={capas.ficha} />
                <div ref={capas.final} className="portada3d__final">
                    {!MOSTRAR_CARRUSEL_INICIO && <UltimosEnEscena libros={recientes} protagonista={libro} />}
                    <Link to="/catalogo" className="portada3d__boton">Ver catálogo <FaArrowRight aria-hidden="true" /></Link>
                </div>
                <p ref={capas.pista} className="portada3d__pista" aria-hidden="true"><FaArrowDown /> Desliza para descubrir</p>
                <span ref={capas.velo} className="portada3d__velo" aria-hidden="true" />
            </div>
        </section>
        {MOSTRAR_CARRUSEL_INICIO && <div className="portada3d portada3d__descubrimientos"><Hero compacto /></div>}
        </>
    );
}
