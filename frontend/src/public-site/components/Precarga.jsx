import { useEffect } from 'react';

import { hayPendientes, marcarTerminada, precargaTerminada, suscribir } from '../lib/precarga';

// ============================================================
// PANTALLA DE CARGA (controlador)
// El dibujo vive en index.html (#precarga) para verse desde el primer
// instante, antes de que llegue el JavaScript. Este componente decide
// cuándo retirarlo, según el estado real de la carga:
//   1. la página de la ruta ya está montada en <main>,
//   2. fuentes listas (document.fonts.ready),
//   3. evento load de la ventana (CSS e imágenes iniciales),
//   4. ningún recurso registrado pendiente (fondo e imagen del hero,
//      primer cuadro del libro 3D; ver sections/Hero.jsx).
// Tiempo mínimo en pantalla solo para evitar un parpadeo, contado
// desde el inicio de la navegación; tope de seguridad por si un
// recurso nunca responde.
// ============================================================

// El logo tarda ~0.75 s en unir sus piezas: el mínimo deja verlo completo.
const MINIMO_MS = 800;
const TOPE_MS = 12000;
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

function ventanaCargada() {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise((r) => window.addEventListener('load', () => r(), { once: true }));
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
    await Promise.all([document.fonts?.ready ?? Promise.resolve(), ventanaCargada()]);
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
