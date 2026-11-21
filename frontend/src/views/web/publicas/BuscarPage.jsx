import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';
import logo from '../../../assets/compartido/logo-f-verde-96.webp';
import { clienteApi } from '../../../services/web/tienda/clienteApi';
import { libroComercial } from '../../../services/web/tienda/libroComercial';
import { useCatalogo } from '../../../hooks/web/useApiPublica';
import { soles } from '../../../services/web/formato';
import PortadaLibro from '../../../components/web/tienda/PortadaLibro';
import { PrecioOferta } from '../../../components/web/PrecioOferta';
import { EtiquetaNuevo, EtiquetasSuperiores } from '../../../components/web/EtiquetasLibro';
import { SITIO } from '../../../models/config/web/site';
import '../../../styles/web/public-site.css';
import '../../../styles/web/tienda.css';
import '../../../styles/web/buscar.css';

const normalizar = (t) =>
    String(t || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();

const PREFIJO_CATEGORIA = 'categoria:';
const CAMPOS_POR_TIPO = {
    todos: ['titulo', 'autor', 'categoria', 'isbn'],
    titulo: ['titulo'],
    autor: ['autor'],
    categoria: ['categoria'],
    isbn: ['isbn']
};

const TIPOS_BUSQUEDA = [
    ['todos', 'Todos'],
    ['titulo', 'Título'],
    ['autor', 'Autor'],
    ['categoria', 'Género'],
    ['isbn', 'ISBN']
];

const MAX_POR_SECCION = 12;

const esCategoria = (valor) => String(valor || '').startsWith(PREFIJO_CATEGORIA);
const nombreCategoria = (valor) => (esCategoria(valor) ? valor.slice(PREFIJO_CATEGORIA.length) : '');
const textoResultados = (total) => `${total} ${total === 1 ? 'resultado' : 'resultados'}`;

function TarjetaBusqueda({ libro, indice }) {
    const navigate = useNavigate();
    const destino = `/libro/${libro.id}`;
    const abrirDetalle = (e) => {
        if (e.target.closest('a, button')) return;
        navigate(destino);
    };
    const ahorro = libro.descuento > 0 ? libro.precio - libro.precioFinal : 0;

    return (
        <li className={`buscar-tarjeta${libro.disponible ? '' : ' buscar-tarjeta--sin-stock'}`} style={{ '--i': indice % MAX_POR_SECCION }} onClick={abrirDetalle}>
            <div className="buscar-tarjeta__tapa">
                <Link to={destino} className="buscar-tarjeta__enlace" aria-label={`Ver detalle de ${libro.titulo}`}>
                    <PortadaLibro libro={libro} />
                </Link>
                <EtiquetasSuperiores libro={libro} />
                <EtiquetaNuevo libro={libro} />
            </div>
            <div className="buscar-tarjeta__cuerpo">
                {libro.categoria && <span className="buscar-tarjeta__categoria">{libro.categoria}</span>}
                <h3 className="buscar-tarjeta__titulo">
                    <Link to={destino}>{libro.titulo}</Link>
                </h3>
                {libro.autor && <p className="buscar-tarjeta__autor">{libro.autor}</p>}
                <PrecioOferta libro={libro} clase="buscar-tarjeta__precio" />
                {ahorro > 0 && <p className="buscar-tarjeta__ahorro">Ahorras {soles(ahorro)}</p>}
                <Link className="buscar-tarjeta__detalle" to={destino}>
                    Ver detalle
                </Link>
            </div>
        </li>
    );
}

function CarruselSeccion({ id, titulo, total, libros, verTodosHref, indice = 0 }) {
    const pista = useRef(null);
    const desplazar = (sentido) => {
        const ancho = pista.current?.clientWidth || 0;
        const salto = sentido * ancho * 0.8;
        pista.current?.scrollBy({
            left: salto,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
    };

    return (
        <section className="buscar-seccion" aria-labelledby={`${id}-titulo`} style={{ '--i': indice }}>
            <div className="buscar-seccion__cabeza">
                <h2 id={`${id}-titulo`} className="buscar-seccion__titulo">
                    {titulo} <span>({textoResultados(total)})</span>
                </h2>
                <div className="buscar-seccion__acciones">
                    <Link className="buscar-seccion__ver" to={verTodosHref}>
                        Ver todos
                    </Link>
                    <button type="button" className="buscar-flecha" onClick={() => desplazar(-1)} aria-label={`Libros anteriores de ${titulo}`} aria-controls={`${id}-lista`}>
                        <FaArrowLeft aria-hidden="true" />
                    </button>
                    <button type="button" className="buscar-flecha" onClick={() => desplazar(1)} aria-label={`Siguientes libros de ${titulo}`} aria-controls={`${id}-lista`}>
                        <FaArrowRight aria-hidden="true" />
                    </button>
                </div>
            </div>
            <ul ref={pista} id={`${id}-lista`} className="buscar-carrusel" tabIndex={0} aria-label={`${titulo}, carrusel desplazable`}>
                {libros.map((libro, i) => (
                    <TarjetaBusqueda key={libro.id} libro={libro} indice={i} />
                ))}
            </ul>
        </section>
    );
}

export default function BuscarPage() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const q = params.get('q') || '';
    const entrada = useRef(null);
    const tipoParam = params.get('tipo') || 'todos';
    const tipo = CAMPOS_POR_TIPO[tipoParam] || esCategoria(tipoParam) ? tipoParam : 'todos';
    const categoriaElegida = nombreCategoria(tipo);
    const { cargando, error, libros } = useCatalogo();
    const claveIA = `${q}|${tipo}`;
    const [inteligente, setInteligente] = useState({ clave: '', libros: [], origen: 'catalogo', listo: false });

    useEffect(() => {
        if (!q && !categoriaElegida) return undefined;
        let activo = true;
        clienteApi
            .buscarInteligente({ consulta: q || categoriaElegida, tipo: esCategoria(tipo) ? 'categoria' : tipo, categoria: categoriaElegida })
            .then((json) => {
                if (!activo) return;
                setInteligente({
                    clave: claveIA,
                    libros: (Array.isArray(json.data) ? json.data : []).map(libroComercial),
                    origen: json.origen || 'catalogo',
                    listo: true
                });
            })
            .catch(() => {
                if (activo) setInteligente({ clave: claveIA, libros: [], origen: 'catalogo', listo: true });
            });
        return () => {
            activo = false;
        };
    }, [q, tipo, categoriaElegida, claveIA]);

    useEffect(() => {
        const titulo = q ? `Resultados para «${q}» · MATIDANA` : 'Buscar libros · MATIDANA';
        document.title = titulo;
        document.querySelector('meta[name="description"]')?.setAttribute(
            'content',
            'Busca y descubre libros por título, autor, género o ISBN en MATIDANA Libros y Cultura.'
        );
        document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${SITIO.url}/buscar`);
    }, [q]);

    const categorias = useMemo(() => {
        const grupos = new Map();
        libros.forEach((libro) => {
            const categoria = String(libro.categoria || '').trim();
            if (!categoria) return;
            if (!grupos.has(categoria)) grupos.set(categoria, []);
            grupos.get(categoria).push(libro);
        });
        return [...grupos]
            .map(([categoria, items]) => {
                const disponibles = items.filter((libro) => libro.disponible);
                return { categoria, total: disponibles.length, libros: disponibles };
            })
            .filter((grupo) => grupo.total > 0)
            .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria, 'es'));
    }, [libros]);

    const resultadosLocales = useMemo(() => {
        const busqueda = normalizar(q);
        const campo = esCategoria(tipo) ? 'categoria' : tipo;
        const campos = CAMPOS_POR_TIPO[campo] || CAMPOS_POR_TIPO.todos;
        const busquedaIsbn = busqueda.replace(/[-\s]/g, '');
        const base = categoriaElegida
            ? libros.filter((libro) => normalizar(libro.categoria) === normalizar(categoriaElegida))
            : libros;
        if (!busqueda) return categoriaElegida ? base : [];
        return base.filter((libro) =>
            campos.some((campoBusqueda) => {
                const valor = normalizar(libro[campoBusqueda]);
                return campoBusqueda === 'isbn' ? valor.replace(/[-\s]/g, '').includes(busquedaIsbn) : valor.includes(busqueda);
            })
        );
    }, [libros, q, tipo, categoriaElegida]);

    const resultadosIA = inteligente.clave === claveIA && inteligente.listo ? inteligente.libros : [];
    const resultados = resultadosIA.length ? resultadosIA : resultadosLocales;

    const enviar = (e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        const limpio = String(datos.get('q') || '').trim();
        const tipoElegido = String(datos.get('tipo') || tipo);
        const siguientes = {};
        if (limpio) siguientes.q = limpio;
        if (tipoElegido !== 'todos') siguientes.tipo = tipoElegido;
        setParams(siguientes);
    };

    const cambiarTipo = (e) => {
        const tipoElegido = e.target.value;
        const escrito = entrada.current?.value?.trim() || '';
        const siguientes = {};
        if (escrito) siguientes.q = escrito;
        if (tipoElegido !== 'todos') siguientes.tipo = tipoElegido;
        setParams(siguientes);
    };

    const salir = () => navigate('/');
    const limpiar = () => setParams({});
    const mostrandoResultados = Boolean(q || categoriaElegida);
    const verTodosResultados = categoriaElegida
        ? `/catalogo?categoria=${encodeURIComponent(categoriaElegida)}`
        : q
          ? `/catalogo?q=${encodeURIComponent(q)}`
          : '/catalogo';

    return (
        <div className="sitio buscar-pagina">
            <header className="buscar-cabecera">
                <div className="buscar-cabecera__barra">
                    <Link to="/" className="buscar-logo" aria-label="Ir al inicio de MATIDANA">
                        <img src={logo} alt="MATIDANA Libros y Cultura" width="96" height="96" />
                    </Link>
                    <button type="button" className="buscar-salir" onClick={salir}>
                        Salir
                        <FaXmark aria-hidden="true" />
                    </button>
                </div>
                <div className="buscar-cabecera__centro">
                    <h1 className="buscar-titulo">¿Qué estás buscando?</h1>
                    <form className="buscar-formulario" role="search" onSubmit={enviar}>
                        <div className="buscar-barra">
                            <select id="buscar-tipo" className="buscar-tipo" name="tipo" value={tipo} onChange={cambiarTipo} aria-label="Ámbito de búsqueda">
                                <optgroup label="Buscar por">
                                    {TIPOS_BUSQUEDA.map(([valor, etiqueta]) => (
                                        <option key={valor} value={valor}>
                                            {etiqueta}
                                        </option>
                                    ))}
                                </optgroup>
                                {categorias.length > 0 && (
                                    <optgroup label="Categorías">
                                        {categorias.map(({ categoria }) => (
                                            <option key={categoria} value={`${PREFIJO_CATEGORIA}${categoria}`}>
                                                {categoria}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            <input
                                key={q}
                                ref={entrada}
                                id="buscar-resultados"
                                type="search"
                                name="q"
                                defaultValue={q}
                                placeholder="Busca por autor, título, género o ISBN"
                                aria-label="Buscar por autor, título, género o ISBN"
                                autoComplete="off"
                                autoFocus
                            />
                            {q && (
                                <button type="button" className="buscar-limpiar" onClick={limpiar} aria-label="Limpiar búsqueda">
                                    <FaXmark aria-hidden="true" />
                                </button>
                            )}
                            <button type="submit" className="buscar-enviar" aria-label="Buscar">
                                <FaMagnifyingGlass aria-hidden="true" />
                            </button>
                        </div>
                    </form>
                </div>
            </header>

            <main className="buscar-resultados" id="contenido" aria-live="polite">
                <h2 className="visualmente-oculto">Resultados de búsqueda</h2>

                {cargando && (
                    <div className="buscar-cargando" role="status">
                        <span className="buscar-punto" aria-hidden="true" />
                        Cargando catálogo…
                    </div>
                )}

                {!cargando && error && (
                    <div className="buscar-aviso" role="status">
                        No se pudo cargar el catálogo. Inténtalo de nuevo.
                    </div>
                )}

                {!cargando && !error && mostrandoResultados && resultados.length === 0 && (
                    <div className="buscar-vacio" role="status">
                        <p>{q ? `No encontramos libros con «${q}».` : `No hay libros disponibles en ${categoriaElegida}.`}</p>
                    </div>
                )}

                {!cargando && !error && mostrandoResultados && resultados.length > 0 && (
                    <CarruselSeccion
                        id="resultados"
                        titulo={q ? `Resultados para «${q}»` : `Libros de ${categoriaElegida}`}
                        total={resultados.length}
                        libros={resultados.slice(0, MAX_POR_SECCION)}
                        verTodosHref={verTodosResultados}
                    />
                )}

                {!cargando && !error && !mostrandoResultados && categorias.length === 0 && (
                    <div className="buscar-vacio" role="status">
                        <p>No hay libros disponibles en este momento.</p>
                    </div>
                )}

                {!cargando && !error && !mostrandoResultados &&
                    categorias.map((grupo, indice) => (
                        <CarruselSeccion
                            key={grupo.categoria}
                            id={`categoria-${indice}`}
                            titulo={grupo.categoria}
                            total={grupo.total}
                            libros={grupo.libros.slice(0, MAX_POR_SECCION)}
                            verTodosHref={`/catalogo?categoria=${encodeURIComponent(grupo.categoria)}`}
                            indice={indice}
                        />
                    ))}
            </main>
        </div>
    );
}
