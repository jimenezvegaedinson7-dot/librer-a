import { motion, useReducedMotion } from 'motion/react';

export function EmptyState({ titulo, descripcion, acciones = null, icono = null }) {
    const reducirMovimiento = useReducedMotion();

    return (
        <motion.div
            initial={reducirMovimiento ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            className="empty-state flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-parchment-50 px-6 py-14 text-center"
        >
            {icono && (
                <div className="empty-state-icono mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold-200 bg-gold-50 text-xl text-gold-700">
                    {icono}
                </div>
            )}
            <h3 className="font-title text-[17px] font-semibold text-slate-900">{titulo}</h3>
            {descripcion && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{descripcion}</p>}
            {acciones && <div className="mt-5 flex flex-wrap justify-center gap-2">{acciones}</div>}
        </motion.div>
    );
}
