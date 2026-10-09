import { motion, useReducedMotion } from 'motion/react';

// ============================================================
// Contenido de las tarjetas pequeñas del resumen. Todo sale de datos
// reales del catálogo o de las ventas: ninguna figura es decorativa.
// ============================================================

const SUAVE = [0.25, 1, 0.5, 1];

// Barra partida en segmentos (por ejemplo: a la venta / ocultos).
export function BarraSegmentos({ segmentos, etiqueta }) {
    const reducir = useReducedMotion();
    const total = segmentos.reduce((s, x) => s + x.valor, 0);
    if (!total) return null;
    return (
        <div className="mini-detalle">
            <div className="mini-barra" role="img" aria-label={etiqueta}>
                {segmentos.filter((s) => s.valor > 0).map((s, i) => (
                    <motion.span
                        key={s.etiqueta}
                        className={`mini-barra-tramo mini-barra-tramo--${s.tono}`}
                        initial={reducir ? false : { width: 0 }}
                        animate={{ width: `${(s.valor / total) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.25 + i * 0.12, ease: SUAVE }}
                    />
                ))}
            </div>
            <ul className="mini-leyenda">
                {segmentos.map((s) => (
                    <li key={s.etiqueta}><span className={`mini-punto mini-punto--${s.tono}`} aria-hidden="true" />{s.valor} {s.etiqueta}</li>
                ))}
            </ul>
        </div>
    );
}

// Pocas filas con barra proporcional (por ejemplo: categorías con más títulos).
export function BarrasTop({ items, etiqueta }) {
    const reducir = useReducedMotion();
    if (!items.length) return null;
    const maximo = Math.max(...items.map((x) => x.valor));
    return (
        <ul className="mini-detalle mini-top" aria-label={etiqueta}>
            {items.map((x, i) => (
                <li key={x.etiqueta}>
                    <span className="mini-top-nombre" title={x.etiqueta}>{x.etiqueta}</span>
                    <span className="mini-top-pista" aria-hidden="true">
                        <motion.span
                            className="mini-top-relleno"
                            initial={reducir ? false : { width: 0 }}
                            animate={{ width: `${Math.max(8, (x.valor / maximo) * 100)}%` }}
                            transition={{ duration: 0.75, delay: 0.25 + i * 0.1, ease: SUAVE }}
                        />
                    </span>
                    <span className="mini-top-valor">{x.valor}</span>
                </li>
            ))}
        </ul>
    );
}

// Columnas pequeñas con la mayor resaltada (por ejemplo: últimos 6 meses).
export function ColumnasMini({ serie, etiqueta }) {
    const reducir = useReducedMotion();
    const maximo = Math.max(0, ...serie.map((x) => x.total));
    if (!serie.length || maximo <= 0) return null;
    const mejor = serie.findIndex((x) => x.total === maximo);
    return (
        <div className="registro-columnas" role="img" aria-label={etiqueta}>
            {serie.map((x, i) => (
                <span key={x.clave} className="registro-columna" title={`${x.etiquetaLarga}: S/ ${x.total.toFixed(2)}`}>
                    <motion.span
                        className={`registro-columna-barra ${i === mejor ? 'registro-columna-barra--mejor' : ''}`}
                        initial={reducir ? false : { height: 0 }}
                        animate={{ height: `${Math.max(6, (x.total / maximo) * 100)}%` }}
                        transition={{ duration: 0.7, delay: 0.3 + i * 0.05, ease: SUAVE }}
                    />
                </span>
            ))}
        </div>
    );
}
