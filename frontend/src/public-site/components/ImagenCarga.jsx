import { useCallback, useState } from 'react';

// Imagen que avisa cuándo terminó de cargar (atributo data-cargada). El
// contenedor muestra un indicador giratorio mientras tanto (ver formal.css).
export default function ImagenCarga({ onLoad, onError, ...props }) {
    const [cargada, setCargada] = useState(false);
    // Las imágenes en caché ya llegan completas antes de escuchar onLoad.
    const revisar = useCallback((img) => {
        if (img?.complete && img.naturalWidth > 0) setCargada(true);
    }, []);
    return (
        <img
            ref={revisar}
            {...props}
            data-cargada={cargada ? '' : undefined}
            onLoad={(e) => { setCargada(true); onLoad?.(e); }}
            onError={(e) => { setCargada(true); onError?.(e); }}
        />
    );
}
