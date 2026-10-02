import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { FaDownload } from 'react-icons/fa6';

import { EASE } from '../config/motion';
import HeroFondo from './HeroFondo';
import { puedeUsar3D } from '../hooks/useEntorno';
import { ScrollTrigger, useGSAP } from '../animation/scroll';
import { precargaTerminada, registrarRecurso, usePrecargaTerminada } from '../lib/precarga';

const HeroScene = lazy(() => import('../three/HeroScene'));

// Imagen del libro en public/hero: nombre fijo para que index.html la
// precargue desde el primer byte (es el elemento LCP del hero).
const poster720 = '/hero/libro-3d-720.webp';
const poster1200 = '/hero/libro-3d-1200.webp';

const LINEAS = ['Una librería de verdad,', 'ahora en tu teléfono.'];

export default function Hero({ reducido, catalogo }) {
    const libros = catalogo?.libros || [];
    const totalCategorias = new Set(libros.map((l) => l.categoria).filter(Boolean)).size;
    const enOferta = libros.filter((l) => l.descuento > 0).length;
    const seccion = useRef(null);
    const escena = useRef(null);
    const puntero = useRef({ x: 0, y: 0 });
    const progreso = useRef(0);
    const [usar3D, setUsar3D] = useState(false);
    const [listo, setListo] = useState(false);
    const [visible, setVisible] = useState(true);
    const poster = useRef(null);
    const libera3D = useRef(null);
    const mostrar = usePrecargaTerminada();

    // Recursos que la pantalla de carga espera antes de mostrar el hero:
    // la imagen del libro y, si hay 3D, su primer cuadro.
    // Se registran en un efecto de layout para que la pantalla de carga
    // los vea en el mismo commit en que el hero se monta.
    useLayoutEffect(() => {
        const liberaPoster = registrarRecurso('imagen-hero');
        const img = poster.current;
        if (!img || img.complete) liberaPoster();
        else {
            img.addEventListener('load', liberaPoster, { once: true });
            img.addEventListener('error', liberaPoster, { once: true });
        }

        libera3D.current = puedeUsar3D() ? registrarRecurso('libro-3d') : null;
        return () => {
            liberaPoster();
            libera3D.current?.();
        };
    }, []);

    // La escena se pide cuando el navegador está libre: primero el texto.
    // Bajo la pantalla de carga no hay texto que priorizar: se pide ya.
    useEffect(() => {
        if (!puedeUsar3D()) return undefined;
        const iniciar = () => {
            const fuente = document.fonts?.load("700 92px 'Work Sans'") ?? Promise.resolve();
            fuente.catch(() => {}).finally(() => setUsar3D(true));
        };
        if (!precargaTerminada()) {
            iniciar();
            return undefined;
        }
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(iniciar, { timeout: 1800 });
            return () => window.cancelIdleCallback(id);
        }
        const id = setTimeout(iniciar, 700);
        return () => clearTimeout(id);
    }, []);

    // Pausa la escena cuando el hero no se ve.
    useEffect(() => {
        const el = escena.current;
        if (!el) return undefined;
        const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (reducido) return undefined;
        const mover = (e) => {
            puntero.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            puntero.current.y = (e.clientY / window.innerHeight) * 2 - 1;
        };
        window.addEventListener('pointermove', mover, { passive: true });
        return () => window.removeEventListener('pointermove', mover);
    }, [reducido]);

    useGSAP(() => {
        ScrollTrigger.create({
            trigger: seccion.current,
            start: 'top top',
            end: 'bottom top',
            onUpdate: (s) => { progreso.current = s.progress; },
        });
    }, { scope: seccion });

    const entrada = (i) => (reducido ? {} : {
        initial: { y: '105%' },
        animate: { y: mostrar ? '0%' : '105%' },
        transition: { duration: 1.1, delay: 0.15 + i * 0.12, ease: EASE.salida },
    });
    const aparece = (retraso) => (reducido ? {} : {
        initial: { opacity: 0, y: 14 },
        animate: mostrar ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
        transition: { duration: 0.9, delay: retraso, ease: EASE.salida },
    });

    return (
        <section ref={seccion} className="seccion hero oscuro" aria-labelledby="hero-titulo">
            <HeroFondo />
            <div className="contenedor hero__rejilla">
                <div>
                    <h1 id="hero-titulo" className="hero__titulo">
                        {LINEAS.map((linea, i) => (
                            <span className="linea" key={linea}>
                                <motion.span {...entrada(i)}>{linea}</motion.span>
                            </span>
                        ))}
                    </h1>
                    <motion.p className="hero__bajada" {...aparece(0.5)}>
                        Explora el catálogo de Librería del Saber, paga en línea con PayU y recibe tus libros en Lima
                        o recógelos sin costo en nuestra tienda de Pallasca.
                    </motion.p>
                    <motion.div className="hero__acciones" {...aparece(0.65)}>
                        <Link className="boton boton--blanco" to="/descargar">
                            <FaDownload aria-hidden="true" /> Descargar la app
                        </Link>
                        <Link className="boton boton--linea" to="/catalogo">
                            Ver el catálogo
                        </Link>
                    </motion.div>
                    {libros.length > 0 && (
                        <motion.dl className="hero__cifras" {...aparece(0.8)}>
                            <div><dt>Libros disponibles</dt><dd>{libros.length}</dd></div>
                            {totalCategorias > 0 && <div><dt>Categorías</dt><dd>{totalCategorias}</dd></div>}
                            {enOferta > 0 && <div><dt>En oferta</dt><dd>{enOferta}</dd></div>}
                        </motion.dl>
                    )}
                </div>

                <div ref={escena} className="hero__escena">
                    <img
                        ref={poster}
                        className="hero__poster"
                        src={poster720}
                        srcSet={`${poster720} 720w, ${poster1200} 1200w`}
                        sizes="(max-width: 1023px) 90vw, 55vw"
                        alt="Libro cerrado encuadernado en cuero verde con el título Librería del Saber y una cinta de marcapáginas"
                        width="720"
                        height="422"
                        fetchPriority="high"
                        style={{ opacity: listo ? 0 : 1, transition: 'opacity 900ms var(--ease-salida)' }}
                    />
                    {usar3D && (
                        <Suspense fallback={null}>
                            <div style={{ position: 'absolute', inset: 0, opacity: listo ? 1 : 0, transition: 'opacity 900ms var(--ease-salida)' }}>
                                <HeroScene puntero={puntero} progreso={progreso} activo={visible} alListo={() => { setListo(true); libera3D.current?.(); }} />
                            </div>
                        </Suspense>
                    )}
                    {usar3D && listo && <p className="hero__pista" aria-hidden="true">Toca el libro para abrirlo</p>}
                </div>
            </div>
        </section>
    );
}
