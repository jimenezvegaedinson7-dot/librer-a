/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react';

import { FaCircleCheck, FaCircleExclamation, FaXmark } from 'react-icons/fa6';

const ToastContext = createContext(null);

const iconos = {
    success: FaCircleCheck,
    error: FaCircleExclamation,
    info: FaCircleCheck,
};

const estilos = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-primary-100 bg-primary-50 text-primary-800',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const contador = useRef(0);

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

            <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-2">
                {toasts.map((toast) => {
                    const Icono = iconos[toast.tipo];
                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg ${estilos[toast.tipo]}`}
                        >
                            <span className="mt-0.5"><Icono /></span>
                            <p className="flex-1 text-sm font-semibold">{toast.mensaje}</p>
                            <button
                                type="button"
                                onClick={() => eliminar(toast.id)}
                                className="text-current opacity-70 transition hover:opacity-100"
                                aria-label="Cerrar notificación"
                            >
                                <FaXmark />
                            </button>
                        </div>
                    );
                })}
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
