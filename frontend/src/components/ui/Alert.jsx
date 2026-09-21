import { useEffect, useState } from 'react';

import { FaCircleCheck, FaCircleExclamation, FaCircleInfo, FaTriangleExclamation, FaXmark } from 'react-icons/fa6';

const configuracion = {
    success: {
        contenedor: 'border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50 text-emerald-700',
        Icono: FaCircleCheck,
        iconoClase: 'text-emerald-500',
    },
    error: {
        contenedor: 'border-crimson-200 border-l-4 border-l-crimson-500 bg-crimson-50 text-crimson-600',
        Icono: FaCircleExclamation,
        iconoClase: 'text-crimson-500',
    },
    warning: {
        contenedor: 'border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 text-amber-700',
        Icono: FaTriangleExclamation,
        iconoClase: 'text-amber-500',
    },
    info: {
        contenedor: 'border-sky-200 border-l-4 border-l-sky-500 bg-sky-50 text-sky-700',
        Icono: FaCircleInfo,
        iconoClase: 'text-sky-500',
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
            className={`flex items-start gap-3 rounded-xl border border-l-4 px-4 py-3 text-sm shadow-sm ${contenedor} ${className}`}
        >
            <span className={`mt-0.5 shrink-0 text-base ${iconoClase}`}>
                <Icono />
            </span>
            <div className="min-w-0 flex-1">
                {titulo && <p className="mb-0.5 font-bold">{titulo}</p>}
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
                    className="shrink-0 rounded-lg p-1 opacity-60 transition hover:bg-white/60 hover:opacity-100"
                >
                    <FaXmark />
                </button>
            )}
        </div>
    );
}
