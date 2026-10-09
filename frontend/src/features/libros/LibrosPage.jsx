import { useEffect, useMemo, useState } from 'react';

import { FaBook, FaMagnifyingGlass, FaRotate, FaXmark } from 'react-icons/fa6';

import { FaCircleCheck, FaBan } from 'react-icons/fa6';
import { Indicador, Indicadores } from '../../components/ui/Indicadores';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { EstadoActivo } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';

import { FaEye, FaPenToSquare, FaTrash } from 'react-icons/fa6';
import { formatearMoneda } from '../../lib/utils/format';

import { useToast } from '../../components/providers/ToastProvider';
import { useRol } from '../auth/useRol';

import { listarLibros, obtenerLibro, eliminarLibro } from './librosService';
import LibroForm from './LibroForm';
import { StockBadge } from './libroUi';
import { nivelStock } from './nivelStock';
import { listarInventario } from '../inventario/inventarioService';
import LibroViewModal from './LibroViewModal';
import LibroEditModal from './LibroEditModal';
import LibroDeleteModal from './LibroDeleteModal';
import PortadaCatalogo from '../../components/catalogo/PortadaCatalogo';
import { referenciaPortadaLibro, AVISO_PORTADA_REFERENCIA } from '../../lib/utils/portadasLibro';

const POR_PAGINA = 10;

// El precio en oferta se lee de precio_final y del porcentaje efectivo que
// ya calculó el backend. Recalcularlo aquí duplicaría la regla y volvería a
// abrir la puerta a que el panel y la web se contradigan.
function PrecioCelda({ fila }) {
    if (Number(fila.descuento_vigente) !== 1) {
        return <span className="font-semibold text-slate-700">{formatearMoneda(fila.precio)}</span>;
    }

    return (
        <span className="flex flex-col items-center gap-0.5">
            <span className="descuento-resaltado rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold">
                -{fila.descuento_porcentaje_efectivo}%
            </span>
            <span className="text-[11px] text-slate-400 line-through">{formatearMoneda(fila.precio)}</span>
            <span className="descuento-resaltado font-bold">{formatearMoneda(fila.precio_final)}</span>
        </span>
    );
}

const columnasLibros = [
    { titulo: 'N.º', alineacion: 'centro', render: (fila) => <span className="text-slate-700">{fila.id_libro}</span> },
    { titulo: 'Título', render: (fila) => <span className="flex items-center gap-3"><PortadaCatalogo libro={fila} mostrarTexto={false} className="h-16 w-11 shrink-0 rounded bg-slate-50 object-contain"/>
        <span className="font-semibold text-slate-700">{fila.titulo}
            {referenciaPortadaLibro(fila) && <span className="mt-1 block text-xs font-normal text-slate-600">{AVISO_PORTADA_REFERENCIA}</span>}
        </span></span> },
    { titulo: 'Autor', render: (fila) => <span className="text-slate-700">{fila.autor}</span> },
    { titulo: 'Categoría', render: (fila) => <span className="text-slate-700">{fila.categoria}</span> },
    { titulo: 'Precio', alineacion: 'centro', render: (fila) => <PrecioCelda fila={fila} /> },
    { titulo: 'Stock', alineacion: 'centro', render: (fila) => <StockBadge stock={fila.stock} stockMinimo={fila.stock_minimo} /> },
    { titulo: 'Estado', alineacion: 'centro', render: (fila) => <EstadoActivo activo={fila.estado} /> },
];

function accionesLibro(fila, { onVer, onEditar, onEliminar, puedeEditar }) {
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver libro"><FaEye /></BtnAccion>
            {puedeEditar && (
                <>
                    <BtnAccion tipo="editar" onClick={() => onEditar(fila)} titulo="Editar libro"><FaPenToSquare /></BtnAccion>
                    <BtnAccion tipo="eliminar" onClick={() => onEliminar(fila)} titulo="Eliminar libro"><FaTrash /></BtnAccion>
                </>
            )}
        </>
    );
}

function Contador({ cargando, total, activos, inactivos }) {
    return (
        <Indicadores cargando={cargando} etiqueta="Resumen de libros">
            <Indicador titulo="Libros" valor={total} icono={<FaBook />} tono="primary" detalle="Títulos en el catálogo" />
            <Indicador titulo="Activos" valor={activos} icono={<FaCircleCheck />} tono="success" detalle="A la venta" de={total} />
            <Indicador titulo="Inactivos" valor={inactivos} icono={<FaBan />} tono="rose" detalle="Ocultos al público" de={total} />
        </Indicadores>
    );
}

function TablaLibros({ titulo, subtitulo, paginados, contadorLibros, pagina, totalPaginas, onCambiarPagina, color, onVer, onEditar, onEliminar, puedeEditar }) {
    return (
        <Card className="libros-tabla">
            <CardHeader
                titulo={titulo}
                subtitulo={subtitulo}
                acciones={
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>
                        {contadorLibros} {contadorLibros === 1 ? 'libro' : 'libros'}
                    </span>
                }
            />
            <CardBody className="p-0">
                <DataTable
                    columnas={columnasLibros}
                    filas={paginados}
                    keyExtractor={(fila) => fila.id_libro}
                    acciones={(fila) => accionesLibro(fila, { onVer, onEditar, onEliminar, puedeEditar })}
                />
            </CardBody>
            <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={onCambiarPagina} />
        </Card>
    );
}

export default function LibrosPage() {
    const { exito, error: mostrarError } = useToast();
    const { puedeEditarCatalogo } = useRol();

    const [libros, setLibros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroStock, setFiltroStock] = useState('todos');
    const [avisoMinimos, setAvisoMinimos] = useState('');

    const [paginaActivos, setPaginaActivos] = useState(1);
    const [paginaInactivos, setPaginaInactivos] = useState(1);

    const [libroVer, setLibroVer] = useState(null);
    const [libroEditar, setLibroEditar] = useState(null);
    const [libroEliminar, setLibroEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const cargarLibros = async () => {
        try {
            setCargando(true);
            setError('');
            setAvisoMinimos('');
            // El mínimo de stock vive en Inventario: se une para usar el mismo
            // criterio de "stock bajo" que esa sección.
            const [lista, inventario] = await Promise.all([
                listarLibros(),
                // Si Inventario falla no se inventa un mínimo: queda sin dato.
                listarInventario().catch(() => null),
            ]);
            if (!inventario) {
                setAvisoMinimos('No se pudo consultar Inventario: el nivel de stock bajo no está disponible por ahora.');
                setLibros(lista.map((libro) => ({ ...libro, stock_minimo: undefined })));
                return;
            }
            const minimos = new Map(inventario.map((item) => [Number(item.id_libro), item.stock_minimo]));
            setLibros(lista.map((libro) => ({ ...libro, stock_minimo: minimos.get(Number(libro.id_libro)) ?? null })));
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los libros');
        } finally {
            setCargando(false);
        }
    };

    // Carga inicial. `cargando` ya nace en true, así que este efecto no
    // enciende el spinner: solo espera la respuesta y entonces actualiza.
    // El bandera `vigente` evita fijar estado si el componente se desmonta.
    useEffect(() => {
        let vigente = true;

        (async () => {
            try {
                const datos = await listarLibros();
                if (vigente) setLibros(datos);
            } catch (err) {
                if (vigente) {
                    setError(err.response?.data?.mensaje || 'Error al cargar los libros');
                }
            } finally {
                if (vigente) setCargando(false);
            }
        })();

        return () => {
            vigente = false;
        };
    }, []);

    // Al cambiar cualquier filtro se vuelve a la primera página: se hace
    // aquí, en el evento, y no en un efecto que la reinicie tras el render.
    const alBuscar = (valor) => {
        setBusqueda(valor);
        setPaginaActivos(1);
        setPaginaInactivos(1);
    };

    const alFiltrarEstado = (valor) => {
        setFiltroEstado(valor);
        setPaginaActivos(1);
        setPaginaInactivos(1);
    };

    const alFiltrarStock = (valor) => {
        setFiltroStock(valor);
        setPaginaActivos(1);
        setPaginaInactivos(1);
    };

    const librosFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return libros.filter((libro) => {
            const en = (valor) => String(valor || '').toLowerCase();
            const coincideBusqueda =
                !texto ||
                [en(libro.titulo), en(libro.autor), en(libro.categoria), en(libro.isbn)].some((v) => v.includes(texto));

            const estado = Number(libro.estado);
            const coincideEstado =
                filtroEstado === 'todos' ||
                (filtroEstado === 'activo' && estado === 1) ||
                (filtroEstado === 'inactivo' && estado !== 1);

            const coincideStock = filtroStock === 'todos' || nivelStock(libro.stock, libro.stock_minimo) === filtroStock;

            return coincideBusqueda && coincideEstado && coincideStock;
        });
    }, [libros, busqueda, filtroEstado, filtroStock]);

    const librosActivos = useMemo(() => librosFiltrados.filter((l) => Number(l.estado) === 1), [librosFiltrados]);
    const librosInactivos = useMemo(() => librosFiltrados.filter((l) => Number(l.estado) !== 1), [librosFiltrados]);

    const totalActivos = Math.ceil(librosActivos.length / POR_PAGINA);
    const totalInactivos = Math.ceil(librosInactivos.length / POR_PAGINA);

    // Si la lista se acorta (búsqueda o borrado) la página se recorta
    // durante el render en vez de corregirse después con un efecto.
    const paginaActivosActual = totalActivos > 0 ? Math.min(paginaActivos, totalActivos) : 1;
    const paginaInactivosActual = totalInactivos > 0 ? Math.min(paginaInactivos, totalInactivos) : 1;

    const activosPaginados = librosActivos.slice((paginaActivosActual - 1) * POR_PAGINA, paginaActivosActual * POR_PAGINA);
    const inactivosPaginados = librosInactivos.slice((paginaInactivosActual - 1) * POR_PAGINA, paginaInactivosActual * POR_PAGINA);

    const verLibro = async (libro) => {
        try {
            setLibroVer({ ...(await obtenerLibro(libro.id_libro)), stock_minimo: libro.stock_minimo });
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener el libro');
        }
    };

    const editarLibro = async (libro) => {
        try {
            setLibroEditar(await obtenerLibro(libro.id_libro));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener el libro');
        }
    };

    const confirmarEliminar = async (password) => {
        if (!libroEliminar || eliminando) return;
        const seleccionado = { ...libroEliminar };
        try {
            setEliminando(true);
            const respuesta = await eliminarLibro(seleccionado.id_libro, password);
            setLibroEliminar(null);
            await cargarLibros();
            exito(respuesta?.mensaje || `Libro "${seleccionado.titulo}" eliminado correctamente`);
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || err.response?.data?.error || 'Error al eliminar el libro');
        } finally {
            setEliminando(false);
        }
    };

    const libroActualizado = async () => {
        await cargarLibros();
        exito('Libro actualizado correctamente');
    };

    const libroCreado = async () => {
        await cargarLibros();
        exito('Libro registrado correctamente');
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroEstado('todos');
        setFiltroStock('todos');
        setPaginaActivos(1);
        setPaginaInactivos(1);
    };

    const hayFiltros = busqueda || filtroEstado !== 'todos' || filtroStock !== 'todos';

    return (
        <div className="libros-pagina space-y-4">
            <PageHeader
                titulo="Libros"
                descripcion={
                    puedeEditarCatalogo
                        ? 'Administra el catálogo de la librería'
                        : 'Consulta el catálogo de la librería (solo lectura)'
                }
            />
            <Contador cargando={cargando} total={libros.length} activos={librosActivos.length} inactivos={librosInactivos.length} />

            {puedeEditarCatalogo && <LibroForm onLibroCreado={libroCreado} />}

            <Card className="libros-filtros">
                <CardHeader
                    titulo="Catálogo de libros"
                    subtitulo="Busca y filtra los libros registrados"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => alBuscar(e.target.value)}
                                    placeholder="Buscar libro..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-64"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => alBuscar('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition hover:text-slate-700"
                                        title="Limpiar búsqueda"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

                            <Select value={filtroEstado} onChange={(e) => alFiltrarEstado(e.target.value)} className="sm:w-44">
                                <option value="todos">Todos los estados</option>
                                <option value="activo">Activos</option>
                                <option value="inactivo">Inactivos</option>
                            </Select>

                            <Select value={filtroStock} onChange={(e) => alFiltrarStock(e.target.value)} className="sm:w-44">
                                <option value="todos">Todo el stock</option>
                                <option value="disponible">Disponible</option>
                                <option value="bajo">Stock bajo</option>
                                <option value="sin-stock">Sin stock</option>
                            </Select>

                            {hayFiltros && (
                                <Button variante="secondary" onClick={limpiarFiltros}>Limpiar</Button>
                            )}

                            <Button variante="secondary" onClick={cargarLibros} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && (
                <TableSkeleton columnas={6} filas={8} titulo />
            )}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}
            {!cargando && !error && avisoMinimos && <Alert tipo="warning">{avisoMinimos}</Alert>}

            {!cargando && !error && libros.length === 0 && (
                <EmptyState
                    titulo="No hay libros registrados"
                    descripcion={
                        puedeEditarCatalogo
                            ? 'Registra un nuevo libro utilizando el formulario.'
                            : 'Todavía no hay libros en el catálogo.'
                    }
                    icono={<FaBook />}
                />
            )}

            {!cargando && !error && libros.length > 0 && librosFiltrados.length === 0 && (
                <EmptyState
                    titulo="No se encontraron libros"
                    descripcion="Cambia la búsqueda o los filtros seleccionados."
                    icono={<FaMagnifyingGlass />}
                    acciones={<Button variante="secondary" onClick={limpiarFiltros}>Limpiar filtros</Button>}
                />
            )}

            {!cargando && !error && librosActivos.length > 0 && (
                <TablaLibros
                    titulo="Libros activos"
                    subtitulo="Libros disponibles actualmente en el sistema"
                    paginados={activosPaginados}
                    contadorLibros={librosActivos.length}
                    pagina={paginaActivosActual}
                    totalPaginas={totalActivos}
                    onCambiarPagina={setPaginaActivos}
                    color="bg-success-bg text-success"
                    onVer={verLibro}
                    onEditar={editarLibro}
                    onEliminar={(l) => setLibroEliminar(l)}
                    puedeEditar={puedeEditarCatalogo}
                />
            )}

            {!cargando && !error && librosInactivos.length > 0 && (
                <TablaLibros
                    titulo="Libros inactivos"
                    subtitulo="Libros retirados temporalmente del catálogo"
                    paginados={inactivosPaginados}
                    contadorLibros={librosInactivos.length}
                    pagina={paginaInactivosActual}
                    totalPaginas={totalInactivos}
                    onCambiarPagina={setPaginaInactivos}
                    color="bg-parchment-400 text-slate-700"
                    onVer={verLibro}
                    onEditar={editarLibro}
                    onEliminar={(l) => setLibroEliminar(l)}
                    puedeEditar={puedeEditarCatalogo}
                />
            )}

            <LibroViewModal libro={libroVer} abierto={Boolean(libroVer)} onCerrar={() => setLibroVer(null)} />
            <LibroEditModal
                key={libroEditar?.id_libro}
                libro={libroEditar}
                abierto={Boolean(libroEditar)}
                onCerrar={() => setLibroEditar(null)}
                onActualizado={libroActualizado}
            />
            <LibroDeleteModal
                key={libroEliminar?.id_libro}
                libro={libroEliminar}
                abierto={Boolean(libroEliminar)}
                eliminando={eliminando}
                onCerrar={() => {
                    if (!eliminando) setLibroEliminar(null);
                }}
                onConfirmar={confirmarEliminar}
            />
        </div>
    );
}
