import { useEffect, useEffectEvent } from 'react';

export function useCarga(cargar, clave = null, habilitado = true, espera = 0) {
    const ejecutar = useEffectEvent(cargar);

    useEffect(() => {
        if (!habilitado) return undefined;
        let vigente = true;
        const temporizador = setTimeout(() => ejecutar(() => vigente), espera);
        return () => {
            vigente = false;
            clearTimeout(temporizador);
        };
    }, [clave, habilitado, espera]);
}
