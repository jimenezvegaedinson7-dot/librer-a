import { useSyncExternalStore } from 'react';

// ============================================================
// ESTADO DE LA PANTALLA DE CARGA
// Los componentes que tardan (imágenes del hero, libro 3D) registran
// un recurso y lo liberan cuando está listo. La pantalla de carga
// (components/Precarga.jsx) espera a que no quede ninguno pendiente.
// Sin pantalla de carga activa (panel, navegación interna) registrar
// no hace nada.
// ============================================================

const pendientes = new Set();
const oyentes = new Set();
let terminada = typeof document === 'undefined' || !document.documentElement.hasAttribute('data-precarga');

function avisar() {
    oyentes.forEach((fn) => fn());
}

export function suscribir(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
}

// Devuelve una función que libera el recurso (se puede llamar varias veces).
export function registrarRecurso(nombre) {
    if (terminada) return () => {};
    const clave = Symbol(nombre);
    pendientes.add(clave);
    avisar();
    // La liberación se aplaza a una microtarea: en desarrollo, React (StrictMode)
    // desmonta y vuelve a montar los efectos en el mismo ciclo; así el recurso
    // nuevo se registra antes de que se libere el anterior y la pantalla de
    // carga no se retira antes de tiempo.
    return () => {
        queueMicrotask(() => {
            if (pendientes.delete(clave)) avisar();
        });
    };
}

export function hayPendientes() {
    return pendientes.size > 0;
}

export function precargaTerminada() {
    return terminada;
}

export function marcarTerminada() {
    if (terminada) return;
    terminada = true;
    pendientes.clear();
    avisar();
}

// true cuando la pantalla de carga empezó a retirarse (o no existe).
export function usePrecargaTerminada() {
    return useSyncExternalStore(suscribir, precargaTerminada, () => true);
}
