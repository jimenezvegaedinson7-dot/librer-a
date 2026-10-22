import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

import AppRouter from './router/AppRouter';
import ErrorBoundary from './ErrorBoundary';

// Arranca en paralelo a las rutas públicas: la escena no espera a que React
// monte el inicio para descargar Three.js. No retrasa el render de la página.
if (location.pathname === '/' && innerHeight > 600
    && !matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData) {
    import('../web/secciones/portada3d/escenaLibro').catch(() => {});
}

// Tras una publicación nueva, una pestaña abierta con la versión anterior
// pide archivos que ya no existen. En ese caso se recarga una sola vez para
// traer la versión actual (sin bucles si el fallo persiste).
const CLAVE_RECARGA = 'recarga-por-version';
window.addEventListener('vite:preloadError', (evento) => {
    let yaRecargo = false;
    try { yaRecargo = sessionStorage.getItem(CLAVE_RECARGA) === '1'; sessionStorage.setItem(CLAVE_RECARGA, '1'); } catch { /* sin almacenamiento */ }
    if (yaRecargo) return;
    evento.preventDefault();
    window.location.reload();
});
window.addEventListener('load', () => {
    setTimeout(() => { try { sessionStorage.removeItem(CLAVE_RECARGA); } catch { /* sin almacenamiento */ } }, 10000);
});

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <AppRouter />
        </ErrorBoundary>
    </StrictMode>,
);
