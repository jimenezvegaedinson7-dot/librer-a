import { useState } from 'react';

import { motion, useReducedMotion } from 'motion/react';

import { Anillo, TendenciaViva } from './Decoraciones';

// Todas las tarjetas llevan el acabado de "Total vendido"; el tono solo
// cambia su color (clases joya--* en panel-editorial.css).
const tonos = {
    primary: '',
    success: 'joya--success',
    danger: 'joya--danger',
    warning: 'joya--warning',
    info: 'joya--info',
    neutral: 'joya--neutral',
    violet: 'joya--violet',
    teal: 'joya--teal',
    sky: 'joya--sky',
    rose: 'joya--rose',
};

const entradaTarjeta = {
    oculto: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } },
};

// Sin movimiento: mismas etiquetas para que las piezas internas hereden el reposo.
const estatica = { oculto: { opacity: 1 }, visible: { opacity: 1 } };

export function StatCard({ titulo, valor, icono, color = 'primary', descripcion, detalle, tendencia, etiquetaTendencia, medidor }) {
    const reducirMovimiento = useReducedMotion();
    const tono = tonos[color] ?? tonos.neutral;
    const [activa, setActiva] = useState(false);

    return (
        <motion.article
            variants={reducirMovimiento ? estatica : entradaTarjeta}
            onHoverStart={() => setActiva(true)}
            onHoverEnd={() => setActiva(false)}
            className={`kpi-card kpi-card--destacada joya ${tono}`}
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

    return (
        <motion.article
            variants={reducirMovimiento ? estatica : entradaTarjeta}
            className="mini-stat"
        >
            <div className="mini-stat-cabecera">
                <span className="mini-stat-icono" aria-hidden="true">{icono}</span>
            </div>
            <div className="min-w-0">
                <p className="mini-stat-label">{titulo}</p>
                <p className="mini-stat-valor">{valor}</p>
                {descripcion && <p className="mini-stat-descripcion">{descripcion}</p>}
            </div>
        </motion.article>
    );
}
