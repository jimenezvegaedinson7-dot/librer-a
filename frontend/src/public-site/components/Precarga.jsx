import { useEffect } from 'react';

import { hayPendientes, marcarTerminada, precargaTerminada, suscribir } from '../lib/precarga';

// ============================================================
// PANTALLA DE CARGA (controlador)
// El dibujo vive en index.html (#precarga) para verse desde el primer
// instante, antes de que llegue el JavaScript. Este componente decide
// cuándo retirarlo, según el estado real de la carga:
//   1. la página de la ruta ya está montada en <main>,
//   2. fuentes listas (document.fonts.ready),
//   3. ningún recurso registrado pendiente (fondo e imagen del hero,
//      el libro 3D entra después sin bloquear; ver sections/Hero.jsx).
// Tiempo mínimo en pantalla solo para evitar un parpadeo, contado
// desde el inicio de la navegación; tope de seguridad por si un
// recurso nunca responde.
// ============================================================

// Mínimo corto solo para evitar un parpadeo.
const MINIMO_MS = 350;
const TOPE_MS = 3500;
const SALIDA_MS = 380;

let iniciada = false;

const esperar = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const cuadro = () => new Promise((r) => requestAnimationFrame(() => r()));

function contenidoMontado() {
    return new Promise((resolver) => {
        const main = document.getElementById('contenido');
        if (!main || main.childElementCount > 0) {
            resolver();
            return;
        }
        const mo = new MutationObserver(() => {
            if (main.childElementCount > 0) {
                mo.disconnect();
                resolver();
            }
        });
        mo.observe(main, { childList: true });
    });
}

function sinPendientes() {
    if (!hayPendientes()) return Promise.resolve();
    return new Promise((resolver) => {
        const quitar = suscribir(() => {
            if (!hayPendientes()) {
                quitar();
                resolver();
            }
        });
    });
}

async function listoParaMostrar() {
    await contenidoMontado();
    // Los recursos se registran en efectos de layout del mismo commit;
    // un cuadro más deja que se registren también los de efectos normales.
    await cuadro();
    // Solo fuentes y recursos registrados (imagen del hero): esperar al evento
    // load retrasaba la salida hasta que cargaba cada portada del catálogo.
    await (document.fonts?.ready ?? Promise.resolve());
    await sinPendientes();
    await cuadro();
}

function retirar(nodo) {
    const html = document.documentElement;
    nodo.setAttribute('aria-busy', 'false');
    nodo.classList.add('precarga--saliendo');
    html.classList.remove('precarga-bloqueo');
    marcarTerminada();
    const fin = () => {
        nodo.remove();
        html.removeAttribute('data-precarga');
    };
    nodo.addEventListener('transitionend', fin, { once: true });
    setTimeout(fin, SALIDA_MS + 150);
}

export default function Precarga() {
    useEffect(() => {
        if (iniciada) return;
        iniciada = true;
        const nodo = document.getElementById('precarga');
        if (!nodo || precargaTerminada()) {
            marcarTerminada();
            return;
        }
        Promise.race([listoParaMostrar(), esperar(TOPE_MS - performance.now())])
            .then(() => esperar(MINIMO_MS - performance.now()))
            .then(() => retirar(nodo));
    }, []);

    return null;
}
