import { useEffect, useState } from 'react';

import env from '../../config/env';
import { LEGAL_RESPALDO } from '../config/site';

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
export function useCatalogo(limite = null) {
    const [estado, setEstado] = useState({ cargando: true, error: false, libros: [] });

    useEffect(() => {
        const control = new AbortController();
        obtener('/libros', control.signal)
            .then((json) => {
                const libros = lista(json)
                    .filter((l) => Number(l.estado) === 1 && l.portada)
                    .slice(0, limite ?? undefined)
                    .map((l) => {
                        const enOferta = Number(l.descuento_vigente) === 1;
                        return {
                            id: l.id_libro,
                            titulo: l.titulo,
                            autor: l.autor || '',
                            categoria: l.categoria || '',
                            precio: Number(l.precio),
                            precioFinal: enOferta ? Number(l.precio_final) : Number(l.precio),
                            descuento: enOferta ? Number(l.descuento_porcentaje_efectivo) : 0,
                            portada: l.portada,
                            disponible: Number(l.stock) > 0,
                            esNuevo: Number(l.es_nuevo) === 1,
                        };
                    });
                setEstado({ cargando: false, error: false, libros });
            })
            .catch((e) => {
                if (e.name !== 'AbortError') setEstado({ cargando: false, error: true, libros: [] });
            });
        return () => control.abort();
    }, [limite]);

    return estado;
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
