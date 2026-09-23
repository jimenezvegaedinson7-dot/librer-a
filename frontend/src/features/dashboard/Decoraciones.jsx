import { motion, useReducedMotion } from 'motion/react';

// Piezas gráficas de las tarjetas del Resumen. Reciben `activa` (cursor encima
// de la tarjeta) y se animan con Framer Motion; respetan reduced motion.

const EASE = [0.25, 1, 0.5, 1];

// Revelado de izquierda a derecha: el trazo "se dibuja" sin deformarse.
function variantesRevelado(reducir) {
    return {
        reposo: { clipPath: 'inset(0 100% 0 0)', opacity: 0, transition: { duration: reducir ? 0 : 0.2 } },
        hover: { clipPath: 'inset(0 0% 0 0)', opacity: 1, transition: { duration: reducir ? 0 : 0.35, ease: EASE } },
    };
}

function variantesPunto(reducir) {
    return {
        reposo: { scale: 0, opacity: 0, transition: { duration: reducir ? 0 : 0.15 } },
        hover: { scale: 1, opacity: 1, transition: { duration: reducir ? 0 : 0.2, delay: reducir ? 0 : 0.3 } },
    };
}

// Altura (en %) de cada columna; la misma regla que usa la minigráfica.
function alturasTendencia(datos) {
    const max = Math.max(...datos);
    return datos.map((v) => (max > 0 && v > 0 ? Math.max(12, (v / max) * 100) : 0));
}

// Columnas de tendencia (datos reales) + línea que une sus cimas al pasar el cursor.
export function TendenciaViva({ datos, etiqueta, activa }) {
    const reducir = useReducedMotion();
    if (!Array.isArray(datos) || datos.length < 2) return null;

    const alturas = alturasTendencia(datos);
    const n = datos.length;
    const puntos = alturas.map((h, i) => `${((i + 0.5) / n) * 100},${100 - Math.max(h, 3)}`).join(' ');
    const ultimo = alturas[n - 1];

    return (
        <div className="kpi-zona" role="img" aria-label={etiqueta}>
            <div className="kpi-tendencia">
                {datos.map((v, i) => (
                    <span
                        key={i}
                        className={`kpi-tendencia-barra ${i === n - 1 ? 'kpi-tendencia-barra--actual' : ''} ${v === 0 ? 'kpi-tendencia-barra--cero' : ''}`}
                        style={{ height: alturas[i] > 0 ? `${alturas[i]}%` : undefined }}
                    />
                ))}
                <motion.svg
                    className="kpi-trazo"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    initial="reposo" animate={activa ? 'hover' : 'reposo'} variants={variantesRevelado(reducir)}
                >
                    <polyline points={puntos} vectorEffect="non-scaling-stroke" />
                </motion.svg>
                <motion.span
                    className="kpi-trazo-punto"
                    style={{ left: `${((n - 0.5) / n) * 100}%`, bottom: `${Math.max(ultimo, 3)}%` }}
                    initial="reposo" animate={activa ? 'hover' : 'reposo'} variants={variantesPunto(reducir)}
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}

// Indicador radial: proporción real (valor / total).
export function Anillo({ valor, total, etiqueta, leyenda, activa }) {
    const reducir = useReducedMotion();
    const porcentaje = total > 0 ? Math.min(100, (valor / total) * 100) : 0;

    return (
        <div className="kpi-zona kpi-zona--anillo">
            <div
                className="kpi-anillo"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={valor}
                aria-label={etiqueta}
            >
                <svg viewBox="0 0 44 44" aria-hidden="true">
                    <circle className="kpi-anillo-pista" cx="22" cy="22" r="18" pathLength="100" />
                    <circle
                        className="kpi-anillo-valor"
                        cx="22"
                        cy="22"
                        r="18"
                        pathLength="100"
                        strokeDasharray={`${porcentaje} 100`}
                    />
                    <motion.circle
                        className="kpi-anillo-brillo"
                        cx="22"
                        cy="22"
                        r="18"
                        pathLength="100"
                        strokeDasharray="12 88"
                        initial="reposo"
                        animate={activa ? 'hover' : 'reposo'}
                        variants={{
                            reposo: { strokeDashoffset: 0, opacity: 0 },
                            hover: reducir
                                ? { opacity: 0 }
                                : { strokeDashoffset: [0, -100], opacity: [0, 1, 0], transition: { duration: 0.5, ease: 'easeInOut' } },
                        }}
                    />
                </svg>
                <span className="kpi-anillo-cifra">{Math.round(porcentaje)}%</span>
            </div>
            {leyenda && <p className="kpi-anillo-leyenda">{leyenda}</p>}
        </div>
    );
}

// Onda ornamental (no representa datos). Se dibuja al pasar el cursor.
const ONDA = 'M0 34 C 14 33, 20 22, 32 24 S 50 32, 62 25 S 82 10, 96 13 S 114 8, 120 4';

export function OndaDecorativa({ className = '', activa }) {
    const reducir = useReducedMotion();
    return (
        <span className={`onda-decorativa ${className}`} aria-hidden="true">
            <svg viewBox="0 0 120 40" preserveAspectRatio="none">
                <path className="onda-area" d={`${ONDA} L 120 40 L 0 40 Z`} />
                <path className="onda-base" d={ONDA} vectorEffect="non-scaling-stroke" />
            </svg>
            <motion.svg viewBox="0 0 120 40" preserveAspectRatio="none" initial="reposo" animate={activa ? 'hover' : 'reposo'} variants={variantesRevelado(reducir)}>
                <path className="onda-trazo" d={ONDA} vectorEffect="non-scaling-stroke" />
            </motion.svg>
            <motion.span className="onda-punto" initial="reposo" animate={activa ? 'hover' : 'reposo'} variants={variantesPunto(reducir)} />
        </span>
    );
}

// Destello que recorre una barra al pasar el cursor por el panel.
export function Destello() {
    const reducir = useReducedMotion();
    if (reducir) return null;
    return (
        <motion.span
            className="barra-destello"
            aria-hidden="true"
            variants={{
                oculto: { x: '-120%', opacity: 0 },
                visible: { x: '-120%', opacity: 0 },
                hover: { x: ['-120%', '260%'], opacity: [0, 1, 0], transition: { duration: 0.6, ease: 'easeInOut' } },
            }}
        />
    );
}
