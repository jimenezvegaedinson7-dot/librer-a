/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react';

import { FaCircleCheck, FaCircleExclamation, FaCircleInfo, FaXmark } from 'react-icons/fa6';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const ToastContext = createContext(null);

const iconos = {
    success: FaCircleCheck,
    error: FaCircleExclamation,
    info: FaCircleInfo,
};

// Toast en tinta con acento por tipo: legible sobre el tema claro y el oscuro
const acentos = {
    success: '#4ade80',
    error: '#f87171',
    info: '#dcbb7a',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const contador = useRef(0);
    const reducirMovimiento = useReducedMotion();

    const eliminar = useCallback((id) => {
        setToasts((actuales) => actuales.filter((t) => t.id !== id));
    }, []);

    const mostrar = useCallback(
        (mensaje, tipo = 'success', duracion = 3500) => {
            const id = ++contador.current;
            setToasts((actuales) => [...actuales, { id, mensaje, tipo }]);
            if (duracion > 0) {
                setTimeout(() => eliminar(id), duracion);
            }
        },
        [eliminar],
    );

    const value = { mostrar, exito: (m) => mostrar(m, 'success'), error: (m) => mostrar(m, 'error') };

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-end gap-2 sm:left-auto sm:right-5 sm:top-5">
                <AnimatePresence initial={false}>
                    {toasts.map((toast) => {
                        const Icono = iconos[toast.tipo] || iconos.info;
                        const acento = acentos[toast.tipo] || acentos.info;
                        return (
                            <motion.div
                                key={toast.id}
                                layout={!reducirMovimiento}
                                role={toast.tipo === 'error' ? 'alert' : 'status'}
                                aria-live={toast.tipo === 'error' ? 'assertive' : 'polite'}
                                initial={reducirMovimiento ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
                                transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
                                className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#1f1a17] py-3.5 pl-4 pr-3 text-[#f5eedf] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)]"
                            >
                                <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: acento }} aria-hidden="true" />
                                <span className="mt-0.5 shrink-0 text-base" style={{ color: acento }} aria-hidden="true"><Icono /></span>
                                <p className="flex-1 text-sm font-medium leading-5">{toast.mensaje}</p>
                                <button
                                    type="button"
                                    onClick={() => eliminar(toast.id)}
                                    className="-my-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#cfc5b8] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dcbb7a]"
                                    aria-label="Cerrar notificación"
                                >
                                    <FaXmark className="text-xs" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast debe usarse dentro de <ToastProvider>');
    }
    return context;
}
