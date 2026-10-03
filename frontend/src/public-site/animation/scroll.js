import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };

// Scroll nativo. Lenis (scroll suave por JavaScript) se retiró: retrasaba
// cada movimiento de la rueda y el inicio y Nosotros se sentían trabados,
// sobre todo en equipos modestos. El hook se mantiene para no tocar a quien
// lo usa: devuelve una referencia vacía y irASeccion cae al scroll nativo.
// eslint-disable-next-line no-unused-vars
export function useScrollSuave(_activo) {
    return useRef(null);
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
