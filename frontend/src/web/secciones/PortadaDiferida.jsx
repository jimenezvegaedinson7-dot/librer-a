import { useEffect, useMemo, useState } from 'react';
import PortadaEspacial from './portada3d/PortadaEspacial';
import useLibroProtagonista from '../hooks/useLibroProtagonista';
import { urlPortada } from '../lib/formato';
import { guardarRecientes, leerRecientes } from './portada3d/cachePortada';

export default function PortadaDiferida({ reducido, catalogo }) {
    const [guardados] = useState(leerRecientes);
    const recientes = useMemo(() => {
        if (catalogo?.cargando || catalogo?.error) return guardados;
        const fecha = (libro) => Date.parse(libro.creadoEn) || 0;
        return [...(catalogo?.libros || [])]
            .filter((libro) => libro.estado === 1 && urlPortada(libro.portada) && libro.precio > 0)
            .sort((a, b) => fecha(b) - fecha(a) || b.id - a.id)
            .slice(0, 5);
    }, [catalogo?.libros, catalogo?.cargando, catalogo?.error, guardados]);
    useEffect(() => {
        if (catalogo && !catalogo.cargando && !catalogo.error) guardarRecientes(recientes);
    }, [catalogo, recientes]);
    const primero = recientes[0];
    const respaldo = useMemo(
        () =>
            primero
                ? {
                      libro: primero,
                      crudo: {
                          id_libro: primero.id,
                          id_autor: primero.idAutor,
                          id_categoria: primero.idCategoria,
                          titulo: primero.titulo,
                          autor: primero.autor,
                          categoria: primero.categoria,
                          isbn: primero.isbn,
                          estado: primero.estado,
                          precio: primero.precio,
                          precio_final: primero.precioFinal,
                          descuento_vigente: primero.descuento > 0 ? 1 : 0,
                          descuento_porcentaje_efectivo: primero.descuento,
                          stock: primero.stock,
                          portada: primero.portada,
                          descripcion: primero.sinopsis,
                          creado_en: primero.creadoEn,
                          es_nuevo: primero.esNuevo ? 1 : 0,
                          mas_vendido: primero.masVendido ? 1 : 0
                      }
                  }
                : null,
        [primero]
    );
    const protagonista = useLibroProtagonista(respaldo, catalogo?.cargando);

    return (
        <div className="portada-diferida">
            <PortadaEspacial reducido={reducido} protagonista={protagonista} recientes={recientes} />
        </div>
    );
}
