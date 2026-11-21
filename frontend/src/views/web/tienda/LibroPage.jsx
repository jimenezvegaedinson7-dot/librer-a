import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { clienteApi } from '../../../services/web/tienda/clienteApi';
import { libroComercial } from '../../../services/web/tienda/libroComercial';
import { PrecioOferta } from '../../../components/web/PrecioOferta';
import ComprarLibro from '../../../components/web/tienda/ComprarLibro';
import { useTienda } from '../../../components/web/tienda/TiendaContext';
import { Stock } from '../publicas/CatalogoPage';
import { FaStore, FaTruckFast, FaShieldHalved } from 'react-icons/fa6';
import PortadaLibro from '../../../components/web/tienda/PortadaLibro';
import FichaTecnicaLibro from '../../../components/web/tienda/FichaTecnicaLibro';
import { FavoritoLibro, CompartirLibro } from '../../../components/web/tienda/AccionesLibro';
import { LibrosRelacionados, SeccionLibros } from '../../../components/web/tienda/DescubrimientosLibro';
import useSeoLibro from '../../../hooks/web/tienda/useSeoLibro';
import { leerLibroPublico } from '../../../services/web/cachePublica';
import { analitica } from '../../../services/web/analitica';
import '../../../components/web/tienda/ficha-libro.css';

function debeMostrarDescripcion(valor) {
    const texto = typeof valor === 'string' ? valor.trim() : '';
    return !/Obra registrada en el catálogo de MATIDANA\./i.test(texto);
}

function InformacionLibro({ libro }) {
    const { items, generacion } = useTienda();
    const [cantidad, setCantidad] = useState(1);
    const agregados = items.find((i) => i.id_libro === libro.id)?.cantidad || 0;
    const enlaceAutor = libro.idAutor ? `/catalogo?autor=${libro.idAutor}` : `/catalogo?q=${encodeURIComponent(libro.autor)}`;
    return (
        <div className="ficha-informacion">
            {libro.categoria && (
                <Link className="ficha-categoria" to={`/catalogo?categoria=${encodeURIComponent(libro.categoria)}`}>
                    {libro.categoria}
                </Link>
            )}
            <h1>{libro.titulo}</h1>
            {libro.autor && (
                <p className="ficha-autor">
                    Por <Link to={enlaceAutor}>{libro.autor}</Link>
                </p>
            )}
            {libro.isbn && <p className="ficha-isbn">ISBN: {libro.isbn}</p>}
            <div className="ficha-precio">
                <PrecioOferta libro={libro} />
            </div>
            {libro.descuento > 0 && (
                <p className="ficha-promocion">
                    Antes: <s>{`S/ ${libro.precio.toFixed(2)}`}</s> · Precio promocional vigente
                </p>
            )}
            <div className="ficha-disponibilidad">
                <Stock libro={libro} />
                {libro.stock > 0 && <p>{libro.stock} unidades disponibles</p>}
            </div>
            <ComprarLibro libro={libro} detalle cantidad={Number(cantidad)} onCantidadChange={setCantidad} />
            {agregados > 0 && (
                <p className="ficha-mensaje">
                    Ya tienes {agregados} {agregados === 1 ? 'ejemplar' : 'ejemplares'} de este libro en el carrito. <Link to="/carrito">Ver carrito</Link>
                </p>
            )}
            <div className="ficha-herramientas">
                <FavoritoLibro key={`${libro.id}-${generacion}`} libro={libro} />
                <CompartirLibro libro={libro} />
            </div>
        </div>
    );
}

function EntregaFinalLibro() {
    return (
        <div className="ficha-final">
            <section className="ficha-entrega" aria-label="Entrega disponible">
                <h2>Entrega disponible</h2>
                <ul>
                    <li>
                        <FaStore aria-hidden="true" />
                        <span>
                            <strong>Recojo</strong> en Pallasca · <strong>Gratis</strong>
                        </span>
                    </li>
                    <li>
                        <FaTruckFast aria-hidden="true" />
                        <span>
                            <strong>Delivery</strong> en Pallasca · tarifa vigente
                        </span>
                    </li>
                    <li>
                        <FaShieldHalved aria-hidden="true" />
                        <span>
                            <strong>Pago seguro</strong> con <strong>PayU</strong>
                        </span>
                    </li>
                </ul>
            </section>
        </div>
    );
}

function DescripcionLibro({ libro }) {
    const [expandida, setExpandida] = useState(false);
    const larga = libro.sinopsis.length > 900;
    return (
        <section className="ficha-descripcion ficha-seccion" id="descripcion-libro" aria-labelledby="descripcion-titulo">
            <h2 id="descripcion-titulo">Descripción</h2>
            {libro.sinopsis ? (
                <>
                    <div id="descripcion-contenido" className={`ficha-descripcion-texto${larga && !expandida ? ' ficha-descripcion-texto--breve' : ''}`}>
                        {libro.sinopsis}
                    </div>
                    {larga && (
                        <button type="button" className="enlace-texto" aria-expanded={expandida} aria-controls="descripcion-contenido" onClick={() => setExpandida((v) => !v)}>
                            {expandida ? 'Ver menos' : 'Ver más'}
                        </button>
                    )}
                </>
            ) : (
                <p>Este libro todavía no tiene una descripción registrada.</p>
            )}
        </section>
    );
}

function CargandoFicha() {
    return (
        <>
            <h1>Detalle del libro</h1>
            <p role="status">Cargando la ficha del libro…</p>
            <div className="ficha-superior ficha-cargando" aria-hidden="true">
                <div className="ficha-skeleton ficha-esqueleto-portada" />
                <div>
                    {[1, 2, 3, 4].map((n) => (
                        <div className="ficha-skeleton ficha-esqueleto-linea" key={n} />
                    ))}
                </div>
                <div className="ficha-skeleton ficha-esqueleto-lateral" />
            </div>
        </>
    );
}

export default function LibroPage() {
    const { id } = useParams();
    const { key } = useLocation();
    const [version, setVersion] = useState(0);
    const [versionRelacionados, setVersionRelacionados] = useState(0);
    const [recomendaciones, setRecomendaciones] = useState({ id: null, libro: null, version: -1, data: null, error: false });
    const [autor, setAutor] = useState(null);
    const [estado, setEstado] = useState(() => {
        const datos = leerLibroPublico(id);
        const libro = datos && Number(datos.estado) === 1 ? libroComercial(datos) : null;
        return { id, libro, error: '', cargando: !libro };
    });
    useEffect(() => {
        let activo = true;
        clienteApi
            .libro(id)
            .then((json) => {
                if (Number(json.data?.estado) !== 1) throw new Error('Este libro no está disponible en el catálogo.');
                if (activo) setEstado({ id, libro: libroComercial(json.data), error: '', cargando: false });
            })
            .catch((e) => {
                if (activo) setEstado({ id, libro: null, error: e.message, status: e.status, cargando: false });
            });
        return () => {
            activo = false;
        };
    }, [id, version]);
    const l = useMemo(() => {
        if (estado.id === id) return estado.libro;
        const guardado = leerLibroPublico(id);
        return guardado && Number(guardado.estado) === 1 ? libroComercial(guardado) : null;
    }, [estado.id, estado.libro, id]);
    useEffect(() => {
        if (!l) return undefined;
        let activo = true;
        clienteApi
            .relacionados(id, l)
            .then((j) => {
                if (activo) setRecomendaciones({ id, libro: l, version: versionRelacionados, data: j.data, error: false });
            })
            .catch(() => {
                if (activo) setRecomendaciones({ id, libro: l, version: versionRelacionados, data: null, error: true });
            });
        return () => {
            activo = false;
        };
    }, [id, l, versionRelacionados]);
    const idAutor = l?.idAutor;
    useEffect(() => {
        if (l) analitica.libro(l, key);
    }, [l, key]);
    useEffect(() => {
        if (!idAutor) return undefined;
        let activo = true;
        clienteApi
            .autor(idAutor)
            .then((j) => {
                if (activo) setAutor({ id: idAutor, data: j.data });
            })
            .catch(() => {});
        return () => {
            activo = false;
        };
    }, [idAutor]);
    useSeoLibro(l);
    const recomendacionesVigentes = recomendaciones.id === id && recomendaciones.libro === l && recomendaciones.version === versionRelacionados;
    const datos = recomendacionesVigentes ? recomendaciones.data : null;
    const lista = (clave) => (datos?.[clave] || []).filter((x) => Number(x.estado) === 1 && Number(x.id_libro) !== Number(id)).map(libroComercial);
    const relacionados = lista('relacionados'),
        masAutor = lista('mas_autor'),
        interesarte = lista('interesarte');
    const enlaceAutor = l?.idAutor ? `/catalogo?autor=${l.idAutor}` : `/catalogo?q=${encodeURIComponent(l?.autor || '')}`;
    const datosAutor = autor?.data || null;
    const biografiaAutor = idAutor != null && autor?.id === idAutor ? String(datosAutor?.biografia || '').trim() : '';
    const nacionalidadAutor = idAutor != null && autor?.id === idAutor ? String(datosAutor?.nacionalidad || '').trim() : '';
    const mostrarSobreAutor = Boolean(biografiaAutor || nacionalidadAutor);
    return (
        <section className="compra-pagina contenedor ficha-libro">
            <nav className="ficha-migas" aria-label="Ruta del libro">
                <Link to="/">Inicio</Link>
                <span aria-hidden="true">/</span>
                <Link to="/catalogo">Catálogo</Link>
                {l?.categoria && (
                    <>
                        <span aria-hidden="true">/</span>
                        <Link to={`/catalogo?categoria=${encodeURIComponent(l.categoria)}`}>{l.categoria}</Link>
                    </>
                )}
            </nav>
            {!l && (estado.cargando || estado.id !== id) ? (
                <CargandoFicha />
            ) : !l ? (
                <div className="ficha-error">
                    <h1>{estado.status === 404 ? 'Libro no encontrado' : 'Libro no disponible'}</h1>
                    <p role="alert">{estado.error}</p>
                    {estado.status !== 404 && (
                        <button type="button" className="boton boton--linea" onClick={() => setVersion((v) => v + 1)}>
                            Reintentar ficha
                        </button>
                    )}
                    <Link className="boton boton--compra" to="/catalogo">
                        Volver al catálogo
                    </Link>
                </div>
            ) : (
                <>
                    <div className="ficha-superior">
                        <div className="ficha-portada-principal">
                            <PortadaLibro key={l.id} libro={l} prioritaria />
                        </div>
                        <InformacionLibro key={l.id} libro={l} />
                        <LibrosRelacionados
                            libros={relacionados}
                            cargando={!recomendacionesVigentes}
                            error={recomendacionesVigentes && recomendaciones.error}
                            reintentar={() => setVersionRelacionados((v) => v + 1)}
                        />
                    </div>
                    <div className="ficha-contenido">
                        <FichaTecnicaLibro libro={l} />
                        {debeMostrarDescripcion(l.sinopsis) && <DescripcionLibro key={l.id} libro={l} />}
                    </div>
                    {l.autor && mostrarSobreAutor && (
                        <section className="ficha-sobre-autor ficha-seccion">
                            <h2>Sobre {l.autor}</h2>
                            {biografiaAutor && <p className="ficha-biografia">{biografiaAutor}</p>}
                            {nacionalidadAutor && <p>Nacionalidad: {nacionalidadAutor}</p>}
                            <Link className="enlace-texto" to={enlaceAutor}>
                                Explorar los libros de {l.autor}
                            </Link>
                        </section>
                    )}
                    {l.autor && (!datos || masAutor.length > 0) && (
                        <SeccionLibros
                            titulo={`Más libros de ${l.autor}`}
                            libros={masAutor}
                            enlace={enlaceAutor}
                            mensajeVacio={
                                !datos
                                    ? 'Puedes explorar otros títulos del autor en el catálogo.'
                                    : relacionados.some((x) => x.idAutor === l.idAutor)
                                      ? 'Los otros títulos del autor aparecen en Libros relacionados.'
                                      : 'No hay otros libros de este autor en el catálogo para mostrar.'
                            }
                        />
                    )}

                    {(!datos || interesarte.length > 0) && (
                        <SeccionLibros
                            titulo="También podría interesarte"
                            libros={interesarte}
                            enlace={l.categoria ? `/catalogo?categoria=${encodeURIComponent(l.categoria)}` : undefined}
                            mensajeVacio={!datos ? 'Puedes explorar esta categoría en el catálogo.' : 'No hay más títulos de esta categoría para mostrar en este momento.'}
                        />
                    )}
                    <EntregaFinalLibro />
                </>
            )}
        </section>
    );
}
