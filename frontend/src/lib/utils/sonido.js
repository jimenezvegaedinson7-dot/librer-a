// Sonido de confirmación estilo "pago aprobado" (dos notas ascendentes),
// sintetizado con Web Audio: no requiere archivos de audio.

let contexto = null;

// Llamar dentro de un clic/submit: los navegadores solo permiten audio
// después de una interacción del usuario.
export function prepararSonido() {
    try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        if (!contexto) contexto = new Audio();
        if (contexto.state === 'suspended') contexto.resume();
    } catch {
        // Sin audio disponible: la animación sigue funcionando.
    }
}

function nota(frecuencia, inicio, duracion, volumen) {
    const oscilador = contexto.createOscillator();
    const ganancia = contexto.createGain();
    oscilador.type = 'sine';
    oscilador.frequency.value = frecuencia;
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.012);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    oscilador.connect(ganancia).connect(contexto.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracion + 0.05);
}

export function sonarPagoAprobado() {
    try {
        prepararSonido();
        if (!contexto) return;
        const t = contexto.currentTime + 0.03;
        // Mi6 → La6, cada una con su octava suave para un timbre de campana.
        nota(1318.51, t, 0.32, 0.16);
        nota(2637.02, t, 0.2, 0.03);
        nota(1760, t + 0.14, 0.5, 0.17);
        nota(3520, t + 0.14, 0.3, 0.03);
    } catch {
        // Ignorado: el sonido es un complemento.
    }
}
