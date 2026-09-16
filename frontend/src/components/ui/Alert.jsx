import { useEffect, useState } from 'react';

import { FaCircleCheck, FaCircleExclamation, FaCircleInfo, FaTriangleExclamation, FaXmark } from 'react-icons/fa6';

const configuracion = {
    success: {
        contenedor: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        Icono: FaCircleCheck,
        iconoClase: 'text-emerald-600',
    },
    error: {
        contenedor: 'border-red-200 bg-red-50 text-red-800',
        Icono: FaCircleExclamation,
        iconoClase: 'text-red-600',
    },
    warning: {
        contenedor: 'border-amber-200 bg-amber-50 text-amber-800',
        Icono: FaTriangleExclamation,
        iconoClase: 'text-amber-600',
    },
    info: {
        contenedor: 'border-primary-100 bg-primary-50 text-primary-800',
        Icono: FaCircleInfo,
        iconoClase: 'text-primary-600',
    },
};

export function Alert({
    tipo = 'success',
    titulo = null,
    children,
    cerrar = false,
    autoCerrarMs = null,
    onCerrar = null,
    className = '',
}) {
    const { contenedor, Icono, iconoClase } = configuracion[tipo] || configuracion.info;
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!autoCerrarMs || autoCerrarMs <= 0) return undefined;
        const temporizador = setTimeout(() => {
            setVisible(false);
            onCerrar?.();
        }, autoCerrarMs);
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoCerrarMs]);

    useEffect(() => {
        setVisible(true);
    }, [tipo, children]);

    if (!visible) return null;

    const puedeCerrar = cerrar || onCerrar;

    return (
        <div
            role="alert"
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${contenedor} ${className}`}
        >
            <span className={`mt-0.5 shrink-0 ${iconoClase}`}>
                <Icono />
            </span>
            <div className="min-w-0 flex-1">
                {titulo && <p className="mb-0.5 font-semibold">{titulo}</p>}
                <div className="leading-relaxed">{children}</div>
            </div>
            {puedeCerrar && (
                <button
                    type="button"
                    onClick={() => {
                        setVisible(false);
                        onCerrar?.();
                    }}
                    aria-label="Cerrar aviso"
                    className="shrink-0 rounded-md p-1 opacity-60 transition hover:opacity-100"
                >
                    <FaXmark />
                </button>
            )}
        </div>
    );
}
