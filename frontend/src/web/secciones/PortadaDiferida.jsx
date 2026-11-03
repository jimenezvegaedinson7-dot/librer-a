import { lazy, Suspense, useEffect, useState } from 'react';

import PortadaLigera from './PortadaLigera';

// La portada 3D pesa (GSAP + escena WebGL). Se descarga después de la primera
// pintura y solo cuando el navegador está libre; mientras tanto se muestra la
// portada ligera con el mismo libro real. Si el equipo pide ahorro de datos o
// la red es lenta, la web se queda en la versión ligera.
const cargarPortada = () => import('./portada3d/PortadaEspacial');
const PortadaEspacial = lazy(cargarPortada);

function conexionLimitada() {
    const conexion = typeof navigator !== 'undefined' ? navigator.connection : null;
    return Boolean(conexion?.saveData) || /(^|-)2g$/.test(conexion?.effectiveType || '');
}

export default function PortadaDiferida({ reducido, catalogo }) {
    const [lista, setLista] = useState(false);
    const [enTope, setEnTope] = useState(() => typeof window === 'undefined' || window.scrollY < 80);
    const [montada, setMontada] = useState(false);

    useEffect(() => {
        if (conexionLimitada()) return undefined;
        let cancelado = false;
        const activar = () => {
            if (cancelado) return;
            cargarPortada()
                .then(() => { if (!cancelado) setLista(true); })
                .catch(() => { /* se conserva la portada ligera */ });
        };
        const inactivo = window.requestIdleCallback
            ? window.requestIdleCallback(activar, { timeout: 1500 })
            : window.setTimeout(activar, 400);
        return () => {
            cancelado = true;
            if (window.cancelIdleCallback) window.cancelIdleCallback(inactivo);
            else window.clearTimeout(inactivo);
        };
    }, []);

    useEffect(() => {
        if (montada) return undefined;
        const medir = () => setEnTope(window.scrollY < 80);
        medir();
        window.addEventListener('scroll', medir, { passive: true });
        return () => window.removeEventListener('scroll', medir);
    }, [montada]);

    // Solo se sustituye la portada ligera cuando el visitante sigue arriba:
    // así la escena de 360svh no aparece a mitad de un desplazamiento. Una vez
    // montada se mantiene aunque se baje, para no desmontar la animación.
    if (lista && enTope && !montada) setMontada(true);

    if (!montada) return <PortadaLigera catalogo={catalogo} />;

    return (
        <Suspense fallback={<PortadaLigera catalogo={catalogo} />}>
            <PortadaEspacial reducido={reducido} catalogo={catalogo} />
        </Suspense>
    );
}
