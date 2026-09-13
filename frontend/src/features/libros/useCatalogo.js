import { useEffect, useState } from 'react';

import { listarAutores, listarCategorias } from './librosService';

export default function useCatalogo() {
    const [autores, setAutores] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;
        const cargar = async () => {
            try {
                setCargando(true);
                const [a, c] = await Promise.all([listarAutores(), listarCategorias()]);
                if (!activo) return;
                setAutores(a);
                setCategorias(c);
            } catch {
                if (activo) setError('Error al cargar autores o categorías');
            } finally {
                if (activo) setCargando(false);
            }
        };
        cargar();
        return () => {
            activo = false;
        };
    }, []);

    return { autores, categorias, cargando, error };
}
