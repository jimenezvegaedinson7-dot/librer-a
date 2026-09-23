import { useState } from 'react';

import { motion, useReducedMotion } from 'motion/react';

import { Anillo, OndaDecorativa, TendenciaViva } from './Decoraciones';

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

// Sin movimiento: mismas etiquetas para que las piezas internas hereden el reposo.
const estatica = { oculto: { opacity: 1 }, visible: { opacity: 1 } };

export function StatCard({ titulo, valor, icono, color = 'primary', descripcion, detalle, tendencia, etiquetaTendencia, medidor }) {
    const reducirMovimiento = useReducedMotion();
    const tono = tonos[color] || tonos.neutral;
    const [activa, setActiva] = useState(false);

    return (
        <motion.article
            variants={reducirMovimiento ? estatica : entradaTarjeta}
            onHoverStart={() => setActiva(true)}
            onHoverEnd={() => setActiva(false)}
            className={`kpi-card ${tono}`}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="kpi-label">{titulo}</p>
                <span className="kpi-icono" aria-hidden="true">{icono}</span>
            </div>
            <p className="kpi-valor">{valor}</p>
            {(detalle || descripcion) && <p className="kpi-descripcion">{detalle || descripcion}</p>}
            {tendencia && <TendenciaViva datos={tendencia} etiqueta={etiquetaTendencia || `Tendencia de ${titulo}`} activa={activa} />}
            {medidor && <Anillo {...medidor} activa={activa} />}
        </motion.article>
    );
}

export function MiniStat({ titulo, valor, icono, descripcion }) {
    const reducirMovimiento = useReducedMotion();
    const [activa, setActiva] = useState(false);

    return (
        <motion.article
            variants={reducirMovimiento ? estatica : entradaTarjeta}
            onHoverStart={() => setActiva(true)}
            onHoverEnd={() => setActiva(false)}
            className="mini-stat"
        >
            <div className="mini-stat-cabecera">
                <span className="mini-stat-icono" aria-hidden="true">{icono}</span>
                <OndaDecorativa className="onda-decorativa--mini" activa={activa} />
            </div>
            <div className="min-w-0">
                <p className="mini-stat-label">{titulo}</p>
                <p className="mini-stat-valor">{valor}</p>
                {descripcion && <p className="mini-stat-descripcion">{descripcion}</p>}
            </div>
        </motion.article>
    );
}
