import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';

import './public-site.css';
import './tema-editorial.css';
import './responsive-movil.css';

import PublicHeader from './components/PublicHeader';
import PublicFooter from './components/PublicFooter';
import Precarga from './components/Precarga';
import BarraMovil from './components/BarraMovil';
import { precargaTerminada, usePrecargaTerminada } from './lib/precarga';
import { useCatalogo, useEmpresa } from './hooks/useApiPublica';
import { puedeUsar3D, useMovimientoReducido } from './hooks/useEntorno';
import { irASeccion, ScrollTrigger, useScrollSuave } from './animation/scroll';
import { PAGINAS, SITIO } from './config/site';

// Entrada directa al inicio con 3D: la escena (three.js) empieza a
// descargarse ya, en paralelo con la página, en lugar de esperar a que el
// hero se monte. Es el mismo módulo que pide Hero: se descarga una vez.
if (typeof window !== 'undefined' && window.location.pathname === '/' && !precargaTerminada() && puedeUsar3D()) {
    import('./three/HeroScene').catch(() => {});
}

// ============================================================
// WEB PÚBLICA — layout común de las páginas (Inicio, Catálogo,
// Aplicación, Características, Nosotros, Descargar).
// ============================================================

function metadatos(ruta) {
    const pagina = PAGINAS[ruta] || PAGINAS['/'];
    document.title = pagina.titulo;
    document.querySelector('meta[name="description"]')?.setAttribute('content', pagina.descripcion);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${SITIO.url}${ruta === '/' ? '/' : ruta}`);
}

export default function PublicLayout() {
    const reducido = useMovimientoReducido();
    const lenis = useScrollSuave(!reducido);
    const pagina = useRef(null);
    const rutaPrevia = useRef(null);
    const { pathname, hash } = useLocation();
    const catalogo = useCatalogo();
    const legal = useEmpresa();
    const cargada = usePrecargaTerminada();

    // Sin desplazamiento mientras la pantalla de carga está activa.
    useEffect(() => {
        const l = lenis.current;
        if (!l) return;
        if (cargada) {
            l.start();
            ScrollTrigger.refresh();
        } else l.stop();
    }, [cargada, lenis]);

    // Cambio de página: arriba, metadatos y foco en su título.
    useEffect(() => {
        metadatos(pathname);
        const anterior = rutaPrevia.current;
        rutaPrevia.current = pathname;
        if (anterior === pathname) return undefined;
        // Con ancla en la url no se toca el scroll: de eso se encarga el
        // efecto de abajo, que además sabe esperar a que Lenis esté activo.
        if (!hash) {
            if (lenis.current) lenis.current.scrollTo(0, { immediate: true });
            else window.scrollTo(0, 0);
        }
        // El foco en el título solo tiene sentido al navegar, no al recargar.
        if (anterior !== null) {
            const titulo = pagina.current?.querySelector('main h1');
            if (titulo) {
                titulo.setAttribute('tabindex', '-1');
                titulo.focus({ preventScroll: true });
            }
        }
        const t = setTimeout(() => ScrollTrigger.refresh(), 150);
        return () => clearTimeout(t);
    }, [pathname, hash, lenis]);

    // Enlaces con ancla (p. ej. /nosotros#tienda): baja a esa sección cuando la
    // página ya está montada. Espera a que termine la pantalla de carga porque
    // mientras tanto Lenis está detenido y se tragaría el desplazamiento.
    useEffect(() => {
        const id = decodeURIComponent(hash.replace('#', ''));
        if (!id || !cargada) return undefined;
        const t = setTimeout(() => irASeccion(id, lenis.current), 220);
        return () => clearTimeout(t);
    }, [pathname, hash, lenis, cargada]);

    // Las alturas cambian cuando llega el catálogo.
    useEffect(() => {
        const t = setTimeout(() => ScrollTrigger.refresh(), 120);
        return () => clearTimeout(t);
    }, [catalogo.cargando]);

    // Revelado de titulares y libros: visibles hasta que el script está listo.
    useEffect(() => {
        const raiz = pagina.current;
        raiz.classList.add('js');
        const obs = new IntersectionObserver((entradas) => entradas.forEach((e) => {
            if (e.isIntersecting) {
                e.target.setAttribute('data-visto', '');
                obs.unobserve(e.target);
            }
        }), { rootMargin: '0px 0px -8% 0px' });
        const observar = () => raiz.querySelectorAll('[data-revelar]:not([data-visto])').forEach((el) => obs.observe(el));
        observar();
        const mut = new MutationObserver(observar);
        mut.observe(raiz, { childList: true, subtree: true });
        return () => {
            obs.disconnect();
            mut.disconnect();
        };
    }, []);

    return (
        <MotionConfig reducedMotion="user">
            <div className="sitio" ref={pagina}>
                <a className="saltar" href="#contenido">Saltar al contenido</a>
                <PublicHeader />
                <main id="contenido">
                    <Outlet context={{ reducido, catalogo, legal }} />
                </main>
                <PublicFooter legal={legal} />
                <BarraMovil />
                <Precarga />
            </div>
        </MotionConfig>
    );
}
