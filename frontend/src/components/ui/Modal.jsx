import { useEffect } from 'react';

import { FaXmark } from 'react-icons/fa6';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { Button } from './Button';

export function Modal({
    abierto,
    titulo,
    subtitulo,
    onCerrar,
    children,
    grande = false,
    footer = null,
    className = '',
}) {
    const reducirMovimiento = useReducedMotion();

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

    return (
        <AnimatePresence>
            {abierto && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 ${className}`}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reducirMovimiento ? 0 : 0.18 }}
                        className="absolute inset-0 bg-mahogany-900/40 backdrop-blur-sm"
                        onClick={onCerrar}
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={reducirMovimiento ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
                        transition={{ duration: reducirMovimiento ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                        role="dialog"
                        aria-modal="true"
                        className={`modal-panel relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-primary-100 bg-parchment-50 shadow-2xl ${
                            grande ? 'max-w-3xl' : 'max-w-lg'
                        }`}
                    >
                        <div className="modal-header flex items-center justify-between gap-3 border-b border-primary-100 px-5 py-4">
                            <div className="min-w-0">
                                <h2 className="font-sans text-base font-semibold text-[#0f172a]">{titulo}</h2>
                                {subtitulo && <p className="mt-0.5 text-xs text-primary-400">{subtitulo}</p>}
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

                        <div className="modal-body overflow-y-auto p-5 sm:p-6">{children}</div>

                        {footer && (
                            <div className="flex items-center justify-end gap-3 border-t border-primary-100 bg-parchment-100 px-5 py-3.5">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
