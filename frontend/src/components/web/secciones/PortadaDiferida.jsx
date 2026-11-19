import { useEffect, useMemo, useState } from 'react';
import PortadaEspacial from './portada3d/PortadaEspacial';
import { urlPortada } from '../../../services/web/formato';
import { guardarRecientes, leerRecientes, LIBROS_RECIENTES } from './portada3d/cachePortada';

export default function PortadaDiferida({ catalogo }) {
    const [guardados] = useState(leerRecientes);
    const recientes = useMemo(() => {
        if (catalogo?.cargando || catalogo?.error) return guardados;
        const fecha = (libro) => Date.parse(libro.creadoEn) || 0;
        return [...(catalogo?.libros || [])]
            .filter((libro) => libro.estado === 1 && urlPortada(libro.portada) && libro.precio > 0)
            .sort((a, b) => fecha(b) - fecha(a) || b.id - a.id)
            .slice(0, LIBROS_RECIENTES);
    }, [catalogo?.libros, catalogo?.cargando, catalogo?.error, guardados]);
    useEffect(() => {
        if (catalogo && !catalogo.cargando && !catalogo.error) guardarRecientes(recientes);
    }, [catalogo, recientes]);

    return (
        <div className="portada-diferida">
            <PortadaEspacial recientes={recientes} />
        </div>
    );
}
