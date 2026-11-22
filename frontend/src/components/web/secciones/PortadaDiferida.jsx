import { useEffect, useMemo, useState } from 'react';
import PortadaEspacial from './portada3d/PortadaEspacial';
import { urlPortada } from '../../../services/web/formato';
import { guardarRecientes, leerRecientes, LIBROS_RECIENTES } from './portada3d/cachePortada';

function ordenarRecientes(libros = []) {
    const fecha = (libro) => Date.parse(libro.creadoEn) || 0;
    return [...libros]
        .filter((libro) => libro.estado === 1 && urlPortada(libro.portada) && libro.precio > 0)
        .sort((a, b) => fecha(b) - fecha(a) || b.id - a.id)
        .slice(0, LIBROS_RECIENTES);
}

export default function PortadaDiferida({ catalogo }) {
    const [guardados] = useState(leerRecientes);
    const fuente = useMemo(
        () => (catalogo?.origen === 'servidor' ? catalogo?.libros || [] : catalogo?.libros?.length ? catalogo.libros : guardados),
        [catalogo, guardados]
    );
    const recientes = useMemo(() => ordenarRecientes(fuente), [fuente]);
    useEffect(() => {
        if (catalogo?.origen === 'servidor' && !catalogo.cargando && !catalogo.error) guardarRecientes(recientes);
    }, [catalogo?.origen, catalogo?.cargando, catalogo?.error, recientes]);

    return (
        <div className="portada-diferida">
            <PortadaEspacial recientes={recientes} />
        </div>
    );
}
