import { Link } from 'react-router-dom';
import PortadaLibro from './PortadaLibro';
import { PrecioOferta } from '../components/PrecioOferta';
import { TarjetaLibro } from '../pages/CatalogoPage';

export function LibrosRelacionados({ libros, cargando, error, reintentar }) {
    return <aside className="ficha-relacionados" aria-labelledby="relacionados-titulo"><h2 id="relacionados-titulo">Libros relacionados</h2>
        {cargando?<p role="status">Cargando relacionados…</p>:error?<p role="status">No pudimos cargar las recomendaciones. <button type="button" className="enlace-texto" onClick={reintentar}>Reintentar relacionados</button></p>
            :!libros.length?<p>No hay otros títulos relacionados en este momento.</p>
                :<ul>{libros.map(l=><li key={l.id}><PortadaLibro key={l.id} libro={l} mini/>
                    <div><h3><Link to={`/libro/${l.id}`}>{l.titulo}</Link></h3><p>{l.autor}</p><PrecioOferta libro={l}/>
                        {!l.disponible && <span className="ficha-agotado-mini">Agotado</span>}</div></li>)}</ul>}
    </aside>;
}

export function SeccionLibros({ titulo, libros, enlace, mensajeVacio }) {
    return <section className="ficha-seccion ficha-descubrir"><div className="ficha-seccion-cabeza"><h2>{titulo}</h2>
        {enlace && <Link className="enlace-texto" to={enlace}>Ver todos</Link>}</div>
        {libros.length?<ul className="rejilla-libros">{libros.map((l,i)=><TarjetaLibro key={l.id} libro={l} indice={i} nivelTitulo="h3" portadaSegura/>)}</ul>
            :<p>{mensajeVacio}</p>}
    </section>;
}
