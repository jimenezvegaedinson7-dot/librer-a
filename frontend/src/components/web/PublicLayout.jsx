import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import '../../styles/web/public-site.css';
import '../../styles/web/tema-editorial.css';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import BarraMovil from './BarraMovil';
import { iniciarCacheRecursos } from '../../services/web/cacheRecursos';
import { useCatalogo, useEmpresa } from '../../hooks/web/useApiPublica';
import { useMovimientoReducido } from '../../hooks/web/useEntorno';
import { PAGINAS, SITIO } from '../../models/config/web/site';
import { TiendaProvider } from './tienda/TiendaProvider';
import PilaCarrito from './tienda/PilaCarrito';
import '../../styles/web/tienda.css';
import '../../styles/web/formal-base.css';
import '../../styles/web/formal-compra.css';
import '../../styles/web/formal-cuenta.css';
import '../../styles/web/formal-favoritos.css';
import '../../styles/web/formal-catalogo.css';
import '../../styles/web/editorial-luminoso.css';
import '../../styles/web/editorial-ajustes.css';
import '../../styles/web/app-descarga.css';
import './public-footer.css';
import '../../styles/web/responsive-movil.css';
import '../../styles/web/limpia.css';
import '../../styles/web/botones-vortex.css';
import '../../styles/web/secciones-casa.css';

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

    useEffect(() => {
        iniciarCacheRecursos();
        if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
        const volverAlInicio = () => {
            if (!window.location.hash) window.scrollTo(0, 0);
        };
        volverAlInicio();
        const cuadro = requestAnimationFrame(volverAlInicio);
        window.addEventListener('load', volverAlInicio);
        return () => {
            cancelAnimationFrame(cuadro);
            window.removeEventListener('load', volverAlInicio);
        };
    }, []);

    useEffect(() => {
        metadatos(pathname);
        const anterior = rutaPrevia.current;
        rutaPrevia.current = pathname;
        if (anterior === pathname) return undefined;

        if (!hash) {
            window.scrollTo(0, 0);
        }

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
            return () => {
                clearTimeout(limite);
                observador.disconnect();
            };
        }
        return undefined;
    }, [pathname, hash]);

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
        return () => {
            clearTimeout(t);
            observador.disconnect();
        };
    }, [pathname, hash, reducido]);

    return (
        <MotionConfig reducedMotion="user">
            <TiendaProvider catalogo={catalogo}>
                <div className="sitio" ref={pagina}>
                    <a className="saltar" href="#contenido">
                        Saltar al contenido
                    </a>
                    <PublicHeader />
                    <main id="contenido">
                        <Outlet
                            context={{
                                reducido,
                                catalogo,
                                legal,
                                irArriba: () => {
                                    window.scrollTo(0, 0);
                                }
                            }}
                        />
                    </main>
                    <PublicFooter legal={legal} />
                    <BarraMovil />
                    <PilaCarrito />
                </div>
            </TiendaProvider>
        </MotionConfig>
    );
}
