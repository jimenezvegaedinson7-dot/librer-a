import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { clienteApi, firmaSesion } from '../../../services/web/tienda/clienteApi';
import { libroComercial } from '../../../services/web/tienda/libroComercial';
import { TarjetaLibro } from '../../../views/web/publicas/CatalogoPage';
import './recomendaciones-compra.css';

const motivos = { autor_categoria: 'Coincide en autor y categoría con tus compras', autor: 'De un autor de tus compras', categoria: 'De una categoría de tus compras' };

export default function RecomendacionesCompra({ compras, sesion }) {
    const [revision, setRevision] = useState(0);
    const [estado, setEstado] = useState({ clave: '', libros: [], error: '' });
    const pagadas = compras.filter((v) => ['pagada', 'entregada'].includes(v.estado));
    const historial = JSON.stringify(
        pagadas.map((v) => ({ id: Number(v.id_venta), libros: (v.detalle || []).map((i) => Number(i.id_libro)).sort((a, b) => a - b) })).sort((a, b) => a.id - b.id)
    );
    const clave = `${firmaSesion(sesion)}:${historial}:${revision}`;
    const vigentes = estado.clave === clave;
    const libros = useMemo(() => (vigentes ? estado.libros : []), [vigentes, estado.libros]);
    useEffect(() => {
        if (historial === '[]') return undefined;
        let activo = true;
        const comprados = new Set(JSON.parse(historial).flatMap((v) => v.libros));
        clienteApi
            .recomendados(sesion)
            .then((json) => {
                if (!activo) return;
                const lista = (Array.isArray(json.data) ? json.data : [])
                    .map((l) => ({ ...libroComercial(l), motivoRecomendacion: motivos[l.motivo_recomendacion] || 'Según tus compras' }))
                    .filter((l) => l.disponible && !comprados.has(l.id))
                    .slice(0, 8);
                setEstado({ clave, libros: lista, error: '' });
            })
            .catch((error) => {
                if (activo && error.name !== 'SesionCambiada') setEstado({ clave, libros: [], error: 'No pudimos consultar tus sugerencias en este momento.' });
            });
        return () => {
            activo = false;
        };
    }, [clave, historial, sesion]);
    if (historial === '[]') return null;
    return (
        <section className="recomendaciones-compra" aria-labelledby="recomendaciones-compra-titulo" aria-busy={!vigentes}>
            <h2 id="recomendaciones-compra-titulo">Otros libros que podrían gustarte</h2>
            <p className="recomendaciones-compra__explicacion">Elegidos por los autores y categorías de tus compras pagadas.</p>
            {!vigentes ? (
                <p role="status">Buscando libros según tus compras…</p>
            ) : estado.error ? (
                <div role="status">
                    <p>{estado.error}</p>
                    <button type="button" className="boton boton--linea boton--chico" onClick={() => setRevision((n) => n + 1)}>
                        Reintentar sugerencias
                    </button>
                </div>
            ) : libros.length ? (
                <ul className="rejilla-libros">
                    {libros.map((libro, indice) => (
                        <TarjetaLibro
                            key={libro.id}
                            libro={libro}
                            indice={indice}
                            nivelTitulo="h3"
                            nota={libro.motivoRecomendacion}
                        />
                    ))}
                </ul>
            ) : (
                <p>
                    No hay otros títulos disponibles de esos autores o categorías por ahora. <Link to="/catalogo">Explorar el catálogo</Link>
                </p>
            )}
        </section>
    );
}
