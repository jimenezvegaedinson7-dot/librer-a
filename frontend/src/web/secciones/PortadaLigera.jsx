import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PrecioOferta } from '../componentes/PrecioOferta';
import useLibroProtagonista from '../hooks/useLibroProtagonista';
import { urlPortada } from '../lib/formato';
import { guardarRecientes, leerRecientes } from './portada3d/cachePortada';
import './portada-ligera.css';

function Portada({ libro, principal = false }) {
    const [fallida, setFallida] = useState(false);
    const src = urlPortada(libro.portada, principal ? 480 : 320);
    return src && !fallida
        ? <img src={src} alt={`Portada de ${libro.titulo}`} width={principal ? 240 : 160} height={principal ? 360 : 240}
            loading={principal ? 'eager' : 'lazy'} fetchPriority={principal ? 'high' : 'auto'} decoding="async" onError={() => setFallida(true)} />
        : <span className="portada-ligera__sin-imagen">Portada no disponible</span>;
}

export default function PortadaLigera({ catalogo }) {
    const [guardados] = useState(leerRecientes);
    const recientes = useMemo(() => {
        if (catalogo?.cargando || catalogo?.error) return guardados;
        const fecha = (l) => Date.parse(l.creadoEn) || 0;
        return [...(catalogo?.libros || [])].filter((l) => l.estado === 1 && urlPortada(l.portada) && l.precio > 0)
            .sort((a, b) => fecha(b) - fecha(a) || b.id - a.id).slice(0, 5);
    }, [catalogo?.libros, catalogo?.cargando, catalogo?.error, guardados]);
    useEffect(() => {
        if (catalogo && !catalogo.cargando && !catalogo.error) guardarRecientes(recientes);
    }, [catalogo, recientes]);
    const respaldo = useMemo(() => {
        const l = recientes[0];
        return l ? { libro: l, crudo: { id_libro: l.id, titulo: l.titulo, autor: l.autor, estado: l.estado,
            precio: l.precio, precio_final: l.precioFinal, descuento_vigente: l.descuento > 0 ? 1 : 0,
            descuento_porcentaje_efectivo: l.descuento, stock: l.stock, portada: l.portada, descripcion: l.sinopsis, creado_en: l.creadoEn } } : null;
    }, [recientes]);
    const { libro, cargando, error, reintentar } = useLibroProtagonista(respaldo, catalogo?.cargando);

    return (
        <section className="portada-ligera" aria-label="Portada de MATIDANA Libros y Cultura">
            <div className="contenedor portada-ligera__principal">
                <div className="portada-ligera__texto">
                    <h1>Historias que abren otros mundos.</h1>
                    <p>Libros físicos con delivery en Pallasca y recojo gratuito en tienda.</p>
                    <Link to="/catalogo" className="boton boton--principal">Ver catálogo</Link>
                    {cargando && !libro && <p role="status">Cargando el libro destacado…</p>}
                    {error && <p role="status">No pudimos cargar el libro destacado. <button type="button" onClick={reintentar}>Reintentar</button></p>}
                </div>
                {libro && <article className="portada-ligera__destacado">
                    <Link to={`/libro/${libro.id}`} className="portada-ligera__tapa"><Portada key={libro.id} libro={libro} principal /></Link>
                    <div className="portada-ligera__ficha">
                        <h2>{libro.titulo}</h2>
                        {libro.autor && <p>{libro.autor}</p>}
                        <PrecioOferta libro={libro} />
                        <p>{libro.disponible ? 'Disponible' : 'Agotado por ahora'}</p>
                        <Link to={`/libro/${libro.id}`}>Ver este libro</Link>
                    </div>
                </article>}
            </div>
            {recientes.length > 0 && <div className="contenedor portada-ligera__recientes">
                <h2>Últimos libros agregados</h2>
                <ul aria-label="Últimos libros agregados">
                    {recientes.map((l) => <li key={l.id}>
                        <Link to={`/libro/${l.id}`}>
                            <Portada key={l.id} libro={l} />
                            <h3>{l.titulo}</h3>
                            {l.autor && <p>{l.autor}</p>}
                            <PrecioOferta libro={l} />
                        </Link>
                    </li>)}
                </ul>
            </div>}
        </section>
    );
}
