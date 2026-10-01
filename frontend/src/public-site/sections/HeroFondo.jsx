// ============================================================
// FONDO DEL HERO (imagen + cristal)
// Capa 1: fondo_inicio.png. Capa 2: velo que sostiene el texto.
// Encima solo queda cristal: prismas de luz y esquirlas pequeñas.
// Auroras, haces y burbujas se quitaron: teñían de verde la foto, lavaban
// el libro y eran tres capas de difuminado compitiendo a la vez.
// ============================================================

import fondoInicioOriginal from '../../assets/fondo_web/fondo_inicio.png';
import fondoInicioWebp from '../../assets/fondo_web/fondo_inicio.webp';

// El PNG pesa 2,3 MB y el evento load de la ventana lo espera, así que
// bloqueaba la pantalla de carga. Se sirve el WebP (159 KB) y el PNG queda
// solo como respaldo para navegadores sin soporte.
const FONDO_HERO = `image-set(url(${fondoInicioWebp}) type("image/webp"), url(${fondoInicioOriginal}) type("image/png"))`;

// Haces de prisma: barras finas de luz que cruzan el hero al sesgo, con la
// luz separada en tonos como al refractarse. Todo muy tenue y desenfocado.
// x/y: posición (%) · w: ancho (%) · h: alto (%) · r: inclinación (deg)
// d: duración · t: retardo
const PRISMA = [
    { x: 8, y: 18, w: 34, h: 5, r: -18, d: 17, t: -3 },
    { x: 46, y: 44, w: 44, h: 3, r: -14, d: 23, t: -12 },
    { x: 72, y: 12, w: 30, h: 6, r: -22, d: 19, t: -8 },
    { x: 24, y: 72, w: 38, h: 4, r: -16, d: 27, t: -19 },
    { x: 62, y: 82, w: 32, h: 3, r: -12, d: 21, t: -5 },
];

// Esquirlas: trozos de cristal pequeños y angulares. El contorno viene del
// CSS (clip-path), aquí solo van posición, tamaño y movimiento.
// x/y: posición (%) · s: lado (px) · d: duración · t: retardo
// dx/dy: vaivén en vw
const ESQUIRLAS = [
    { x: 9, y: 30, s: 44, d: 21, t: -4, dx: 1.4, dy: -1.1 },
    { x: 22, y: 66, s: 30, d: 26, t: -14, dx: -1.2, dy: 1.3 },
    { x: 35, y: 22, s: 36, d: 23, t: -9, dx: 1.1, dy: 1.2 },
    { x: 48, y: 54, s: 26, d: 29, t: -18, dx: -1.5, dy: -1.0 },
    { x: 58, y: 78, s: 40, d: 24, t: -6, dx: 1.3, dy: -1.4 },
    { x: 68, y: 34, s: 32, d: 27, t: -16, dx: -1.1, dy: 1.1 },
    { x: 79, y: 62, s: 48, d: 22, t: -11, dx: 1.6, dy: 1.2 },
    { x: 88, y: 26, s: 28, d: 30, t: -21, dx: -1.4, dy: -1.3 },
    { x: 95, y: 74, s: 34, d: 25, t: -2, dx: 1.2, dy: -0.9 },
];

export default function HeroFondo() {
    return (
        <div className="hero-fondo" style={{ '--bg-hero': FONDO_HERO }} aria-hidden="true">
            <span className="hero-fondo__prisma">
                {PRISMA.map((p, i) => (
                    <i
                        key={i}
                        style={{
                            '--x': `${p.x}%`,
                            '--y': `${p.y}%`,
                            '--w': `${p.w}%`,
                            '--h': `${p.h}%`,
                            '--r': `${p.r}deg`,
                            '--d': `${p.d}s`,
                            '--t': `${p.t}s`,
                        }}
                    />
                ))}
            </span>
            <span className="hero-fondo__esquirlas">
                {ESQUIRLAS.map((e, i) => (
                    <i
                        key={i}
                        style={{
                            '--x': `${e.x}%`,
                            '--y': `${e.y}%`,
                            '--s': `${e.s}px`,
                            '--d': `${e.d}s`,
                            '--t': `${e.t}s`,
                            '--dx': `${e.dx}vw`,
                            '--dy': `${e.dy}vw`,
                        }}
                    />
                ))}
            </span>
            <span className="hero-fondo__panel" />
        </div>
    );
}
