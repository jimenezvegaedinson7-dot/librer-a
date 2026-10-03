// ============================================================
// SONIDO DE APERTURA DEL ASISTENTE
// Una campanilla suave de dos notas, como la de una recepción,
// generada con Web Audio (sin archivos) y a volumen bajo. Solo se
// llama tras un clic del usuario, así que el navegador lo permite.
// ============================================================
let contexto = null;

export function sonarPortal() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        contexto ??= new Ctx();
        if (contexto.state === 'suspended') contexto.resume();
        const ac = contexto, t0 = ac.currentTime + 0.02;
        const salida = ac.createGain();
        salida.gain.value = 0.18;
        salida.connect(ac.destination);

        // Dos notas (Mi y La) con un armónico suave, como una campana pequeña.
        [[659.25, 0], [880, 0.14]].forEach(([f, retraso]) => {
            const t = t0 + retraso;
            for (const [multiplo, vol] of [[1, 0.5], [2.01, 0.12], [3.02, 0.05]]) {
                const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * multiplo;
                const g = ac.createGain();
                g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
                o.connect(g); g.connect(salida); o.start(t); o.stop(t + 1.25);
            }
        });
    } catch {
        // Sin audio disponible: la apertura sigue sin sonido.
    }
}
