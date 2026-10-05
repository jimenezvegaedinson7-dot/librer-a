import { useCallback, useEffect, useRef } from 'react';

import { clienteApi } from '../tienda/clienteApi';
import { useTienda } from '../tienda/TiendaContext';

// ============================================================
// MEMORIA DEL ASISTENTE
// Con sesión de cliente, lo aprendido se guarda en el servidor (sirve en
// cualquier dispositivo). Sin sesión, solo dura mientras la pestaña está
// abierta. Aprende el apodo, los autores y categorías que más busca o abre,
// los libros que ya vio y su última búsqueda. Nunca guarda la conversación.
// ============================================================
const CLAVE_LOCAL = 'asistente-memoria';
const vacia = () => ({ categorias: {}, autores: {}, vistos: [], visitas: 0 });
const leerLocal = () => { try { return { ...vacia(), ...JSON.parse(sessionStorage.getItem(CLAVE_LOCAL) || '{}') }; } catch { return vacia(); } };
const guardarLocal = (datos) => { try { sessionStorage.setItem(CLAVE_LOCAL, JSON.stringify(datos)); } catch { /* sin almacenamiento */ } };
const sumar = (mapa, clave, cuanto) => {
    const k = String(clave || '').trim().slice(0, 60);
    if (!k) return mapa;
    return { ...mapa, [k]: Math.min(999, (mapa[k] || 0) + cuanto) };
};
const primero = (mapa) => Object.entries(mapa || {}).sort((a, b) => b[1] - a[1])[0]?.[0];

export function useMemoriaAsistente() {
    const { usuario, sesion } = useTienda();
    const idUsuario = usuario?.id_usuario;
    const memoria = useRef(vacia());
    const cargada = useRef(false);
    const temporizador = useRef(null);
    const sesionActual = useRef(sesion);
    useEffect(() => { sesionActual.current = sesion; }, [sesion]);

    useEffect(() => {
        cargada.current = false;
        memoria.current = vacia();
        if (!idUsuario) { memoria.current = leerLocal(); cargada.current = true; return undefined; }
        let activo = true;
        clienteApi.memoriaAsistente(sesionActual.current)
            .then((j) => { if (activo) memoria.current = { ...vacia(), ...(j.data || {}) }; })
            .catch(() => { /* sin memoria guardada: se empieza de cero */ })
            .finally(() => { if (activo) cargada.current = true; });
        return () => { activo = false; };
    }, [idUsuario]);

    useEffect(() => () => clearTimeout(temporizador.current), []);

    // Guarda con una pequeña espera para juntar varios aprendizajes seguidos.
    const guardar = useCallback(() => {
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
            if (idUsuario) clienteApi.guardarMemoriaAsistente(memoria.current, sesionActual.current).catch(() => {});
            else guardarLocal(memoria.current);
        }, 1200);
    }, [idUsuario]);

    const cambiar = useCallback((fn) => { memoria.current = fn(memoria.current); guardar(); }, [guardar]);

    return {
        logeado: Boolean(idUsuario),
        lista: () => cargada.current,
        datos: () => memoria.current,
        nombre: () => memoria.current.apodo || usuario?.nombre || '',
        autorFavorito: () => primero(memoria.current.autores),
        categoriaFavorita: () => primero(memoria.current.categorias),
        recordar: (cambios) => cambiar((m) => ({ ...m, ...cambios })),
        contarVisita: () => cambiar((m) => ({ ...m, visitas: (m.visitas || 0) + 1 })),
        // Lo que devolvió una búsqueda: suma poco (puede no ser lo que buscaba).
        aprenderBusqueda: (libros, consulta) => cambiar((m) => {
            let { categorias, autores } = m;
            (libros || []).slice(0, 3).forEach((l) => { categorias = sumar(categorias, l.categoria, 1); autores = sumar(autores, l.autor, 1); });
            const ultima = String(consulta || '').replace(/[^\p{L}\p{N} .,'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
            return { ...m, categorias, autores, ...(ultima.length >= 2 ? { ultimaBusqueda: ultima } : {}) };
        }),
        // Un libro que abrió desde el chat: señal fuerte de interés.
        aprenderVisto: (libro) => cambiar((m) => ({
            ...m,
            categorias: sumar(m.categorias, libro.categoria, 2),
            autores: sumar(m.autores, libro.autor, 2),
            vistos: [...(m.vistos || []).filter((id) => id !== libro.id), libro.id].slice(-20),
        })),
        olvidar: async () => {
            clearTimeout(temporizador.current);
            memoria.current = vacia();
            if (idUsuario) await clienteApi.borrarMemoriaAsistente(sesionActual.current).catch(() => {});
            else guardarLocal(memoria.current);
        },
    };
}
