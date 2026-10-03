import { useEffect, useState } from 'react';

import env from '../../config/env';
import { LEGAL_RESPALDO } from '../config/site';
import { libroComercial } from '../tienda/libroComercial';

// La web pública usa fetch directo (sin el cliente del panel) para no
// enviar nunca el token de administrador ni heredar su manejo de 401.
async function obtener(ruta, signal) {
    const res = await fetch(`${env.apiUrl}${ruta}`, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

const lista = (json) => (Array.isArray(json) ? json : json?.data || json?.libros || []);

// Catálogo real: libros activos, con portada, en orden de la API.
// Sin límite devuelve todos.
//
// precio_final y descuento_vigente los calcula el backend: si la promoción
// venció, precio_final ya vuelve al precio de lista y descuento_vigente
// viene en 0, así que aquí no hay que reimplementar la regla de fechas.
export function useCatalogo(limite = null, habilitado = true) {
    const [estado, setEstado] = useState({ cargando: habilitado, habilitado, error: false, libros: [] });

    useEffect(() => {
        if (!habilitado) return undefined;
        const control = new AbortController();
        obtener('/libros', control.signal)
            .then((json) => {
                const libros = lista(json)
                    .filter((l) => Number(l.estado) === 1)
                    .slice(0, limite ?? undefined)
                    .map(libroComercial);
                setEstado({ cargando: false, habilitado: true, error: false, libros });
            })
            .catch((e) => {
                if (e.name !== 'AbortError') setEstado({ cargando: false, habilitado: true, error: true, libros: [] });
            });
        return () => control.abort();
    }, [limite, habilitado]);

    return habilitado && !estado.habilitado ? {...estado,cargando:true} : estado;
}

// Anuncio en video de la portada. Lo sube el administrador desde el panel,
// así que puede no haber ninguno: eso no es un error, la portada sigue
// funcionando sin la sección de video.
export function useAnuncioActivo() {
    const [estado, setEstado] = useState({ cargando: true, anuncio: null });

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
    const [legal, setLegal] = useState(LEGAL_RESPALDO);

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
