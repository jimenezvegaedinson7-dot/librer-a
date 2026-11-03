import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AppRouter from './router/AppRouter';
import ErrorBoundary from './ErrorBoundary';

const CLAVE_RECARGA = 'recarga-por-version';
window.addEventListener('vite:preloadError', (evento) => {
    let yaRecargo = false;
    try {
        yaRecargo = sessionStorage.getItem(CLAVE_RECARGA) === '1';
        sessionStorage.setItem(CLAVE_RECARGA, '1');
    } catch {}
    if (yaRecargo) return;
    evento.preventDefault();
    window.location.reload();
});
window.addEventListener('load', () => {
    setTimeout(() => {
        try {
            sessionStorage.removeItem(CLAVE_RECARGA);
        } catch {}
    }, 10000);
});

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <AppRouter />
        </ErrorBoundary>
    </StrictMode>
);
