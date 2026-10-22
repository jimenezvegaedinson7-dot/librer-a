import { useEffect, useState } from 'react';

import { listarLibros } from './inventarioService';

export default function useLibros() {
    const [libros, setLibros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;
        const cargar = async () => {
            try {
                setCargando(true);
                const datos = await listarLibros();
                if (!activo) return;
                setLibros(datos);
            } catch {
                if (activo) setError('No se pudieron cargar los libros');
            } finally {
                if (activo) setCargando(false);
            }
        };
        cargar();
        return () => {
            activo = false;
        };
    }, []);

    return { libros, cargando, error };
}
