import { useEffect, useState } from 'react';

// Plataforma del visitante: solo para destacar su descarga, nunca para
// ocultar la otra.
export function detectarPlataforma() {
    if (typeof navigator === 'undefined') return 'otro';
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    return 'otro';
}

export function usePlataforma() {
    const [plataforma] = useState(detectarPlataforma);
    return plataforma;
}

// Se comprueba una sola vez: crear un contexto WebGL cuesta (y antes se
// creaban dos por visita sin liberarlos). El contexto de prueba se libera.
let webgl = null;
const soportaWebGL = () => {
    if (webgl !== null) return webgl;
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        webgl = Boolean(gl);
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
        webgl = false;
    }
    return webgl;
};

// ¿Vale la pena la escena 3D? No con movimiento reducido, ahorro de
// datos, equipos con poca memoria o sin WebGL: ahí va la imagen fija.
export function puedeUsar3D() {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const conexion = navigator.connection;
    if (conexion?.saveData) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return false;
    return soportaWebGL();
}

export function useMovimientoReducido() {
    const [reducido, setReducido] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const actualizar = () => setReducido(mq.matches);
        mq.addEventListener('change', actualizar);
        return () => mq.removeEventListener('change', actualizar);
    }, []);
    return reducido;
}
