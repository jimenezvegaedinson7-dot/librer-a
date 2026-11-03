import { useEffect, useState } from 'react';
import env from '../../compartido/config/env';
import { libroComercial } from '../tienda/libroComercial';
import { urlPortada } from '../lib/formato';
import { leerProtagonista, guardarProtagonista } from '../secciones/portada3d/cachePortada';

export default function useLibroProtagonista(respaldo = null, catalogoPendiente = false) {
    const [estado, setEstado] = useState(() => {
        const crudo = leerProtagonista();
        const libro = crudo && typeof crudo === 'object' ? libroComercial(crudo) : null;
        const valido = libro && libro.estado === 1 && typeof libro.titulo === 'string' && libro.titulo.trim() && urlPortada(libro.portada) && libro.precioFinal > 0;
        return { cargando: crudo !== null && !valido, libro: valido ? libro : null, crudo: valido ? crudo : null, error: false };
    });
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let vivo = true,
            consulta = null,
            ultima = 0;
        const cargar = async () => {
            if (consulta || !vivo) return;
            ultima = Date.now();
            consulta = new AbortController();
            const limite = setTimeout(() => consulta?.abort(), 12000);
            try {
                const r = await fetch(`${env.apiUrl}/anuncios/protagonista`, { signal: consulta.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
                if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
                const json = await r.json();
                const crudo = json?.data?.libro || null;
                const libro = crudo ? libroComercial(crudo) : null;
                if (libro && (libro.estado !== 1 || !libro.titulo?.trim() || !urlPortada(libro.portada) || !(libro.precioFinal > 0))) throw new Error('Libro no elegible');
                if (vivo) {
                    setEstado((anterior) =>
                        !anterior.error && !anterior.cargando && JSON.stringify(anterior.libro) === JSON.stringify(libro)
                            ? anterior.revalidado
                                ? anterior
                                : { ...anterior, revalidado: true }
                            : { cargando: false, crudo, libro, error: false, revalidado: true }
                    );
                }
            } catch (e) {
                if (vivo)
                    setEstado((previo) =>
                        e.status === 404
                            ? { ...previo, cargando: false, error: !previo.libro, sinEndpoint: true }
                            : { cargando: false, libro: null, crudo: null, error: true, sinEndpoint: false }
                    );
            } finally {
                clearTimeout(limite);
                consulta = null;
            }
        };
        const actualizar = () => {
            if (!document.hidden && Date.now() - ultima > 1000) cargar();
        };
        cargar();
        const intervalo = setInterval(actualizar, 60000);
        window.addEventListener('focus', actualizar);
        document.addEventListener('visibilitychange', actualizar);
        return () => {
            vivo = false;
            consulta?.abort();
            clearInterval(intervalo);
            window.removeEventListener('focus', actualizar);
            document.removeEventListener('visibilitychange', actualizar);
        };
    }, [revision]);
    const actual = estado.sinEndpoint
        ? respaldo
            ? { ...estado, ...respaldo, cargando: false, error: false, respaldo: true }
            : catalogoPendiente
              ? { ...estado, cargando: !estado.libro, error: false }
              : { ...estado, cargando: false, libro: null, crudo: null, error: false, respaldo: true }
        : estado;
    useEffect(() => {
        if (actual.respaldo || actual.revalidado) guardarProtagonista(actual.crudo);
    }, [actual.respaldo, actual.revalidado, actual.crudo]);
    return { ...actual, reintentar: () => setRevision((n) => n + 1) };
}
