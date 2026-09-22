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

// Minigráfica de columnas: periodos anteriores atenuados, el actual resaltado.
function Tendencia({ datos, etiqueta }) {
    if (!Array.isArray(datos) || datos.length < 2) return null;
    const max = Math.max(...datos);
    return (
        <div className="kpi-tendencia" role="img" aria-label={etiqueta}>
            {datos.map((v, i) => (
                <span
                    key={i}
                    className={`kpi-tendencia-barra ${i === datos.length - 1 ? 'kpi-tendencia-barra--actual' : ''} ${v === 0 ? 'kpi-tendencia-barra--cero' : ''}`}
                    style={{ height: max > 0 && v > 0 ? `${Math.max(12, (v / max) * 100)}%` : undefined }}
                />
            ))}
        </div>
    );
}

// Medidor: relleno sobre una pista del mismo tono.
function Medidor({ valor, total, etiqueta }) {
    const porcentaje = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
    return (
        <div className="kpi-medidor" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={valor} aria-label={etiqueta}>
            <span style={{ width: `${porcentaje}%` }} />
        </div>
    );
}

export function StatCard({ titulo, valor, icono, color = 'primary', descripcion, detalle, tendencia, etiquetaTendencia, medidor }) {
    const reducirMovimiento = useReducedMotion();
    const tono = tonos[color] || tonos.neutral;

    return (
        <motion.article
            variants={reducirMovimiento ? undefined : entradaTarjeta}
            className={`kpi-card ${tono}`}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="kpi-label">{titulo}</p>
                <span className="kpi-icono" aria-hidden="true">{icono}</span>
            </div>
            <p className="kpi-valor">{valor}</p>
            {(detalle || descripcion) && <p className="kpi-descripcion">{detalle || descripcion}</p>}
            {tendencia && <Tendencia datos={tendencia} etiqueta={etiquetaTendencia || `Tendencia de ${titulo}`} />}
            {medidor && <Medidor {...medidor} />}
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
