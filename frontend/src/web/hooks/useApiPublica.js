import { useEffect, useState } from 'react';

import env from '../../compartido/config/env';
import { LEGAL_RESPALDO } from '../config/site';
import { libroComercial } from '../tienda/libroComercial';
import { leerPublico, guardarPublico } from '../lib/cachePublica';

// La web pública usa fetch directo (sin el cliente del panel) para no
// enviar nunca el token de administrador ni heredar su manejo de 401.
async function obtener(ruta, signal) {
    const res = await fetch(`${env.apiUrl}${ruta}`, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json?.success !== false) guardarPublico(ruta, json);
    return json;
}

const lista = (json) => (Array.isArray(json) ? json : json?.data || json?.libros || []);

// Catálogo real: libros activos, con portada, en orden de la API.
// Sin límite devuelve todos.
//
// precio_final y descuento_vigente los calcula el backend: si la promoción
// venció, precio_final ya vuelve al precio de lista y descuento_vigente
// viene en 0, así que aquí no hay que reimplementar la regla de fechas.
export function useCatalogo(limite = null, habilitado = true) {
    const normalizar = (json) => lista(json).filter((l) => Number(l.estado) === 1).slice(0, limite ?? undefined).map(libroComercial);
    const [estado, setEstado] = useState(() => {
        const cache = habilitado ? leerPublico('/libros') : undefined;
        return { cargando: habilitado && !cache, habilitado, error: false, libros: cache ? normalizar(cache) : [] };
    });

    useEffect(() => {
        if (!habilitado) return undefined;
        const control = new AbortController();
        obtener('/libros', control.signal)
            .then((json) => {
                const libros = lista(json).filter((l) => Number(l.estado) === 1).slice(0, limite ?? undefined).map(libroComercial);
                setEstado({ cargando: false, habilitado: true, error: false, libros });
            })
            .catch((e) => {
                if (e.name !== 'AbortError') setEstado((previo) => ({ ...previo, cargando: false, habilitado: true, error: !previo.libros.length }));
            });
        return () => control.abort();
    }, [limite, habilitado]);

    return habilitado && !estado.habilitado ? {...estado,cargando:true} : estado;
}

// Anuncio en video de la portada. Lo sube el administrador desde el panel,
// así que puede no haber ninguno: eso no es un error, la portada sigue
// funcionando sin la sección de video.
export function useAnuncioActivo() {
    const [estado, setEstado] = useState(() => {
        const cache = leerPublico('/anuncios');
        return { cargando: !cache, anuncio: cache?.anuncio || null };
    });

    useEffect(() => {
        const control = new AbortController();
        obtener('/anuncios', control.signal)
            .then((json) => {
                setEstado({ cargando: false, anuncio: json?.anuncio || null });
            })
            .catch((e) => {
                if (e.name !== 'AbortError') setEstado({ cargando: false, anuncio: null });
            });
        return () => control.abort();
    }, []);

    return estado;
}

// Datos legales de la empresa; si la API no responde se usa el respaldo.
export function useEmpresa() {
    const [legal, setLegal] = useState(() => {
        const json = leerPublico('/empresa');
        const e = json?.empresa || json?.data || json;
        return { ...LEGAL_RESPALDO,
            nombreComercial: e?.nombre_comercial || LEGAL_RESPALDO.nombreComercial,
            razonSocial: e?.razon_social || LEGAL_RESPALDO.razonSocial,
            ruc: e?.ruc || LEGAL_RESPALDO.ruc };
    });

    useEffect(() => {
        const control = new AbortController();
        obtener('/empresa', control.signal)
            .then((json) => {
                const e = json?.empresa || json?.data || json;
                setLegal((previo) => ({
                    nombreComercial: e?.nombre_comercial || previo.nombreComercial,
                    razonSocial: e?.razon_social || previo.razonSocial,
                    ruc: e?.ruc || previo.ruc,
                    direccion: previo.direccion,
                }));
            })
            .catch(() => {});
        return () => control.abort();
    }, []);

    return legal;
}

// La actualización consulta siempre el servidor: el QR no queda atado a un
// número de versión ni envía el token del panel a la API pública.
export function useVersionApp() {
    const [estado, setEstado] = useState({ cargando: true, error: false, version: null });
    useEffect(() => {
        const control = new AbortController();
        obtener('/app/version', control.signal)
            .then((version) => {
                const url = new URL(version.apkUrl);
                if (url.protocol !== 'https:' || url.host !== 'github.com'
                    || !url.pathname.startsWith('/jimenezvegaedinson7-dot/librer-a/releases/download/')
                    || String(version.apkUrl).includes('..') || !url.pathname.endsWith('.apk')
                    || !/^\d+\.\d+\.\d+$/.test(version.version)) throw new Error('Versión no válida');
                setEstado({ cargando: false, error: false, version });
            })
            .catch((e) => {
                if (e.name !== 'AbortError') setEstado({ cargando: false, error: true, version: null });
            });
        return () => control.abort();
    }, []);
    return estado;
}
