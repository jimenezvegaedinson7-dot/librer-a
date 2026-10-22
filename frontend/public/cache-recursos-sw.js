/* Caché de recursos visuales. Nunca intercepta documentos, JSON ni operaciones. */
const RECURSOS = 'lds-recursos-v1';
const FECHAS = 'lds-recursos-fechas-v1';
const MAXIMO = 200;
const VIGENCIA = 24 * 60 * 60 * 1000;
const pendientes = new Map();
let escritura = Promise.resolve();

self.addEventListener('install', (evento) => evento.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (evento) => evento.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => n.startsWith('lds-recursos-') && ![RECURSOS, FECHAS].includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
})()));

function permitida(peticion) {
    const url = new URL(peticion.url);
    if (peticion.method !== 'GET' || !/^https?:$/.test(url.protocol) || peticion.headers.has('Authorization')) return false;
    if (/\/api\/(auth|usuarios|pagos|ventas|favoritos|asistente)(\/|$)/.test(url.pathname)) return false;
    if (peticion.destination === 'image') return true;
    if (url.origin !== self.location.origin) return false;
    return peticion.destination === 'font' || /^\/assets\/[^/]+-[\w-]{8,}\.(js|css)$/.test(url.pathname);
}

function guardar(peticion, respuesta) {
    const copia = respuesta.clone();
    escritura = escritura.catch(() => {}).then(async () => {
        const cache = await caches.open(RECURSOS), fechas = await caches.open(FECHAS);
        await cache.delete(peticion.url);
        await cache.put(peticion.url, copia);
        await fechas.put(peticion.url, new Response(String(Date.now())));
        const claves = await cache.keys();
        for (const clave of claves.slice(0, Math.max(0, claves.length - MAXIMO))) {
            await cache.delete(clave);
            await fechas.delete(clave.url);
        }
    });
    return escritura.catch(() => {});
}

function descargar(peticion, evento) {
    const clave = `${peticion.url}:${peticion.mode}`;
    if (!pendientes.has(clave)) {
        const carga = fetch(peticion).then((respuesta) => {
            if ((respuesta.ok || respuesta.type === 'opaque') && respuesta.status !== 206
                && !/application\/json|text\/html/i.test(respuesta.headers.get('Content-Type') || '')
                && !/no-store|private/i.test(respuesta.headers.get('Cache-Control') || '')
                && Number(respuesta.headers.get('Content-Length') || 0) <= 8 * 1024 * 1024) {
                // La escritura en disco no retrasa la primera imagen.
                evento.waitUntil(guardar(peticion, respuesta));
            }
            return respuesta;
        }).finally(() => pendientes.delete(clave));
        pendientes.set(clave, carga);
    }
    return pendientes.get(clave).then((r) => r.clone());
}

async function resolver(peticion, evento) {
    try {
        const cache = await caches.open(RECURSOS);
        const guardada = await cache.match(peticion.url, { ignoreVary: true });
        // Una respuesta opaca de <img> no sirve como textura WebGL CORS.
        if (guardada && !(guardada.type === 'opaque' && peticion.mode === 'cors')) {
            const fecha = await (await caches.open(FECHAS)).match(peticion.url);
            const edad = Date.now() - Number(fecha ? await fecha.text() : 0);
            if (edad > VIGENCIA) evento.waitUntil(descargar(peticion, evento).catch(() => {}));
            return guardada;
        }
    } catch { /* Sin CacheStorage se conserva la carga normal. */ }
    return descargar(peticion, evento);
}

self.addEventListener('fetch', (evento) => {
    if (permitida(evento.request)) evento.respondWith(resolver(evento.request, evento));
});

// Guarda también las imágenes de la primera visita, antes de tomar el control.
self.addEventListener('message', (evento) => {
    if (evento.origin !== self.location.origin || evento.data?.tipo !== 'PRECARGAR_PORTADAS') return;
    const urls = [...new Set(evento.data.urls || [])].filter((u) => {
        try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; }
    }).slice(0, MAXIMO);
    evento.waitUntil(Promise.all(Array.from({ length: 2 }, async () => {
        while (urls.length) {
            const url = urls.shift();
            const peticion = new Request(url, { mode: 'cors', credentials: 'omit', priority: 'low' });
            try {
                const cache = await caches.open(RECURSOS);
                if (await cache.match(url, { ignoreVary: true })) continue;
                await descargar(peticion, evento);
            } catch { /* Un CDN sin CORS se guardará cuando lo pida un <img>. */ }
        }
    })));
});
