import { useCallback, useState } from 'react';

export default function ImagenCarga({ onLoad, onError, ...props }) {
    const [cargada, setCargada] = useState(false);

    const revisar = useCallback((img) => {
        if (img?.complete && img.naturalWidth > 0) setCargada(true);
    }, []);
    return (
        <img
            ref={revisar}
            {...props}
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
