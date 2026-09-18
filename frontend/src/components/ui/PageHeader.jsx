import { motion, useReducedMotion } from 'motion/react';

export function PageHeader({ titulo, descripcion, acciones = null, icono = null }) {
    const reducirMovimiento = useReducedMotion();

    return (
        <motion.div
            initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="flex items-center gap-3.5">
                {icono && (
                    <span className="page-header-icon hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary-600 shadow-sm sm:flex">
                        {icono}
                    </span>
                )}
                <div className="border-l-[3px] border-primary-600 pl-3.5">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Gestión administrativa</p>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{titulo}</h1>
                    {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
                </div>
            </div>
            {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </motion.div>
    );
}
