import { useEffect } from 'react';

// Las pantallas del panel no se indexan y llevan su propio título. La web
// pública (/) define el suyo; index.html trae los metadatos públicos.
export function usePaginaPanel(titulo = 'Panel administrativo') {
    useEffect(() => {
        document.title = `${titulo} · Librería del Saber`;
        let meta = document.querySelector('meta[name="robots"]');
        const previo = meta?.getAttribute('content') ?? null;
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'robots');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', 'noindex, nofollow');
        return () => {
            if (previo === null) meta.remove();
            else meta.setAttribute('content', previo);
        };
    }, [titulo]);
}
