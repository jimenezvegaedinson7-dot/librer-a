import { useCallback, useEffect, useRef, useState } from 'react';

export default function ImagenCarga({ onLoad, onError, src, srcSet, loading, ...props }) {
    const [cargada, setCargada] = useState(false);
    const [cercana, setCercana] = useState(() => loading !== 'lazy' || typeof IntersectionObserver === 'undefined');
    const imagen = useRef(null);
    const mostrar = cercana || loading !== 'lazy';

    useEffect(() => {
        if (mostrar || !imagen.current) return undefined;
        const observador = new IntersectionObserver(
            ([entrada]) => {
                if (!entrada.isIntersecting) return;
                setCercana(true);
                observador.disconnect();
            },
            { rootMargin: '300px 0px' }
        );
        observador.observe(imagen.current);
        return () => observador.disconnect();
    }, [mostrar]);

    const revisar = useCallback((img) => {
        imagen.current = img;
        if (img?.complete && img.naturalWidth > 0) setCargada(true);
    }, []);
    return (
        <img
            ref={revisar}
            {...props}
            src={mostrar ? src : undefined}
            srcSet={mostrar ? srcSet : undefined}
            loading={loading}
            data-cargada={cargada ? '' : undefined}
            onLoad={(e) => {
                setCargada(true);
                onLoad?.(e);
            }}
            onError={(e) => {
                setCargada(true);
                onError?.(e);
            }}
        />
    );
}
