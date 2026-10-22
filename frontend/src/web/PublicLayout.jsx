import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { aplicarAnimacionesGlobales } from './animacion/aplicar-animaciones-globales';
import { MotionConfig } from 'motion/react';

import './estilos/public-site.css';
import './estilos/tema-editorial.css';
import './estilos/responsive-movil.css';

import PublicHeader from './componentes/PublicHeader';
import PublicFooter from './componentes/PublicFooter';
import Precarga from './componentes/Precarga';
import BarraMovil from './componentes/BarraMovil';
import { usePrecargaTerminada } from './lib/precarga';
import { iniciarCacheRecursos, precargarImagenes } from './lib/cacheRecursos';
import { urlPortada } from './lib/formato';
import { useCatalogo, useEmpresa } from './hooks/useApiPublica';
import { useMovimientoReducido } from './hooks/useEntorno';
import { irASeccion, ScrollTrigger, useScrollSuave } from './animacion/scroll';
import { PAGINAS, SITIO } from './config/site';
import { TiendaProvider } from './tienda/TiendaContext';
import PilaCarrito from './tienda/PilaCarrito';
import './tienda/tienda.css';
// Va al final: el estilo formal manda sobre los demás estilos de la web.
import './estilos/formal.css';
// Última capa visual: dirección «editorial luminoso» (ver DESIGN.md).
import './estilos/editorial-luminoso.css';
import './estilos/editorial-ajustes.css';
// Aplicación y Descargar: tarjetas y portadas afinadas (mismo contenido).
import './estilos/app-descarga.css';
// El pie se cierra al final: manda sobre los temas y no se mezcla con ellos.
import './componentes/public-footer.css';
import AsistenteTienda from './asistente/AsistenteTienda';

// ============================================================
// WEB PÚBLICA — layout común de las páginas (Inicio, Catálogo,
// Aplicación, Características, Nosotros, Descargar).
// ============================================================

function metadatos(ruta) {
    const pagina = PAGINAS[ruta] || (ruta.startsWith('/libro/') ? PAGINAS['/libro'] : PAGINAS['/']);
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

    const catalogo = useCatalogo(null, !pathname.startsWith('/libro/'));
    const legal = useEmpresa();
    const cargada = usePrecargaTerminada();

    useEffect(() => { iniciarCacheRecursos(); }, []);
    useEffect(() => {
        if (!catalogo.libros.length) return undefined;
        // Dejar primero la red y la GPU al protagonista; el resto se prepara
        // en segundo plano, con dos descargas simultáneas y prioridad baja.
        let observador;
        const comenzar = () => {
            if (document.querySelector('.portada3d[aria-busy="true"]')) return false;
            observador?.disconnect();
            precargarImagenes(catalogo.libros.flatMap((l) => [urlPortada(l.portada, 480), urlPortada(l.portada, 320)]));
            return true;
        };
        const t = setTimeout(() => {
            if (comenzar()) return;
            observador = new MutationObserver(comenzar);
            observador.observe(pagina.current, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-busy'] });
        }, 2500);
        return () => { clearTimeout(t); observador?.disconnect(); };
    }, [catalogo.libros]);

    useEffect(() => {
        if (!cargada || !pagina.current) return undefined;
        return aplicarAnimacionesGlobales(pagina.current);
    }, [pathname, cargada]);

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
            <TiendaProvider catalogo={catalogo}><div className="sitio" ref={pagina}>
                <a className="saltar" href="#contenido">Saltar al contenido</a>
                <PublicHeader />
                <main id="contenido">
                    <Outlet context={{ reducido, catalogo, legal, irArriba: () => {
                        if(lenis.current)lenis.current.scrollTo(0,{immediate:true});else window.scrollTo(0,0);
                    } }} />
                </main>
                <PublicFooter legal={legal} />
                <BarraMovil />
                <PilaCarrito />
                <Precarga />
                <AsistenteTienda legal={legal}/>
            </div></TiendaProvider>
        </MotionConfig>
    );
}
