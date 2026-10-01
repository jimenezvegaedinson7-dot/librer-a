import * as THREE from 'three';

// Texturas dibujadas en canvas: sin archivos extra y nítidas a cualquier
// escala. Papel con fibras y texto compuesto, cuero verde granulado con
// su mapa de relieve, portada con título estampado y cantos de hojas.
// Todo usa azar con semilla: la misma textura en cada visita, y dos
// llamadas iguales producen exactamente la misma imagen (las hojas que
// se pasan deben coincidir con las páginas de debajo).

const FUENTE = "'Work Sans', system-ui, sans-serif";
const TINTA = 'rgba(38, 30, 24, 0.78)';

function lienzo(ancho, alto, dibujar, { color = true } = {}) {
    const c = document.createElement('canvas');
    c.width = ancho;
    c.height = alto;
    dibujar(c.getContext('2d'), ancho, alto);
    const t = new THREE.CanvasTexture(c);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

// Pseudoaleatorio con semilla: la escena es igual en cada visita.
export function aleatorio(semilla) {
    let s = semilla >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---------- Papel ----------

function papel(ctx, w, h, azar, lomoALaIzquierda) {
    // Base marfil con una leve variación de tono hacia los bordes.
    const base = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.1, w * 0.5, h * 0.5, h * 0.8);
    base.addColorStop(0, '#f3ecdc');
    base.addColorStop(1, '#e6dcc6');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // Fibras cortas y motas: el papel no es un color plano.
    for (let i = 0; i < 2600; i += 1) {
        const x = azar() * w;
        const y = azar() * h;
        const largo = 4 + azar() * 14;
        const ang = azar() * Math.PI;
        ctx.strokeStyle = azar() < 0.5 ? 'rgba(120, 96, 60, 0.07)' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 0.6 + azar() * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * largo, y + Math.sin(ang) * largo);
        ctx.stroke();
    }
    for (let i = 0; i < 9000; i += 1) {
        ctx.fillStyle = azar() < 0.6 ? 'rgba(110, 85, 50, 0.05)' : 'rgba(255, 255, 255, 0.10)';
        ctx.fillRect(azar() * w, azar() * h, 1 + azar(), 1 + azar());
    }

    // Sombra del lomo: el papel se hunde hacia la costura.
    const x0 = lomoALaIzquierda ? 0 : w;
    const lomo = ctx.createLinearGradient(x0, 0, lomoALaIzquierda ? 260 : w - 260, 0);
    lomo.addColorStop(0, 'rgba(70, 48, 26, 0.42)');
    lomo.addColorStop(0.25, 'rgba(70, 48, 26, 0.14)');
    lomo.addColorStop(1, 'rgba(70, 48, 26, 0)');
    ctx.fillStyle = lomo;
    ctx.fillRect(0, 0, w, h);

    // Borde exterior apenas oscurecido por el uso.
    const canto = ctx.createLinearGradient(lomoALaIzquierda ? w : 0, 0, lomoALaIzquierda ? w - 40 : 40, 0);
    canto.addColorStop(0, 'rgba(90, 70, 40, 0.12)');
    canto.addColorStop(1, 'rgba(90, 70, 40, 0)');
    ctx.fillStyle = canto;
    ctx.fillRect(0, 0, w, h);
}

// Texto compuesto (renglones simulados, sin palabras que puedan leerse
// como una cita inventada), con cabecera y folio reales.
function paginaCompuesta(ctx, w, h, azar, lomoALaIzquierda, folio) {
    const margenLomo = 150;
    const margenFuera = 120;
    const x0 = lomoALaIzquierda ? margenLomo : margenFuera;
    const x1 = lomoALaIzquierda ? w - margenFuera : w - margenLomo;

    ctx.fillStyle = 'rgba(38, 30, 24, 0.55)';
    ctx.font = `500 26px ${FUENTE}`;
    ctx.textAlign = 'center';
    ctx.fillText('LIBRERÍA DEL SABER', (x0 + x1) / 2, 118);

    let y = 190;
    ctx.fillStyle = '#004d43';
    ctx.font = `700 132px ${FUENTE}`;
    ctx.textAlign = 'left';
    ctx.fillText('L', x0 - 4, y + 98);

    ctx.fillStyle = TINTA;
    const renglon = 38;
    for (let i = 0; i < 29; i += 1) {
        const sangria = i < 3 ? 108 : 0;
        const finParrafo = i % 8 === 7;
        const fin = finParrafo ? x0 + (x1 - x0) * (0.3 + azar() * 0.35) : x1;
        // Sangría en la primera línea de cada párrafo nuevo.
        let x = x0 + sangria + (i > 3 && i % 8 === 0 ? 40 : 0);
        while (x < fin - 16) {
            const palabra = Math.min(18 + azar() * 74, fin - x);
            ctx.globalAlpha = 0.82 + azar() * 0.18;
            ctx.fillRect(x, y, palabra, 10);
            x += palabra + 12;
        }
        ctx.globalAlpha = 1;
        y += renglon;
        if (finParrafo) y += 16;
    }

    ctx.fillStyle = 'rgba(38, 30, 24, 0.6)';
    ctx.font = `500 30px ${FUENTE}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(folio), (x0 + x1) / 2, h - 90);
}

// Ex libris de la casa: la marca impresa en la página.
function exLibris(ctx, w, h) {
    ctx.strokeStyle = 'rgba(0, 77, 67, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(w * 0.22, h * 0.27, w * 0.56, h * 0.42);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(w * 0.22 + 14, h * 0.27 + 14, w * 0.56 - 28, h * 0.42 - 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(38, 30, 24, 0.7)';
    ctx.font = `500 32px ${FUENTE}`;
    ctx.fillText('Ex libris', w / 2, h * 0.37);
    ctx.fillStyle = '#004d43';
    ctx.font = `700 82px ${FUENTE}`;
    ctx.fillText('Librería', w / 2, h * 0.47);
    ctx.fillText('del Saber', w / 2, h * 0.47 + 94);
    ctx.strokeStyle = 'rgba(38, 30, 24, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 110, h * 0.47 + 140);
    ctx.lineTo(w / 2 + 110, h * 0.47 + 140);
    ctx.stroke();
    ctx.fillStyle = 'rgba(38, 30, 24, 0.62)';
    ctx.font = `500 28px ${FUENTE}`;
    ctx.fillText('Pallasca · Áncash', w / 2, h * 0.47 + 196);
}

// contenido: 'texto' (página compuesta) o 'ex-libris'.
export function texturaPagina(lomoALaIzquierda, contenido = 'texto') {
    return lienzo(1024, 1400, (ctx, w, h) => {
        const azar = aleatorio(lomoALaIzquierda ? 1301 : 1201);
        papel(ctx, w, h, azar, lomoALaIzquierda);
        if (contenido === 'ex-libris') exLibris(ctx, w, h);
        else paginaCompuesta(ctx, w, h, aleatorio(lomoALaIzquierda ? 13 : 12), lomoALaIzquierda, lomoALaIzquierda ? 13 : 12);
    });
}

// ---------- Cuero ----------

// Grano de cuero: celdas irregulares (poros) sobre un fondo con manchas.
// Se dibuja dos veces con la misma semilla: en color y como relieve.
function granoCuero(ctx, w, h, relieve) {
    const azar = aleatorio(4242);
    ctx.fillStyle = relieve ? '#808080' : '#0e4a41';
    ctx.fillRect(0, 0, w, h);

    // Manchas amplias: el teñido nunca es uniforme.
    for (let i = 0; i < 70; i += 1) {
        const x = azar() * w;
        const y = azar() * h;
        const r = 40 + azar() * 160;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const oscuro = azar() < 0.5;
        const tono = relieve
            ? (oscuro ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)')
            : (oscuro ? 'rgba(0, 22, 18, 0.12)' : 'rgba(40, 110, 92, 0.07)');
        g.addColorStop(0, tono);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Poros: pequeños óvalos hundidos con un borde de luz.
    for (let i = 0; i < 14000; i += 1) {
        const x = azar() * w;
        const y = azar() * h;
        const rx = 1.2 + azar() * 2.8;
        const ry = rx * (0.6 + azar() * 0.5);
        const ang = azar() * Math.PI;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, ang, 0, Math.PI * 2);
        ctx.fillStyle = relieve ? 'rgba(0,0,0,0.28)' : 'rgba(0, 18, 14, 0.30)';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 0.8, y - 0.8, rx * 0.7, ry * 0.7, ang, 0, Math.PI * 2);
        ctx.fillStyle = relieve ? 'rgba(255,255,255,0.10)' : 'rgba(80, 150, 130, 0.10)';
        ctx.fill();
    }

    // Arrugas finas.
    ctx.lineWidth = 1;
    for (let i = 0; i < 260; i += 1) {
        let x = azar() * w;
        let y = azar() * h;
        ctx.strokeStyle = relieve ? 'rgba(0,0,0,0.18)' : 'rgba(0, 20, 16, 0.22)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k += 1) {
            x += (azar() - 0.5) * 40;
            y += (azar() - 0.5) * 40;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

export function texturaCuero() {
    const repetir = (t) => {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        return t;
    };
    return {
        mapa: repetir(lienzo(1024, 1024, (ctx, w, h) => granoCuero(ctx, w, h, false))),
        relieve: repetir(lienzo(1024, 1024, (ctx, w, h) => granoCuero(ctx, w, h, true), { color: false })),
    };
}

// Portada: filete doble gofrado y título estampado en tono salvia, sobre
// fondo transparente (se coloca encima del cuero de la tapa).
export function texturaPortada() {
    const dibujar = (relieve) => (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        if (relieve) {
            ctx.fillStyle = '#808080';
            ctx.fillRect(0, 0, w, h);
        }
        const hundido = relieve ? '#3a3a3a' : 'rgba(0, 18, 14, 0.55)';
        const luz = relieve ? '#a0a0a0' : 'rgba(120, 180, 160, 0.18)';
        const filete = (m, grosor) => {
            ctx.lineWidth = grosor;
            ctx.strokeStyle = luz;
            ctx.strokeRect(m + 1.5, m + 1.5, w - 2 * m, h - 2 * m);
            ctx.strokeStyle = hundido;
            ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
        };
        filete(46, 5);
        filete(66, 2);

        ctx.textAlign = 'center';
        const titulo = (texto, y, tam) => {
            ctx.font = `700 ${tam}px ${FUENTE}`;
            if (relieve) {
                ctx.fillStyle = '#404040';
                ctx.fillText(texto, w / 2, y);
                return;
            }
            ctx.fillStyle = 'rgba(0, 18, 14, 0.55)';
            ctx.fillText(texto, w / 2 + 2, y + 3);
            ctx.fillStyle = '#dfe6dd';
            ctx.fillText(texto, w / 2, y);
        };
        titulo('Librería', h * 0.38, 104);
        titulo('del Saber', h * 0.38 + 118, 104);

        ctx.lineWidth = 3;
        ctx.strokeStyle = relieve ? '#404040' : 'rgba(223, 230, 221, 0.85)';
        ctx.beginPath();
        ctx.moveTo(w / 2 - 90, h * 0.38 + 178);
        ctx.lineTo(w / 2 + 90, h * 0.38 + 178);
        ctx.stroke();

        ctx.font = `500 36px ${FUENTE}`;
        ctx.fillStyle = relieve ? '#505050' : 'rgba(223, 230, 221, 0.8)';
        ctx.fillText('Pallasca · Áncash', w / 2, h * 0.82);
    };
    return {
        mapa: lienzo(820, 1140, dibujar(false)),
        relieve: lienzo(820, 1140, dibujar(true), { color: false }),
    };
}

// ---------- Cantos y sombra ----------

// Canto del bloque de hojas: cientos de hojas finas, con leves ondas.
export function texturaCanto(vertical) {
    return lienzo(512, 512, (ctx, w, h) => {
        const azar = aleatorio(vertical ? 77 : 78);
        ctx.fillStyle = '#efe7d6';
        ctx.fillRect(0, 0, w, h);
        const n = 150;
        for (let i = 0; i < n; i += 1) {
            const p = (i / n) * (vertical ? w : h) + azar() * 2;
            ctx.strokeStyle = azar() < 0.5 ? 'rgba(110, 85, 50, 0.22)' : 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 0.6 + azar() * 0.9;
            ctx.beginPath();
            if (vertical) { ctx.moveTo(p, 0); ctx.lineTo(p + (azar() - 0.5) * 2, h); } else { ctx.moveTo(0, p); ctx.lineTo(w, p + (azar() - 0.5) * 2); }
            ctx.stroke();
        }
        // Las hojas exteriores están algo más gastadas.
        const g = vertical ? ctx.createLinearGradient(0, 0, w, 0) : ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(90, 70, 40, 0.14)');
        g.addColorStop(0.5, 'rgba(90, 70, 40, 0)');
        g.addColorStop(1, 'rgba(90, 70, 40, 0.14)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
}

// Sombra de contacto suave bajo el libro (sin render extra).
export function texturaSombra() {
    return lienzo(256, 256, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(0, 16, 13, 0.7)');
        g.addColorStop(0.55, 'rgba(0, 16, 13, 0.26)');
        g.addColorStop(1, 'rgba(0, 16, 13, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
}
