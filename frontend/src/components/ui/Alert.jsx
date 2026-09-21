import { useEffect, useState } from 'react';

import { FaCircleCheck, FaCircleExclamation, FaCircleInfo, FaTriangleExclamation, FaXmark } from 'react-icons/fa6';

const configuracion = {
    success: {
        contenedor: 'border-success/20 border-l-4 border-l-success bg-success-bg text-success',
        Icono: FaCircleCheck,
        iconoClase: 'text-success',
    },
    error: {
        contenedor: 'border-crimson-200 border-l-4 border-l-crimson-500 bg-crimson-50 text-crimson-500',
        Icono: FaCircleExclamation,
        iconoClase: 'text-crimson-500',
    },
    warning: {
        contenedor: 'border-warning/20 border-l-4 border-l-warning bg-warning-bg text-warning',
        Icono: FaTriangleExclamation,
        iconoClase: 'text-warning',
    },
    info: {
        contenedor: 'border-gold-200 border-l-4 border-l-gold-500 bg-gold-100 text-gold-700',
        Icono: FaCircleInfo,
        iconoClase: 'text-gold-600',
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
            className={`flex items-start gap-3 rounded-lg border border-l-4 px-3.5 py-3 text-sm shadow-sm ${contenedor} ${className}`}
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
                    className="shrink-0 rounded-md p-1 opacity-60 transition hover:bg-white/60 hover:opacity-100"
                >
                    <FaXmark />
                </button>
            )}
        </div>
    );
}