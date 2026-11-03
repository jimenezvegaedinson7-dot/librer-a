import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';

import './estilos/public-site.css';
import './estilos/tema-editorial.css';

import PublicHeader from './componentes/PublicHeader';
import PublicFooter from './componentes/PublicFooter';
import BarraMovil from './componentes/BarraMovil';
import { iniciarCacheRecursos } from './lib/cacheRecursos';
import { useCatalogo, useEmpresa } from './hooks/useApiPublica';
import { useMovimientoReducido } from './hooks/useEntorno';
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
// Los ajustes de tamaño deben prevalecer sobre las capas visuales anteriores.
import './estilos/responsive-movil.css';
import './estilos/limpia.css';
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
    const pagina = useRef(null);
    const rutaPrevia = useRef(null);
    const { pathname, hash } = useLocation();

    const catalogo = useCatalogo(null, !pathname.startsWith('/libro/'));
    const legal = useEmpresa();

    useEffect(() => { iniciarCacheRecursos(); }, []);

    // Cambio de página: arriba, metadatos y foco en su título.
    useEffect(() => {
        metadatos(pathname);
        const anterior = rutaPrevia.current;
        rutaPrevia.current = pathname;
        if (anterior === pathname) return undefined;
        // Con ancla en la url no se toca el scroll: de eso se encarga el
        // efecto de abajo, que espera a que exista la sección.
        if (!hash) {
            window.scrollTo(0, 0);
        }
        // El foco en el título solo tiene sentido al navegar, no al recargar.
        if (anterior !== null) {
            let observador;
            const enfocar = () => {
                const titulo = pagina.current?.querySelector('main h1');
                if (!titulo || !titulo.getClientRects().length) return false;
                titulo.setAttribute('tabindex', '-1');
                titulo.focus({ preventScroll: true });
                observador?.disconnect();
                return true;
            };
            if (enfocar()) return undefined;
            observador = new MutationObserver(enfocar);
            observador.observe(pagina.current, { childList: true, subtree: true });
            const limite = setTimeout(() => observador.disconnect(), 5000);
            return () => { clearTimeout(limite); observador.disconnect(); };
        }
        return undefined;
    }, [pathname, hash]);

    // Enlaces con ancla (p. ej. /nosotros#tienda): baja a esa sección cuando la
    // página ya está montada, también si su módulo llega después de la ruta.
    useEffect(() => {
        const id = decodeURIComponent(hash.replace('#', ''));
        if (!id) return undefined;
        let observador;
        const encontrar = () => {
            const destino = document.getElementById(id);
            if (!destino) return false;
            destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
            const foco = destino.querySelector('h1, h2') || destino;
            foco.setAttribute('tabindex', '-1');
            foco.focus({ preventScroll: true });
            observador?.disconnect();
            return true;
        };
        if (encontrar()) return undefined;
        observador = new MutationObserver(encontrar);
        observador.observe(pagina.current, { childList: true, subtree: true });
        const t = setTimeout(() => observador.disconnect(), 5000);
        return () => { clearTimeout(t); observador.disconnect(); };
    }, [pathname, hash, reducido]);

    return (
        <MotionConfig reducedMotion="user">
            <TiendaProvider catalogo={catalogo}><div className="sitio" ref={pagina}>
                <a className="saltar" href="#contenido">Saltar al contenido</a>
                <PublicHeader />
                <main id="contenido">
                    <Outlet context={{ reducido, catalogo, legal, irArriba: () => {
                        window.scrollTo(0,0);
                    } }} />
                </main>
                <PublicFooter legal={legal} />
                <BarraMovil />
                <PilaCarrito />
                <AsistenteTienda legal={legal}/>
            </div></TiendaProvider>
        </MotionConfig>
    );
}
