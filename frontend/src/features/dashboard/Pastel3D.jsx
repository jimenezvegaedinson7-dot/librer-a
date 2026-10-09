import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// ============================================================
// Pastel 3D de proporciones (ventas por estado). Se dibuja en SVG:
// la cara superior es una elipse (el disco inclinado) y el grosor son
// las paredes frontales en un tono más oscuro. Los colores siguen la
// paleta de estados del panel; cada porción se levanta al señalarla.
// ============================================================

const COLORES = {
    'estado--exito': '#15803d',
    'estado--info': '#2f6fb3',
    'estado--aviso': '#c2780a',
    'estado--peligro': '#b91c1c',
    'estado--neutro': '#8f877c',
};

const CX = 120;
const CY = 66;
const RX = 104;
const RY = 52;
const GROSOR = 20;
const INICIO = -Math.PI / 2;

function oscurecer(hex, factor = 0.68) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.round(v * factor).toString(16).padStart(2, '0');
    return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

const punto = (a, dy = 0) => [CX + RX * Math.cos(a), CY + RY * Math.sin(a) + dy];
const f = (n) => n.toFixed(2);

function caraSuperior(a0, a1) {
    if (a1 - a0 >= Math.PI * 2 - 1e-6) {
        return `M ${f(CX - RX)} ${f(CY)} A ${RX} ${RY} 0 1 1 ${f(CX + RX)} ${f(CY)} A ${RX} ${RY} 0 1 1 ${f(CX - RX)} ${f(CY)} Z`;
    }
    const [x0, y0] = punto(a0);
    const [x1, y1] = punto(a1);
    const grande = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${CX} ${CY} L ${f(x0)} ${f(y0)} A ${RX} ${RY} 0 ${grande} 1 ${f(x1)} ${f(y1)} Z`;
}

// Pared visible: solo la parte de la porción que mira al frente (seno > 0).
function paredes(a0, a1) {
    const tramos = [];
    for (let k = -1; k <= 2; k++) {
        const s = Math.max(a0, k * 2 * Math.PI);
        const e = Math.min(a1, k * 2 * Math.PI + Math.PI);
        if (e - s > 1e-4) tramos.push([s, e]);
    }
    return tramos.map(([s, e]) => {
        const [x0, y0] = punto(s);
        const [x1, y1] = punto(e);
        const grande = e - s > Math.PI ? 1 : 0;
        return `M ${f(x0)} ${f(y0)} A ${RX} ${RY} 0 ${grande} 1 ${f(x1)} ${f(y1)} L ${f(x1)} ${f(y1 + GROSOR)} A ${RX} ${RY} 0 ${grande} 0 ${f(x0)} ${f(y0 + GROSOR)} Z`;
    });
}

export default function Pastel3D({ lista, total }) {
    const reducir = useReducedMotion();
    const [activa, setActiva] = useState(null);
    const porciones = lista.filter((x) => x.cantidad > 0).reduce((acc, x) => {
        const previo = acc.length ? acc[acc.length - 1].hasta : 0;
        const hasta = previo + x.cantidad;
        const a0 = INICIO + (previo / total) * Math.PI * 2;
        const a1 = INICIO + (hasta / total) * Math.PI * 2;
        const color = COLORES[x.clase] || COLORES['estado--neutro'];
        return [...acc, { ...x, hasta, a0, a1, medio: (a0 + a1) / 2, color, porcentaje: (x.cantidad / total) * 100 }];
    }, []);
    const desplazamiento = (p) => (activa === p.estado && !reducir ? [Math.cos(p.medio) * 9, Math.sin(p.medio) * 6 - 4] : [0, 0]);

    return (
        <div className="pastel3d" role="img" aria-label={porciones.map((p) => `${p.texto}: ${p.cantidad} (${p.porcentaje.toFixed(0)} %)`).join(', ')}>
            <motion.svg
                viewBox="0 0 240 150"
                aria-hidden="true"
                initial={reducir ? false : { opacity: 0, scale: 0.86, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
            >
                <defs>
                    <radialGradient id="pastel3d-brillo" cx="38%" cy="28%" r="75%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
                        <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse className="pastel3d-sombra" cx={CX} cy={CY + GROSOR + 8} rx={RX * 0.92} ry={RY * 0.42} />
                {porciones.map((p, i) => {
                    const [dx, dy] = desplazamiento(p);
                    return (
                        <motion.g
                            key={p.estado}
                            animate={{ x: dx, y: dy }}
                            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                            onHoverStart={() => setActiva(p.estado)}
                            onHoverEnd={() => setActiva(null)}
                            className="pastel3d-porcion"
                        >
                            <title>{`${p.texto}: ${p.cantidad} (${p.porcentaje.toFixed(0)} %)`}</title>
                            {paredes(p.a0, p.a1).map((d, k) => <path key={k} d={d} fill={oscurecer(p.color)} />)}
                            <motion.path
                                d={caraSuperior(p.a0, p.a1)}
                                fill={p.color}
                                stroke="#ffffff"
                                strokeWidth="1.2"
                                initial={reducir ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.25 + i * 0.12 }}
                            />
                            {p.porcentaje >= 9 && (
                                <text
                                    className="pastel3d-etiqueta"
                                    x={f(CX + RX * 0.6 * Math.cos(p.medio))}
                                    y={f(CY + RY * 0.6 * Math.sin(p.medio))}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                >
                                    {`${p.porcentaje.toFixed(0)}%`}
                                </text>
                            )}
                        </motion.g>
                    );
                })}
                <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="url(#pastel3d-brillo)" pointerEvents="none" />
            </motion.svg>
        </div>
    );
}
