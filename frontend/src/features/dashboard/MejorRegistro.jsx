import { motion, useReducedMotion } from 'motion/react';

const entrada = {
    oculto: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } },
};

export default function MejorRegistro({ icono, etiqueta, principal, detalle, vacio }) {
    const reducirMovimiento = useReducedMotion();
    return (
        <motion.article variants={reducirMovimiento ? undefined : entrada} className="registro-card">
            <span className="ficha-icono flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base" aria-hidden="true">
                {icono}
            </span>
            <div className="min-w-0">
                <p className="kpi-label">{etiqueta}</p>
                <p className={`registro-principal ${vacio ? 'registro-principal--vacio' : ''}`}>{principal}</p>
                <p className="mt-0.5 text-[13px] text-[#766d62]">{detalle}</p>
            </div>
        </motion.article>
    );
}
