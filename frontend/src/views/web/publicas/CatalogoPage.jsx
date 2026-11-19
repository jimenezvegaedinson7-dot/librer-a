import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { FaCircleCheck, FaMapPin, FaShieldHalved, FaTruck } from 'react-icons/fa6';
import Migas from '../../../components/web/Migas';
import { PrecioOferta } from '../../../components/web/PrecioOferta';
import { EtiquetaNuevo, EtiquetasSuperiores } from '../../../components/web/EtiquetasLibro';
import { portada, soles } from '../../../services/web/formato';
import ComprarLibro from '../../../components/web/tienda/ComprarLibro';
import PortadaLibro from '../../../components/web/tienda/PortadaLibro';
import { referenciaPortadaLibro, AVISO_PORTADA_REFERENCIA } from '../../../services/compartido/utils/portadasLibro';
import {
    BLOQUES_POR_SECCION,
    CATEGORIAS_RELACIONADAS,
    DELIVERY_CIUDAD,
    DIRECCION_RECOJO,
    etiquetaCortaCategoria,
    prioridadCategoria
} from '../../../models/config/web/site';
import { autoresConMasLibros, seriesDe } from '../../../services/web/tienda/libroComercial';

const normalizar = (t) =>
    String(t || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();

const ORDENES = {
    destacados: { texto: 'Destacados', fn: (a, b) => b.masVendido - a.masVendido || b.esNuevo - a.esNuevo },
    'precio-asc': { texto: 'Precio: de menor a mayor', fn: (a, b) => a.precioFinal - b.precioFinal },
    'precio-desc': { texto: 'Precio: de mayor a menor', fn: (a, b) => b.precioFinal - a.precioFinal },
    descuento: { texto: 'Mayor descuento', fn: (a, b) => b.descuento - a.descuento },
    titulo: { texto: 'Título (A-Z)', fn: (a, b) => a.titulo.localeCompare(b.titulo, 'es') }
};

const TITULOS_CATEGORIA = {
    'Cómic y Manga': 'Cómics y manga',
    Ficción: 'Libros de ficción',
    Ciencias: 'Libros de ciencias',
    Infantil: 'Libros infantiles',
    Juvenil: 'Libros juveniles'
};

function tituloCategoria(nombre) {
    return TITULOS_CATEGORIA[nombre] || `Libros de ${etiquetaCortaCategoria(nombre)}`;
}

function introCategoria(nombre) {
    return `Explora ${etiquetaCortaCategoria(nombre).toLocaleLowerCase('es')} disponibles en MATIDANA y elige tu próxima lectura.`;
}

const RECOJO_CORTO = DIRECCION_RECOJO.split(',')[0];

const TITULO_BLOQUE = {
    nuevos: (etiqueta) => `Novedades de ${etiqueta}`,
    ofertas: (etiqueta) => `Ofertas en ${etiqueta}`,
    vendidos: (etiqueta) => `Los más leídos de ${etiqueta}`,
    stock: (etiqueta) => `Listos para llevar en ${etiqueta}`
};

const ENLACE_BLOQUE = {
    ofertas: (codificado) => `/catalogo?categoria=${codificado}&ofertas=1`,
    stock: (codificado) => `/catalogo?categoria=${codificado}&stock=1`
};

export function Stock({ libro }) {
    if (!libro.disponible) return <p className="stock stock--agotado">Agotado por ahora.</p>;
    if (libro.stock > 0 && libro.stock <= 3) return <p className="stock stock--poco">Quedan solo {libro.stock} en stock</p>;
    return (
        <p className="stock stock--ok">
            <FaCircleCheck aria-hidden="true" /> En stock
        </p>
    );
}

export function TarjetaLibro({ libro, indice, nivelTitulo = 'h2', portadaSegura = true, nota, onSeleccion }) {
    const Titulo = nivelTitulo;
    const navigate = useNavigate();
    const ahorro = libro.descuento > 0 ? libro.precio - libro.precioFinal : 0;
    const referencia = referenciaPortadaLibro(libro);

    const abrirDetalle = (e) => {
        if (e.target.closest('button, a, input, select, label')) return;
        onSeleccion?.();
        navigate(`/libro/${libro.id}`);
    };
    return (
        <li className={`tarjeta-libro${libro.disponible ? '' : ' tarjeta-libro--sin-stock'}`} style={{ '--i': indice % 10 }}>
            <div className="tarjeta-libro__tapa" onClick={abrirDetalle}>
                {portadaSegura ? (
                    <PortadaLibro libro={libro} />
                ) : (
                    <img
                        src={portada(libro.portada, 320)}
                        srcSet={`${portada(libro.portada, 240)} 240w, ${portada(libro.portada, 360)} 360w, ${portada(libro.portada, 480)} 480w`}
                        sizes="(max-width: 520px) 45vw, 220px"
                        alt={`Portada de ${libro.titulo}`}
                        title={referencia ? `${AVISO_PORTADA_REFERENCIA}: ${referencia.edicion}` : undefined}
                        width="220"
                        height="330"
                        loading="lazy"
                        decoding="async"
                    />
                )}
                <EtiquetasSuperiores libro={libro} />
                <EtiquetaNuevo libro={libro} />
            </div>
            <div className="tarjeta-libro__cuerpo" onClick={abrirDetalle}>
                {referencia && <p className="portada-referencia">{AVISO_PORTADA_REFERENCIA}</p>}
                <Titulo className="libro__titulo">{libro.titulo}</Titulo>
                <p className="libro__autor">
                    de <span>{libro.autor}</span>
                </p>
                {libro.categoria && <span className="categoria">{libro.categoria}</span>}
                <PrecioOferta libro={libro} clase="tarjeta-libro__precio" />
                {ahorro > 0 && <p className="ahorro">Ahorras {soles(ahorro)}</p>}
                <Stock libro={libro} />
                {nota && <p className="libro__motivo">{nota}</p>}
            </div>
            <ComprarLibro libro={libro} enlaceDetalle onDetalle={onSeleccion} />
        </li>
    );
}

const POR_TANDA = 24;
const CONSULTA_CELULAR = '(max-width: 640px)';

function useEsCelular() {
    const [celular, setCelular] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(CONSULTA_CELULAR).matches);
    useEffect(() => {
        const consulta = window.matchMedia?.(CONSULTA_CELULAR);
        if (!consulta) return undefined;
        const cambiar = (e) => setCelular(e.matches);
        consulta.addEventListener('change', cambiar);
        return () => consulta.removeEventListener('change', cambiar);
    }, []);
    return celular;
}

function Estante({ estante: e }) {
    return (
        <section className="catalogo-estante" aria-labelledby={`estante-${e.id}`}>
            <div className="catalogo-estante__cabeza">
                <h2 id={`estante-${e.id}`}>{e.titulo}</h2>
                {e.enlace && (
                    <Link to={e.enlace} className="catalogo-estante__ver">
                        Ver todos
                    </Link>
                )}
            </div>
            <ul className="rejilla-libros" tabIndex={0} aria-label={`Carrusel ${e.titulo}`}>
                {e.lista.map((l, i) => (
                    <TarjetaLibro key={l.id} libro={l} indice={i} nivelTitulo="h3" />
                ))}
            </ul>
        </section>
    );
}

function Estantes({ libros }) {
    const estantes = useMemo(() => {
        const descuento = libros.filter((l) => l.descuento > 0).sort((a, b) => b.descuento - a.descuento);

        const sinDescuento = libros.filter((l) => !(l.descuento > 0));
        const recientes = [...sinDescuento].sort((a, b) => b.esNuevo - a.esNuevo || b.id - a.id);
        const vendidos = sinDescuento.filter((l) => l.masVendido);
        return [
            { id: 'descuento', titulo: 'En descuento', lista: descuento, enlace: '/catalogo?ofertas=1' },
            { id: 'recientes', titulo: 'Agregados recientemente', lista: recientes },
            { id: 'vendidos', titulo: 'Más vendidos', lista: vendidos }
        ]
            .filter((e) => e.lista.length >= 2)
            .map((e) => ({ ...e, lista: e.lista.slice(0, 12) }));
    }, [libros]);
    if (!estantes.length) return null;
    return (
        <div className="catalogo-estantes">
            {estantes.map((e) => (
                <Estante key={e.id} estante={e} />
            ))}
            <h2 className="catalogo-estante__todos">Todos los libros</h2>
        </div>
    );
}

export default function CatalogoPage() {
    const { catalogo } = useOutletContext();
    const { cargando, error, libros } = catalogo;
    const [params, setParams] = useSearchParams();
    const q = params.get('q') || '';
    const categoria = params.get('categoria') || '';
    const autorFiltro = params.get('autor') || '';
    const autorNombre = libros.find((l) => String(l.idAutor) === autorFiltro)?.autor;
    const orden = ORDENES[params.get('orden')] ? params.get('orden') : 'destacados';
    const soloOfertas = params.get('ofertas') === '1';
    const soloStock = params.get('stock') === '1';
    const hayFiltro = Boolean(q || autorFiltro || soloOfertas || soloStock);
    const esCelular = useEsCelular();

    const datosCategoria = useMemo(() => {
        const mapa = new Map();
        for (const libro of libros) {
            if (!libro.categoria) continue;
            if (!mapa.has(libro.categoria)) mapa.set(libro.categoria, { cantidad: 0, portada: null });
            const datos = mapa.get(libro.categoria);
            datos.cantidad += 1;
            if (!datos.portada && libro.portada) datos.portada = libro;
        }
        return mapa;
    }, [libros]);

    const categoriasConLibros = useMemo(() => [...datosCategoria.keys()], [datosCategoria]);
    const relacionadas = useMemo(() => {
        if (!categoria) return [];
        const sugeridas = (CATEGORIAS_RELACIONADAS[categoria] || []).filter(
            (nombre) => nombre !== categoria && categoriasConLibros.includes(nombre)
        );
        const resto = categoriasConLibros
            .filter((nombre) => nombre !== categoria && !sugeridas.includes(nombre))
            .sort((a, b) => prioridadCategoria(a) - prioridadCategoria(b) || a.localeCompare(b, 'es'));
        return [...sugeridas, ...resto].slice(0, 6);
    }, [categoria, categoriasConLibros]);

    const librosCategoria = useMemo(
        () => (categoria ? libros.filter((l) => l.categoria === categoria) : []),
        [categoria, libros]
    );
    const series = useMemo(() => (categoria ? seriesDe(librosCategoria).slice(0, 6) : []), [categoria, librosCategoria]);
    const autores = useMemo(() => (categoria ? autoresConMasLibros(librosCategoria).slice(0, 5) : []), [categoria, librosCategoria]);

    const visibles = useMemo(() => {
        const nq = normalizar(q);
        return libros
            .filter(
                (l) =>
                    (!categoria || l.categoria === categoria) &&
                    (!autorFiltro || String(l.idAutor) === autorFiltro) &&
                    (!soloOfertas || l.descuento > 0) &&
                    (!soloStock || l.disponible) &&
                    (!nq || [l.titulo, l.autor, l.categoria].some((c) => normalizar(c).includes(nq)))
            )
            .map((l, i) => ({ ...l, _i: i }))
            .sort((a, b) => ORDENES[orden].fn(a, b) || a._i - b._i);
    }, [libros, q, categoria, autorFiltro, soloOfertas, soloStock, orden]);

    const [limite, setLimite] = useState(POR_TANDA);
    const filtros = [q, categoria, autorFiltro, soloOfertas, soloStock, orden].join('|');
    const [filtrosPrevios, setFiltrosPrevios] = useState(filtros);
    if (filtrosPrevios !== filtros) {
        setFiltrosPrevios(filtros);
        setLimite(POR_TANDA);
    }
    const mostrados = visibles.slice(0, limite);
    const destacados = useMemo(() => {
        if (!categoria || librosCategoria.length < 6) return [];
        const etiqueta = etiquetaCortaCategoria(categoria);
        const codificado = encodeURIComponent(categoria);
        const bloques = BLOQUES_POR_SECCION[categoria] || ['nuevos', 'ofertas'];
        const porClave = {
            nuevos: {
                id: 'nuevos',
                titulo: TITULO_BLOQUE.nuevos(etiqueta),
                lista: librosCategoria
                    .filter((l) => l.esNuevo)
                    .sort((a, b) => String(b.creadoEn || '').localeCompare(String(a.creadoEn || '')) || b.id - a.id)
            },
            ofertas: {
                id: 'ofertas',
                titulo: TITULO_BLOQUE.ofertas(etiqueta),
                lista: librosCategoria.filter((l) => l.descuento > 0).sort((a, b) => b.descuento - a.descuento || b.id - a.id),
                enlace: ENLACE_BLOQUE.ofertas(codificado)
            },
            vendidos: {
                id: 'vendidos',
                titulo: TITULO_BLOQUE.vendidos(etiqueta),
                lista: librosCategoria.filter((l) => l.masVendido)
            },
            stock: {
                id: 'stock',
                titulo: TITULO_BLOQUE.stock(etiqueta),
                lista: librosCategoria.filter((l) => l.disponible),
                enlace: ENLACE_BLOQUE.stock(codificado)
            }
        };
        return bloques
            .map((clave) => porClave[clave])
            .filter((bloque) => bloque?.lista.length >= 2)
            .map((bloque) => ({ ...bloque, lista: bloque.lista.slice(0, 8) }));
    }, [categoria, librosCategoria]);

    const portadasHero = hayFiltro ? visibles.slice(0, 5) : (destacados[0]?.lista.length ? destacados[0].lista : librosCategoria).slice(0, 5);

    const actualizar = (cambios) => {
        const siguiente = new URLSearchParams(window.location.search);
        Object.entries(cambios).forEach(([k, v]) => (v ? siguiente.set(k, v) : siguiente.delete(k)));
        setParams(siguiente, { replace: true });
    };

    return (
        <>
            <Migas actual={categoria ? etiquetaCortaCategoria(categoria) : 'Catálogo'} padres={categoria ? [{ ruta: '/catalogo', texto: 'Libros' }] : []} />
            <section className="seccion catalogo-pagina" aria-labelledby="catalogo-pagina-titulo">
                <div className="contenedor">
                    <header className="catalogo-cabeza">
                        <div className="catalogo-cabeza__principal">
                            <div className="catalogo-cabeza__texto">
                                <h1 id="catalogo-pagina-titulo" className="seccion__titulo">
                                    {categoria ? tituloCategoria(categoria) : 'Catálogo'}
                                </h1>
                                <p className="seccion__entrada">
                                    {categoria ? introCategoria(categoria) : 'Libros físicos para descubrir historias y encontrar tu próxima lectura.'}
                                </p>
                                {categoria && (
                                    <p className="catalogo-cabeza__cantidad">
                                        {hayFiltro ? `${visibles.length} ${visibles.length === 1 ? 'título con este filtro' : 'títulos con este filtro'}` : `${librosCategoria.length} títulos en el catálogo`}
                                    </p>
                                )}
                            </div>
                            {portadasHero.length > 0 && (
                                <div className="catalogo-cabeza__collage" aria-hidden="true">
                                    {portadasHero.map((libro, i) => (
                                        <img
                                            key={libro.id}
                                            src={portada(libro.portada, 240)}
                                            alt=""
                                            width="120"
                                            height="180"
                                            loading="lazy"
                                            decoding="async"
                                            style={{ '--i': i }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        <label className="ordenar">
                            <span>Ordenar por</span>
                            <select value={orden} onChange={(e) => actualizar({ orden: e.target.value === 'destacados' ? '' : e.target.value })}>
                                {Object.entries(ORDENES).map(([clave, { texto: t }]) => (
                                    <option key={clave} value={clave}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </header>

                    {categoria && (
                        <ul className="catalogo-beneficios" aria-label="Ventajas de comprar en MATIDANA">
                            <li>
                                <FaMapPin aria-hidden="true" />
                                <span>
                                    <strong>Recojo gratuito</strong>
                                    <small>{RECOJO_CORTO}, Pallasca</small>
                                </span>
                            </li>
                            <li>
                                <FaTruck aria-hidden="true" />
                                <span>
                                    <strong>Delivery local</strong>
                                    <small>{DELIVERY_CIUDAD.nombre}</small>
                                </span>
                            </li>
                            <li>
                                <FaShieldHalved aria-hidden="true" />
                                <span>
                                    <strong>Pago seguro</strong>
                                    <small>PayU</small>
                                </span>
                            </li>
                        </ul>
                    )}

                    {categoria && !hayFiltro && series.length > 0 && (
                        <section className="catalogo-bloque catalogo-series" aria-labelledby="catalogo-series-titulo">
                            <div className="catalogo-bloque__cabeza">
                                <div>
                                    <p className="catalogo-bloque__eyebrow">Sigue la historia</p>
                                    <h2 id="catalogo-series-titulo">Series y sagas en {etiquetaCortaCategoria(categoria)}</h2>
                                </div>
                                <p className="catalogo-bloque__nota">Agrupado por títulos con volumen registrado</p>
                            </div>
                            <ul className="catalogo-series__rejilla">
                                {series.map((serie) => (
                                    <li key={serie.nombre}>
                                        <Link to={`/catalogo?categoria=${encodeURIComponent(categoria)}&q=${encodeURIComponent(serie.nombre)}`}>
                                            <span className="catalogo-series__portadas" aria-hidden="true">
                                                {serie.libros.slice(0, 3).map((libro) => (
                                                    <img key={libro.id} src={portada(libro.portada, 160)} alt="" width="96" height="144" loading="lazy" decoding="async" />
                                                ))}
                                            </span>
                                            <span className="catalogo-series__nombre">{serie.nombre}</span>
                                            <span className="catalogo-series__cantidad" aria-hidden="true">
                                                {serie.cantidad} {serie.cantidad === 1 ? 'libro' : 'libros'}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {!hayFiltro && destacados.length > 0 && (
                        <div className="catalogo-destacados">
                            {destacados.map((e) => (
                                <Estante key={e.id} estante={e} />
                            ))}
                        </div>
                    )}

                    {categoria && !hayFiltro && autores.length > 0 && (
                        <section className="catalogo-bloque catalogo-autores" aria-labelledby="catalogo-autores-titulo">
                            <div className="catalogo-bloque__cabeza">
                                <div>
                                    <p className="catalogo-bloque__eyebrow">Explora por creador</p>
                                    <h2 id="catalogo-autores-titulo">Autores con más títulos</h2>
                                </div>
                            </div>
                            <ul className="catalogo-autores__rejilla">
                                {autores.map((autor) => (
                                    <li key={autor.nombre}>
                                        <Link to={`/catalogo?categoria=${encodeURIComponent(categoria)}&q=${encodeURIComponent(autor.nombre)}`}>
                                            <span className="catalogo-autores__inicial" aria-hidden="true">
                                                {autor.nombre.trim().charAt(0).toLocaleUpperCase('es')}
                                            </span>
                                            <span className="catalogo-autores__nombre">{autor.nombre}</span>
                                            <span className="catalogo-autores__cantidad" aria-hidden="true">
                                                {autor.cantidad} {autor.cantidad === 1 ? 'título' : 'títulos'}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {categoria && !hayFiltro && relacionadas.length > 0 && (
                        <section className="catalogo-bloque catalogo-temas" aria-labelledby="catalogo-temas-titulo">
                            <div className="catalogo-temas__cabeza">
                                <div>
                                    <p className="catalogo-bloque__eyebrow">Continúa explorando</p>
                                    <h2 id="catalogo-temas-titulo">Temáticas relacionadas</h2>
                                </div>
                                <Link to="/catalogo" className="catalogo-temas__todo">
                                    Ver catálogo completo
                                </Link>
                            </div>
                            <ul className="catalogo-temas__rejilla">
                                {relacionadas.map((nombre) => {
                                    const datos = datosCategoria.get(nombre);
                                    return (
                                        <li key={nombre}>
                                            <Link to={`/catalogo?categoria=${encodeURIComponent(nombre)}`}>
                                                {datos?.portada && (
                                                    <img src={portada(datos.portada.portada, 120)} alt="" width="80" height="120" loading="lazy" decoding="async" aria-hidden="true" />
                                                )}
                                                <span className="catalogo-temas__nombre">{etiquetaCortaCategoria(nombre)}</span>
                                                <span className="catalogo-temas__cantidad" aria-hidden="true">
                                                    {datos?.cantidad ?? 0} {datos?.cantidad === 1 ? 'libro' : 'libros'}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}

                    <div className="catalogo-cuerpo">
                        <div className="catalogo-resultados">
                            {error ? (
                                <p className="aviso" role="status">
                                    El catálogo no se pudo cargar en este momento. Puedes verlo completo en la app.{' '}
                                    <Link className="subrayado enlace-texto" to="/descargar">
                                        Descargar la app
                                    </Link>
                                </p>
                            ) : (
                                <>
                                    {esCelular && !cargando && !categoria && <Estantes libros={libros} />}
                                    <p className="resultado" role="status" aria-live="polite">
                                        {cargando ? (
                                            'Cargando libros…'
                                        ) : (
                                            <>
                                                <strong>{`${visibles.length} ${visibles.length === 1 ? 'libro' : 'libros'}`}</strong>
                                                {q && <> para «{q}»</>}
                                                {categoria && <> en {etiquetaCortaCategoria(categoria)}</>}
                                                {autorNombre && <> de {autorNombre}</>}
                                            </>
                                        )}
                                    </p>
                                    {!cargando && visibles.length === 0 ? (
                                        <p className="aviso">
                                            {libros.length === 0
                                                ? 'Estamos actualizando el catálogo. Mientras tanto, puedes explorarlo en la app.'
                                                : 'No encontramos libros con esos filtros. Prueba con otra búsqueda o categoría.'}
                                        </p>
                                    ) : (
                                        <ul className="rejilla-libros rejilla-libros--todos" data-revelar="" aria-busy={cargando}>
                                            {cargando
                                                ? Array.from({ length: 10 }, (_, i) => (
                                                      <li className="tarjeta-libro tarjeta-libro--esqueleto" key={i} aria-hidden="true">
                                                          <div className="tarjeta-libro__tapa" />
                                                          <div style={{ height: '7.5rem' }} />
                                                      </li>
                                                  ))
                                                : mostrados.map((l, i) => <TarjetaLibro key={l.id} libro={l} indice={i % POR_TANDA} />)}
                                        </ul>
                                    )}
                                    {!cargando && visibles.length > mostrados.length && (
                                        <div className="catalogo-mas">
                                            <button type="button" className="boton boton--linea" onClick={() => setLimite((n) => n + POR_TANDA)}>
                                                Ver más libros
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
