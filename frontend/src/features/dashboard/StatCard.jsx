import { motion, useReducedMotion } from 'motion/react';

// Tonos semánticos; "primary" es la tarjeta destacada en burdeos de marca.
const tonos = {
    primary: 'kpi-card--destacada',
    success: 'kpi-tono--success',
    danger: 'kpi-tono--danger',
    warning: 'kpi-tono--warning',
    info: 'kpi-tono--gold',
    neutral: 'kpi-tono--neutral',
};

const entradaTarjeta = {
    oculto: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } },
};

export function StatCard({ titulo, valor, icono, color = 'primary', descripcion }) {
    const reducirMovimiento = useReducedMotion();
    const tono = tonos[color] || tonos.neutral;

    return (
        <motion.article
            variants={reducirMovimiento ? undefined : entradaTarjeta}
            whileHover={reducirMovimiento ? undefined : { y: -2 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`kpi-card ${tono}`}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="kpi-label">{titulo}</p>
                <span className="kpi-icono" aria-hidden="true">{icono}</span>
            </div>
            <p className="kpi-valor">{valor}</p>
            {descripcion && <p className="kpi-descripcion">{descripcion}</p>}
        </motion.article>
    );
}

export function MiniStat({ titulo, valor, icono }) {
    const reducirMovimiento = useReducedMotion();

    return (
        <motion.article
            variants={reducirMovimiento ? undefined : entradaTarjeta}
            className="mini-stat"
        >
            <span className="mini-stat-icono" aria-hidden="true">{icono}</span>
            <div className="min-w-0">
                <p className="mini-stat-label">{titulo}</p>
                <p className="mini-stat-valor">{valor}</p>
            </div>
        </motion.article>
    );
}
