
import { motion, useReducedMotion } from 'motion/react';


const entrada = {
    oculto: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } },
};

const estatica = { oculto: { opacity: 1 }, visible: { opacity: 1 } };

export default function MejorRegistro({ icono, etiqueta, principal, detalle, vacio }) {
    const reducirMovimiento = useReducedMotion();
    return (
        <motion.article variants={reducirMovimiento ? estatica : entrada} className="registro-card">
            <span className="registro-icono" aria-hidden="true">
                {icono}
            </span>
            <div className="min-w-0">
                <p className="kpi-label">{etiqueta}</p>
                <p className={`registro-principal ${vacio ? 'registro-principal--vacio' : ''}`}>{principal}</p>
                <p className="registro-detalle">{detalle}</p>
            </div>
        </motion.article>
    );
}
