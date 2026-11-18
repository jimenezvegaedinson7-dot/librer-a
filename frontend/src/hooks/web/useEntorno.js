import { useEffect, useState } from 'react';

function detectarPlataforma() {
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
