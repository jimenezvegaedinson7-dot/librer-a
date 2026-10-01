import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };

// Scroll suave con Lenis, sincronizado con ScrollTrigger (un solo reloj:
// el ticker de GSAP). Sin Lenis con movimiento reducido: scroll nativo.
export function useScrollSuave(activo) {
    const lenisRef = useRef(null);

    useEffect(() => {
        if (!activo) return undefined;
        const lenis = new Lenis({ lerp: 0.11, smoothWheel: true, syncTouch: false });
        const tick = (tiempo) => lenis.raf(tiempo * 1000);
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        lenisRef.current = lenis;
        return () => {
            gsap.ticker.remove(tick);
            lenis.destroy();
            lenisRef.current = null;
        };
    }, [activo]);

    return lenisRef;
}

// Navega a una sección y deja el foco en su título, para teclado y lectores.
export function irASeccion(id, lenis) {
    const destino = document.getElementById(id);
    if (!destino) return;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const enfocar = () => {
        const foco = destino.querySelector('h1, h2') || destino;
        foco.setAttribute('tabindex', '-1');
        foco.focus({ preventScroll: true });
    };
    if (lenis) lenis.scrollTo(destino, { offset: id === 'inicio' ? 0 : -72, duration: 1.2, onComplete: enfocar });
    else {
        destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
        enfocar();
    }
    history.replaceState(null, '', id === 'inicio' ? window.location.pathname : `#${id}`);
}
