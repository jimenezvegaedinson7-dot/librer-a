import { useEffect } from 'react';

import { FaXmark } from 'react-icons/fa6';

import { Button } from './Button';

export function Modal({
    abierto,
    titulo,
    subtitulo,
    onCerrar,
    children,
    grande = false,
    footer = null,
}) {
    useEffect(() => {
        if (!abierto) return undefined;
        const manejarTecla = (e) => {
            if (e.key === 'Escape') onCerrar();
        };
        document.addEventListener('keydown', manejarTecla);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', manejarTecla);
            document.body.style.overflow = '';
        };
    }, [abierto, onCerrar]);

    if (!abierto) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="animate-solapa absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
                onClick={onCerrar}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                className={`animate-modal relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ${
                    grande ? 'max-w-3xl' : 'max-w-lg'
                }`}
            >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900">{titulo}</h2>
                        {subtitulo && <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>}
                    </div>
                    <Button
                        variante="ghost"
                        tamano="sm"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="!h-8 !w-8 !p-0"
                    >
                        <FaXmark />
                    </Button>
                </div>

                <div className="overflow-y-auto p-5">{children}</div>

                {footer && (
                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}