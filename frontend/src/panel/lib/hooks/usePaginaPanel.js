import { useEffect } from 'react';

export function usePaginaPanel(titulo = 'Panel administrativo') {
    useEffect(() => {
        if (!document.getElementById('fuentes-panel')) {
            const fuentes = document.createElement('link');
            fuentes.id = 'fuentes-panel';
            fuentes.rel = 'stylesheet';
            fuentes.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&display=swap';
            document.head.appendChild(fuentes);
        }
        document.title = `${titulo} · Panel administrativo`;
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
