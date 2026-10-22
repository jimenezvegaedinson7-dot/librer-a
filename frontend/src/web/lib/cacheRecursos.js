let registro;

export function iniciarCacheRecursos() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(null);
    registro ??= navigator.serviceWorker.register('/cache-recursos-sw.js', { scope: '/', updateViaCache: 'none' })
        .then(() => navigator.serviceWorker.ready).catch(() => null);
    return registro;
}

export function precargarImagenes(urls) {
    const unicas = [...new Set(urls)].filter((u) => u && /^https?:/.test(u));
    if (!unicas.length || navigator.connection?.saveData) return;
    iniciarCacheRecursos().then((r) => {
        (r?.active || navigator.serviceWorker?.controller)?.postMessage({ tipo: 'PRECARGAR_PORTADAS', urls: unicas });
    });
}
