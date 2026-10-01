// ============================================================
// FONDO ANIMADO DEL HERO (solo CSS, sin imágenes)
// Aurora esmeralda, ámbar y turquesa que respira, haces de luz que barren despacio desde
// arriba y burbujas de vidrio que suben con un leve vaivén. Todo se
// anima con transform y opacity; con movimiento reducido queda quieto.
// ============================================================

// Burbujas con valores fijos: el fondo es igual en cada visita.
// x: posición horizontal · s: tamaño · d: duración · t: retardo · v: vaivén
const BURBUJAS = [
    { x: 4, s: 46, d: 19, t: -3, v: 18 },
    { x: 11, s: 18, d: 14, t: -9, v: -12 },
    { x: 19, s: 30, d: 22, t: -15, v: 14 },
    { x: 27, s: 12, d: 12, t: -5, v: -8 },
    { x: 34, s: 64, d: 27, t: -20, v: 22 },
    { x: 42, s: 22, d: 16, t: -1, v: -16 },
    { x: 49, s: 14, d: 13, t: -11, v: 10 },
    { x: 56, s: 38, d: 21, t: -7, v: -20 },
    { x: 63, s: 20, d: 15, t: -13, v: 12 },
    { x: 70, s: 54, d: 25, t: -2, v: -18 },
    { x: 77, s: 16, d: 14, t: -8, v: 9 },
    { x: 84, s: 34, d: 20, t: -17, v: -14 },
    { x: 91, s: 24, d: 17, t: -4, v: 16 },
    { x: 97, s: 42, d: 23, t: -12, v: -10 },
];

export default function HeroFondo() {
    return (
        <div className="hero-fondo" aria-hidden="true">
            <span className="hero-fondo__aurora hero-fondo__aurora--a" />
            <span className="hero-fondo__aurora hero-fondo__aurora--b" />
            <span className="hero-fondo__aurora hero-fondo__aurora--c" />
            <span className="hero-fondo__haz hero-fondo__haz--a" />
            <span className="hero-fondo__haz hero-fondo__haz--b" />
            <span className="hero-fondo__haz hero-fondo__haz--c" />
            <span className="hero-fondo__burbujas">
                {BURBUJAS.map((b, i) => (
                    <i
                        key={i}
                        style={{ '--x': `${b.x}%`, '--s': `${b.s}px`, '--d': `${b.d}s`, '--t': `${b.t}s`, '--v': `${b.v}px` }}
                    />
                ))}
            </span>
        </div>
    );
}
