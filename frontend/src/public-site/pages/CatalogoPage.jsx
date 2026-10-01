import { useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { FaMagnifyingGlass, FaMobileScreenButton } from 'react-icons/fa6';

import Migas from '../components/Migas';
import { portada, soles } from '../lib/formato';

// Sin tildes ni mayúsculas: "Garcia" encuentra "García".
const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function TarjetaLibro({ libro, indice }) {
    return (
        <li className="tarjeta-libro" style={{ '--i': indice % 10 }}>
            <div className="tarjeta-libro__tapa">
                <img
                    src={portada(libro.portada, 320)}
                    srcSet={`${portada(libro.portada, 240)} 240w, ${portada(libro.portada, 360)} 360w, ${portada(libro.portada, 480)} 480w`}
                    sizes="(max-width: 520px) 45vw, 220px"
                    alt={`Portada de ${libro.titulo}`}
                    width="220"
                    height="330"
                    loading="lazy"
                    decoding="async"
                />
            </div>
            {libro.categoria && <span className="categoria">{libro.categoria}</span>}
            <h2 className="libro__titulo">{libro.titulo}</h2>
            <p className="libro__autor">{libro.autor}</p>
            <p className="tarjeta-libro__precio precio">{soles(libro.precio)}</p>
            {!libro.disponible && <span className="agotado">Sin stock por ahora</span>}
            <Link to="/descargar" className="boton boton--chico">
                <FaMobileScreenButton aria-hidden="true" /> {libro.disponible ? 'Comprar en la app' : 'Ver en la app'}
            </Link>
        </li>
    );
}

export default function CatalogoPage() {
    const { catalogo } = useOutletContext();
    const { cargando, error, libros } = catalogo;
    const [params, setParams] = useSearchParams();
    const q = params.get('q') || '';
    const categoria = params.get('categoria') || '';
    const [texto, setTexto] = useState(q);

    // Si la búsqueda cambia desde la cabecera, el campo se actualiza.
    const [qPrevia, setQPrevia] = useState(q);
    if (qPrevia !== q) {
        setQPrevia(q);
        setTexto(q);
    }

    const categorias = useMemo(
        () => [...new Set(libros.map((l) => l.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
        [libros],
    );

    const visibles = useMemo(() => {
        const nq = normalizar(q);
        return libros.filter((l) => (!categoria || l.categoria === categoria)
            && (!nq || [l.titulo, l.autor, l.categoria].some((c) => normalizar(c).includes(nq))));
    }, [libros, q, categoria]);

    // Parte siempre de la URL vigente del navegador: React Router navega en
    // una transición y su copia de los parámetros puede ir un paso atrás si
    // se encadenan acciones rápidas (limpiar y buscar enseguida).
    const actualizar = (cambios) => {
        const siguiente = new URLSearchParams(window.location.search);
        Object.entries(cambios).forEach(([k, v]) => (v ? siguiente.set(k, v) : siguiente.delete(k)));
        setParams(siguiente, { replace: true });
    };

    return (
        <>
            <Migas actual="Catálogo" />
            <section className="seccion" aria-labelledby="catalogo-pagina-titulo">
                <div className="contenedor">
                    <div className="seccion__cabeza">
                        <h1 id="catalogo-pagina-titulo" className="seccion__titulo">Catálogo</h1>
                    </div>
                    <p className="seccion__entrada">Precios actuales en soles. La compra y la reserva se hacen desde la app.</p>

                    <div className="filtros">
                        <form className="buscador" role="search" onSubmit={(e) => { e.preventDefault(); actualizar({ q: texto.trim() }); }}>
                            <label htmlFor="buscar-catalogo" className="visualmente-oculto">Buscar por título, autor o categoría</label>
                            <input id="buscar-catalogo" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Título, autor o categoría" autoComplete="off" />
                            <button type="submit" aria-label="Buscar"><FaMagnifyingGlass aria-hidden="true" /></button>
                        </form>
                        {(q || categoria) && (
                            <button type="button" className="boton boton--linea boton--chico" onClick={() => { setTexto(''); actualizar({ q: '', categoria: '' }); }}>
                                Limpiar filtros
                            </button>
                        )}
                    </div>

                    {categorias.length > 0 && (
                        <div className="chips" role="group" aria-label="Filtrar por categoría">
                            <button type="button" className="chip" aria-pressed={!categoria} onClick={() => actualizar({ categoria: '' })}>Todas</button>
                            {categorias.map((c) => (
                                <button key={c} type="button" className="chip" aria-pressed={categoria === c} onClick={() => actualizar({ categoria: categoria === c ? '' : c })}>{c}</button>
                            ))}
                        </div>
                    )}

                    {error ? (
                        <p className="aviso" role="status">
                            El catálogo no se pudo cargar en este momento. Puedes verlo completo en la app.{' '}
                            <Link className="subrayado enlace-texto" to="/descargar">Descargar la app</Link>
                        </p>
                    ) : (
                        <>
                            <p className="resultado" role="status" aria-live="polite">
                                {cargando ? 'Cargando libros…' : `${visibles.length} ${visibles.length === 1 ? 'libro' : 'libros'}`}
                            </p>
                            {!cargando && visibles.length === 0 ? (
                                <p className="aviso">
                                    {libros.length === 0
                                        ? 'Estamos actualizando el catálogo. Mientras tanto, puedes explorarlo en la app.'
                                        : 'No encontramos libros con esos filtros. Prueba con otra búsqueda o categoría.'}
                                </p>
                            ) : (
                                <ul className="rejilla-libros" data-revelar="" aria-busy={cargando}>
                                    {cargando
                                        ? Array.from({ length: 10 }, (_, i) => (
                                            <li className="tarjeta-libro tarjeta-libro--esqueleto" key={i} aria-hidden="true">
                                                <div className="tarjeta-libro__tapa" />
                                                <div style={{ height: '7.5rem' }} />
                                            </li>
                                        ))
                                        : visibles.map((l, i) => <TarjetaLibro key={l.id} libro={l} indice={i} />)}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </section>
        </>
    );
}
