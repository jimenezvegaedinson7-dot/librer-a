import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

// Cuenta desde 0 hasta el valor al aparecer la tarjeta. Con "reducir
// movimiento" (o un valor 0) muestra el número final directamente.
export function useContador(valor, duracion = 900) {
    const reducir = useReducedMotion();
    const destino = Number(valor) || 0;
    const [actual, setActual] = useState(0);
    useEffect(() => {
        if (reducir || destino === 0) return undefined;
        let marco;
        const inicio = performance.now();
        const paso = (ahora) => {
            const t = Math.min(1, (ahora - inicio) / duracion);
            setActual(Math.round(destino * (1 - (1 - t) ** 3)));
            if (t < 1) marco = requestAnimationFrame(paso);
        };
        marco = requestAnimationFrame(paso);
        return () => cancelAnimationFrame(marco);
    }, [destino, duracion, reducir]);
    return reducir || destino === 0 ? destino : actual;
}
