import { lazy, Suspense, useEffect, useState } from 'react';
import PortadaLigera from './PortadaLigera';

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
                .then(() => {
                    if (!cancelado) setLista(true);
                })
                .catch(() => {});
        };
        const inactivo = window.requestIdleCallback ? window.requestIdleCallback(activar, { timeout: 1500 }) : window.setTimeout(activar, 400);
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

    if (lista && enTope && !montada) setMontada(true);

    if (!montada) return <PortadaLigera catalogo={catalogo} />;

    return (
        <Suspense fallback={<PortadaLigera catalogo={catalogo} />}>
            <PortadaEspacial reducido={reducido} catalogo={catalogo} />
        </Suspense>
    );
}
