import { useEffect } from 'react';

// Avanza un carrusel desplazable de uno en uno, con un recorrido lento, y al
// llegar al final vuelve al inicio. Se detiene mientras la persona lo usa
// (cursor encima, foco, toque), cuando la pestaña no está visible y si el
// sistema pide reducir el movimiento. Si todo cabe en pantalla no hace nada.
export function useCarruselAutomatico(ref, { intervalo = 2600, duracion = 600, activo = true } = {}) {
    useEffect(() => {
        const el = ref.current;
        if (!el || !activo) return undefined;
        const movimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)');

        let cursorDentro = false;
        let focoDentro = false;
        let pausaHasta = 0;
        let cuadro = null;
        let ajusteOriginal = null;
        const pausado = () => cursorDentro || focoDentro || Date.now() < pausaHasta || document.hidden || movimiento?.matches;
        const detener = () => {
            cancelAnimationFrame(cuadro);
            cuadro = null;
            if (ajusteOriginal !== null) {
                el.style.scrollSnapType = ajusteOriginal;
                ajusteOriginal = null;
            }
        };

        const paso = () => {
            const items = el.querySelectorAll(':scope > li, :scope > ul > li');
            if (items.length < 2) return el.clientWidth;
            return Math.abs(items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().left) || el.clientWidth;
        };

        // Desplazamiento suave y lento (ease-in-out) hecho a mano: el "smooth"
        // del navegador es demasiado rápido para un carrusel automático.
        const ir = (destino) => {
            const inicio = el.scrollLeft;
            const distancia = destino - inicio;
            if (Math.abs(distancia) < 1) return;
            detener();
            ajusteOriginal = el.style.scrollSnapType;
            el.style.scrollSnapType = 'none';
            const comienzo = performance.now();
            const tiempo = Math.abs(destino) < 1 ? duracion * 1.4 : duracion;
            const avanzar = (ahora) => {
                const t = Math.min(1, (ahora - comienzo) / tiempo);
                const curva = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                el.scrollLeft = inicio + distancia * curva;
                if (t < 1 && !pausado()) cuadro = requestAnimationFrame(avanzar);
                else detener();
            };
            cuadro = requestAnimationFrame(avanzar);
        };

        const tic = () => {
            if (pausado()) return;
            const maximo = el.scrollWidth - el.clientWidth;
            if (maximo <= 4) return;
            if (el.scrollLeft >= maximo - 4) ir(0);
            else ir(Math.min(maximo, el.scrollLeft + paso()));
        };

        const pausar = () => { cursorDentro = true; detener(); };
        const alSalir = () => { cursorDentro = false; };
        const alTocar = () => { pausaHasta = Date.now() + 6000; detener(); };
        const alFoco = () => { focoDentro = true; detener(); };
        const alPerderFoco = (e) => { focoDentro = el.contains(e.relatedTarget); };
        const alEntorno = () => { if (pausado()) detener(); };

        const reloj = setInterval(tic, intervalo);
        el.addEventListener('pointerenter', pausar);
        el.addEventListener('pointerleave', alSalir);
        el.addEventListener('touchstart', alTocar, { passive: true });
        el.addEventListener('wheel', alTocar, { passive: true });
        el.addEventListener('focusin', alFoco);
        el.addEventListener('focusout', alPerderFoco);
        document.addEventListener('visibilitychange', alEntorno);
        movimiento?.addEventListener?.('change', alEntorno);
        return () => {
            clearInterval(reloj); detener();
            el.removeEventListener('pointerenter', pausar);
            el.removeEventListener('pointerleave', alSalir);
            el.removeEventListener('touchstart', alTocar);
            el.removeEventListener('wheel', alTocar);
            el.removeEventListener('focusin', alFoco);
            el.removeEventListener('focusout', alPerderFoco);
            document.removeEventListener('visibilitychange', alEntorno);
            movimiento?.removeEventListener?.('change', alEntorno);
        };
    }, [ref, intervalo, duracion, activo]);
}
