import { useEffect, useId, useRef } from 'react';

import { FaXmark } from 'react-icons/fa6';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { Button } from './Button';

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
    abierto,
    titulo,
    subtitulo,
    onCerrar,
    children,
    grande = false,
    footer = null,
}) {
    const reducirMovimiento = useReducedMotion();
    const panelRef = useRef(null);
    const idTitulo = useId();
    const idSubtitulo = useId();

    // Escape, bloqueo de scroll del fondo y contención del foco dentro del diálogo
    useEffect(() => {
        if (!abierto) return undefined;
        const manejarTecla = (e) => {
            if (e.key === 'Escape') {
                onCerrar();
                return;
            }
            if (e.key !== 'Tab' || !panelRef.current) return;
            const enfocables = [...panelRef.current.querySelectorAll(ENFOCABLES)].filter((el) => el.offsetParent !== null);
            if (enfocables.length === 0) {
                e.preventDefault();
                return;
            }
            const primero = enfocables[0];
            const ultimo = enfocables[enfocables.length - 1];
            if (e.shiftKey && (document.activeElement === primero || !panelRef.current.contains(document.activeElement))) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault();
                primero.focus();
            }
        };
        document.addEventListener('keydown', manejarTecla);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', manejarTecla);
            document.body.style.overflow = '';
        };
    }, [abierto, onCerrar]);

    // Al abrir, lleva el foco al diálogo (o a su campo con autoFocus); al cerrar, lo devuelve al disparador
    useEffect(() => {
        if (!abierto) return undefined;
        const previo = document.activeElement;
        const marco = requestAnimationFrame(() => {
            if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
                panelRef.current.focus({ preventScroll: true });
            }
        });
        return () => {
            cancelAnimationFrame(marco);
            if (previo instanceof HTMLElement && document.contains(previo)) previo.focus({ preventScroll: true });
        };
    }, [abierto]);

    return (
        <AnimatePresence>
            {abierto && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reducirMovimiento ? 0 : 0.2 }}
                        className="absolute inset-0 bg-[#1c1814]/55 backdrop-blur-[3px]"
                        onClick={onCerrar}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={panelRef}
                        tabIndex={-1}
                        initial={reducirMovimiento ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.99 }}
                        transition={{ duration: reducirMovimiento ? 0 : 0.26, ease: [0.25, 1, 0.5, 1] }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titulo ? idTitulo : undefined}
                        aria-describedby={subtitulo ? idSubtitulo : undefined}
                        className={`modal-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl outline-none sm:max-h-[90vh] sm:rounded-2xl ${
                            grande ? 'sm:max-w-3xl' : 'sm:max-w-lg'
                        }`}
                    >
                        <span className="modal-asa mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
                        <div className="modal-header flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
                            <div className="min-w-0">
                                {titulo && (
                                    <h2 id={idTitulo} className="font-title text-[19px] font-semibold leading-snug text-slate-900">
                                        {titulo}
                                    </h2>
                                )}
                                {subtitulo && <p id={idSubtitulo} className="mt-0.5 text-[13px] text-slate-500">{subtitulo}</p>}
                            </div>
                            <Button
                                variante="ghost"
                                tamano="sm"
                                onClick={onCerrar}
                                aria-label="Cerrar"
                                className="-mr-1.5 !h-8 !w-8 shrink-0 !p-0"
                            >
                                <FaXmark />
                            </Button>
                        </div>

                        <div className="modal-body overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>

                        {footer && (
                            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
