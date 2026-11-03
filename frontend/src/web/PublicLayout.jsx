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
import { TiendaProvider } from './tienda/TiendaProvider';
import PilaCarrito from './tienda/PilaCarrito';
import './tienda/tienda.css';
import './estilos/formal.css';
import './estilos/editorial-luminoso.css';
import './estilos/editorial-ajustes.css';
import './estilos/app-descarga.css';
import './componentes/public-footer.css';
import './estilos/responsive-movil.css';
import './estilos/limpia.css';
import AsistenteTienda from './asistente/AsistenteTienda';

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
                    <AsistenteTienda legal={legal} />
                </div>
            </TiendaProvider>
        </MotionConfig>
    );
}
