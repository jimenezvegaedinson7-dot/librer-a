import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { FaMagnifyingGlass, FaTruckFast, FaStore, FaCircleCheck } from 'react-icons/fa6';

import Migas from '../components/Migas';
import { PrecioOferta } from '../components/PrecioOferta';
import { EtiquetaNuevo, EtiquetasSuperiores } from '../components/EtiquetasLibro';
import { portada, soles } from '../lib/formato';
import ComprarLibro from '../tienda/ComprarLibro';
import PortadaLibro from '../tienda/PortadaLibro';
import { referenciaPortadaLibro, AVISO_PORTADA_REFERENCIA } from '../../lib/utils/portadasLibro';

// Sin tildes ni mayúsculas: "Garcia" encuentra "García".
const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Orden "Destacados": primero los más vendidos, luego los agregados
// recientemente y después el orden en que llegan de la API.
const ORDENES = {
    destacados: { texto: 'Destacados', fn: (a, b) => (b.masVendido - a.masVendido) || (b.esNuevo - a.esNuevo) },
    'precio-asc': { texto: 'Precio: de menor a mayor', fn: (a, b) => a.precioFinal - b.precioFinal },
    'precio-desc': { texto: 'Precio: de mayor a menor', fn: (a, b) => b.precioFinal - a.precioFinal },
    descuento: { texto: 'Mayor descuento', fn: (a, b) => b.descuento - a.descuento },
    titulo: { texto: 'Título (A-Z)', fn: (a, b) => a.titulo.localeCompare(b.titulo, 'es') },
};

// Línea de stock como en una tienda en línea, con el dato real.
export function Stock({ libro }) {
    if (!libro.disponible) return <p className="stock stock--agotado">Agotado por ahora.</p>;
    if (libro.stock > 0 && libro.stock <= 3) return <p className="stock stock--poco">Quedan solo {libro.stock} en stock</p>;
    return <p className="stock stock--ok"><FaCircleCheck aria-hidden="true" /> En stock</p>;
}

export function TarjetaLibro({ libro, indice, nivelTitulo = 'h2', portadaSegura = true }) {
    const Titulo = nivelTitulo;
    const ahorro = libro.descuento > 0 ? libro.precio - libro.precioFinal : 0;
    const referencia = referenciaPortadaLibro(libro);
    return (
        <li className={`tarjeta-libro${libro.disponible ? '' : ' tarjeta-libro--sin-stock'}`} style={{ '--i': indice % 10 }}>
            <div className="tarjeta-libro__tapa">
                {portadaSegura ? <PortadaLibro libro={libro}/> : <img
                    src={portada(libro.portada, 320)}
                    srcSet={`${portada(libro.portada, 240)} 240w, ${portada(libro.portada, 360)} 360w, ${portada(libro.portada, 480)} 480w`}
                    sizes="(max-width: 520px) 45vw, 220px"
                    alt={`Portada de ${libro.titulo}`}
                    title={referencia?`${AVISO_PORTADA_REFERENCIA}: ${referencia.edicion}`:undefined}
                    width="220"
                    height="330"
                    loading="lazy"
                    decoding="async"
                />}
                <EtiquetasSuperiores libro={libro} />
                <EtiquetaNuevo libro={libro} />
            </div>
            <div className="tarjeta-libro__cuerpo">
                {referencia && <p className="portada-referencia">{AVISO_PORTADA_REFERENCIA}</p>}
                <Titulo className="libro__titulo">{libro.titulo}</Titulo>
                <p className="libro__autor">de <span>{libro.autor}</span></p>
                {libro.categoria && <span className="categoria">{libro.categoria}</span>}
                <PrecioOferta libro={libro} clase="tarjeta-libro__precio" />
                {ahorro > 0 && <p className="ahorro">Ahorras {soles(ahorro)}</p>}
                <Stock libro={libro} />
                <p className="entrega-linea"><FaTruckFast aria-hidden="true" /> Delivery dentro de Pallasca o recojo gratis en Pallasca</p>
            </div>
            <ComprarLibro libro={libro} />
        </li>
    );
}

const POR_TANDA = 24;

// Estantes del catálogo en celular: carruseles por tema antes de la lista
// completa. Solo usa datos reales (descuento vigente, marcas de nuevo y más
// vendido); un estante con menos de dos libros no se muestra.
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

// Cada estante se desliza con el dedo; no avanza solo ni lleva botón de pausa.
function Estante({ estante: e }) {
    return <section className="catalogo-estante" aria-labelledby={`estante-${e.id}`}>
        <div className="catalogo-estante__cabeza">
            <h2 id={`estante-${e.id}`}>{e.titulo}</h2>
            {e.enlace && <Link to={e.enlace} className="catalogo-estante__ver">Ver todos</Link>}
        </div>
        <ul className="rejilla-libros" tabIndex={0} aria-label={`Carrusel ${e.titulo}`}>
            {e.lista.map((l, i) => <TarjetaLibro key={l.id} libro={l} indice={i} nivelTitulo="h3" />)}
        </ul>
    </section>;
}

function Estantes({ libros }) {
    const estantes = useMemo(() => {
        const descuento = libros.filter((l) => l.descuento > 0).sort((a, b) => b.descuento - a.descuento);
        // Sin descuento en los demás estantes: así cada estante tiene tarjetas
        // de la misma medida (las de oferta llevan más datos).
        const sinDescuento = libros.filter((l) => !(l.descuento > 0));
        const recientes = [...sinDescuento].sort((a, b) => (b.esNuevo - a.esNuevo) || (b.id - a.id));
        const vendidos = sinDescuento.filter((l) => l.masVendido);
        return [
            { id: 'descuento', titulo: 'En descuento', lista: descuento, enlace: '/catalogo?ofertas=1' },
            { id: 'recientes', titulo: 'Agregados recientemente', lista: recientes },
            { id: 'vendidos', titulo: 'Más vendidos', lista: vendidos },
        ].filter((e) => e.lista.length >= 2).map((e) => ({ ...e, lista: e.lista.slice(0, 12) }));
    }, [libros]);
    if (!estantes.length) return null;
    return (
        <div className="catalogo-estantes">
            {estantes.map((e) => <Estante key={e.id} estante={e} />)}
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
    const autorNombre = libros.find(l => String(l.idAutor) === autorFiltro)?.autor;
    const orden = ORDENES[params.get('orden')] ? params.get('orden') : 'destacados';
    const soloOfertas = params.get('ofertas') === '1';
    const soloStock = params.get('stock') === '1';
    const [texto, setTexto] = useState(q);
    const esCelular = useEsCelular();

    // Si la búsqueda cambia desde la cabecera, el campo se actualiza.
    const [qPrevia, setQPrevia] = useState(q);
    if (qPrevia !== q) {
        setQPrevia(q);
        setTexto(q);
    }

    // Categorías con su cantidad de libros (dato real del catálogo).
    const categorias = useMemo(() => {
        const cuenta = new Map();
        libros.forEach((l) => l.categoria && cuenta.set(l.categoria, (cuenta.get(l.categoria) || 0) + 1));
        return [...cuenta.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
    }, [libros]);
    const enOferta = useMemo(() => libros.filter((l) => l.descuento > 0).length, [libros]);
    const conStock = useMemo(() => libros.filter((l) => l.disponible).length, [libros]);

    const visibles = useMemo(() => {
        const nq = normalizar(q);
        return libros
            .filter((l) => (!categoria || l.categoria === categoria)
                && (!autorFiltro || String(l.idAutor) === autorFiltro)
                && (!soloOfertas || l.descuento > 0)
                && (!soloStock || l.disponible)
                && (!nq || [l.titulo, l.autor, l.categoria].some((c) => normalizar(c).includes(nq))))
            .map((l, i) => ({ ...l, _i: i }))
            .sort((a, b) => ORDENES[orden].fn(a, b) || a._i - b._i);
    }, [libros, q, categoria, autorFiltro, soloOfertas, soloStock, orden]);

    // De 24 en 24: una lista de cien portadas de golpe es lenta de cargar y de
    // recorrer. Al cambiar un filtro se vuelve a la primera tanda.
    const [limite, setLimite] = useState(POR_TANDA);
    const filtros = [q, categoria, autorFiltro, soloOfertas, soloStock, orden].join('|');
    const [filtrosPrevios, setFiltrosPrevios] = useState(filtros);
    if (filtrosPrevios !== filtros) {
        setFiltrosPrevios(filtros);
        setLimite(POR_TANDA);
    }
    const mostrados = visibles.slice(0, limite);

    // Parte siempre de la URL vigente del navegador: React Router navega en
    // una transición y su copia de los parámetros puede ir un paso atrás si
    // se encadenan acciones rápidas (limpiar y buscar enseguida).
    const actualizar = (cambios) => {
        const siguiente = new URLSearchParams(window.location.search);
        Object.entries(cambios).forEach(([k, v]) => (v ? siguiente.set(k, v) : siguiente.delete(k)));
        setParams(siguiente, { replace: true });
    };

    const hayFiltros = Boolean(q || categoria || autorFiltro || soloOfertas || soloStock);
    const limpiar = () => { setTexto(''); actualizar({ q: '', categoria: '', autor: '', ofertas: '', stock: '' }); };

    return (
        <>
            <Migas actual="Catálogo" />
            <section className="seccion catalogo-pagina" aria-labelledby="catalogo-pagina-titulo">
                <div className="contenedor">
                    <header className="catalogo-cabeza">
                        <div>
                            <h1 id="catalogo-pagina-titulo" className="seccion__titulo">Catálogo</h1>
                            <p className="seccion__entrada">
                                Libros físicos con precios actuales en soles. Compra aquí en la web o desde nuestra app:
                                te lo llevamos dentro de Pallasca con tarifa por zona o lo recoges sin costo en nuestra tienda.
                            </p>
                        </div>
                        <ul className="catalogo-ventajas" aria-label="Ventajas de comprar con nosotros">
                            <li><FaTruckFast aria-hidden="true" /> Delivery dentro de Pallasca</li>
                            <li><FaStore aria-hidden="true" /> Recojo gratis en Pallasca</li>
                            <li><FaCircleCheck aria-hidden="true" /> Pago seguro con PayU</li>
                        </ul>
                    </header>

                    <div className="filtros">
                        <form className="buscador" role="search" onSubmit={(e) => { e.preventDefault(); actualizar({ q: texto.trim() }); }}>
                            <label htmlFor="buscar-catalogo" className="visualmente-oculto">Buscar por título, autor o categoría</label>
                            <input id="buscar-catalogo" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Busca por título, autor o categoría" autoComplete="off" />
                            <button type="submit" aria-label="Buscar"><FaMagnifyingGlass aria-hidden="true" /></button>
                        </form>
                        <label className="ordenar">
                            <span>Ordenar por</span>
                            <select value={orden} onChange={(e) => actualizar({ orden: e.target.value === 'destacados' ? '' : e.target.value })}>
                                {Object.entries(ORDENES).map(([clave, { texto: t }]) => <option key={clave} value={clave}>{t}</option>)}
                            </select>
                        </label>
                    </div>

                    <div className="catalogo-cuerpo">
                        <aside className="catalogo-lateral" aria-label="Filtros del catálogo">
                            {categorias.length > 0 && (
                                <div className="filtro-bloque">
                                    <h2>Categorías</h2>
                                    <div className="chips" role="group" aria-label="Filtrar por categoría">
                                        <button type="button" className="chip" aria-pressed={!categoria} onClick={() => actualizar({ categoria: '' })}>
                                            Todas <span className="chip__cuenta">{libros.length}</span>
                                        </button>
                                        {categorias.map(([c, n]) => (
                                            <button key={c} type="button" className="chip" aria-pressed={categoria === c} onClick={() => actualizar({ categoria: categoria === c ? '' : c })}>
                                                {c} <span className="chip__cuenta">{n}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {libros.length > 0 && (
                                <div className="filtro-bloque">
                                    <h2>Mostrar</h2>
                                    <label className="casilla">
                                        <input type="checkbox" checked={soloOfertas} onChange={(e) => actualizar({ ofertas: e.target.checked ? '1' : '' })} />
                                        Solo ofertas <span className="chip__cuenta">{enOferta}</span>
                                    </label>
                                    <label className="casilla">
                                        <input type="checkbox" checked={soloStock} onChange={(e) => actualizar({ stock: e.target.checked ? '1' : '' })} />
                                        Solo con stock <span className="chip__cuenta">{conStock}</span>
                                    </label>
                                </div>
                            )}
                            {hayFiltros && (
                                <button type="button" className="boton boton--linea boton--chico" onClick={limpiar}>
                                    Limpiar filtros
                                </button>
                            )}
                        </aside>

                        <div className="catalogo-resultados">
                            {error ? (
                                <p className="aviso" role="status">
                                    El catálogo no se pudo cargar en este momento. Puedes verlo completo en la app.{' '}
                                    <Link className="subrayado enlace-texto" to="/descargar">Descargar la app</Link>
                                </p>
                            ) : (
                                <>
                                    {esCelular && !cargando && !hayFiltros && <Estantes libros={libros} />}
                                    <p className="resultado" role="status" aria-live="polite">
                                        {cargando
                                            ? 'Cargando libros…'
                                             : <><strong>{`${visibles.length} ${visibles.length === 1 ? 'libro' : 'libros'}`}</strong>{q && <> para «{q}»</>}{categoria && <> en {categoria}</>}{autorNombre && <> de {autorNombre}</>}</>}
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
                                            <p>Mostrando {mostrados.length} de {visibles.length} libros</p>
                                            <button type="button" className="boton boton--linea" onClick={() => setLimite((n) => n + POR_TANDA)}>Ver más libros</button>
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
