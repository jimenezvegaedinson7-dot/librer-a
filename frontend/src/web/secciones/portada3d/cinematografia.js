const limitar = (n) => Math.max(0, Math.min(1, n));

export const tramoCine = (p, a, b) => limitar((p - a) / (b - a));

const suavizarCine = (p) => {
    const t = limitar(p);
    return t * t * (3 - 2 * t);
};

export const ENCUADERNACION = Object.freeze({ giroMaximo: Math.PI * 0.58, offsetLomo: 0.07, offsetPrimeraHoja: 0.055, profundidadHojas: 0.075, reduccionBloque: 0.62 });

export function estadoCinematico(progreso, entrada = 1) {
    const p = Number.isFinite(progreso) ? limitar(progreso) : 0;
    const e = suavizarCine(Number.isFinite(entrada) ? entrada : 0);
    return {
        p,
        entrada: e,
        navegacion: suavizarCine(tramoCine(p, 0.01, 0.09)),
        acercamiento: suavizarCine(tramoCine(p, 0.13, 0.38)),
        apertura: suavizarCine(tramoCine(p, 0.39, 0.64)),
        energia: suavizarCine(tramoCine(p, 0.59, 0.8)),
        disolucion: suavizarCine(tramoCine(p, 0.76, 0.9)),

        presentacionFinal: suavizarCine(tramoCine(p, 0.72, 0.86)),
        salida: suavizarCine(tramoCine(p, 0.87, 1))
    };
}

export function estadoEncuadernacion(apertura, cantidad = 16) {
    const a = limitar(Number.isFinite(apertura) ? apertura : 0);
    const total = Number.isFinite(cantidad) ? Math.max(1, Math.min(32, Math.floor(cantidad))) : 16;
    const tapa = a * ENCUADERNACION.giroMaximo;
    const hojas = Array.from({ length: total }, (_, i) => {
        const orden = total === 1 ? 0 : i / (total - 1);
        const seguimiento = suavizarCine(tramoCine(a, 0.08 + orden * 0.58, 1));
        return { orden, angulo: tapa * (0.74 - 0.52 * orden) * seguimiento, curvatura: 0.1 * (1 - orden * 0.4) * Math.sin(Math.PI * seguimiento) * Math.sin(tapa) };
    });
    return { tapa, hojas, escalaBloque: 1 - ENCUADERNACION.reduccionBloque * a };
}
