import { useEffect, useMemo, useState } from 'react';

import { FaBook, FaMagnifyingGlass, FaRotate, FaXmark } from 'react-icons/fa6';

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

import { listarLibros, obtenerLibro, eliminarLibro } from './librosService';
import LibroForm from './LibroForm';
import { StockBadge } from './libroUi';
import LibroViewModal from './LibroViewModal';
import LibroEditModal from './LibroEditModal';
import LibroDeleteModal from './LibroDeleteModal';

const POR_PAGINA = 10;

const columnasLibros = [
    { titulo: 'ID', alineacion: 'centro', render: (fila) => <span className="text-slate-700">{fila.id_libro}</span> },
    { titulo: 'Título', render: (fila) => <span className="font-semibold text-slate-700">{fila.titulo}</span> },
    { titulo: 'Autor', render: (fila) => <span className="text-slate-700">{fila.autor}</span> },
    { titulo: 'Categoría', render: (fila) => <span className="text-slate-700">{fila.categoria}</span> },
    { titulo: 'Precio', alineacion: 'centro', render: (fila) => <span className="font-semibold text-slate-700">{formatearMoneda(fila.precio)}</span> },
    { titulo: 'Stock', alineacion: 'centro', render: (fila) => <StockBadge stock={fila.stock} /> },
    { titulo: 'Estado', alineacion: 'centro', render: (fila) => <EstadoActivo activo={fila.estado} /> },
];

function accionesLibro(fila, { onVer, onEditar, onEliminar }) {
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver libro"><FaEye /></BtnAccion>
            <BtnAccion tipo="editar" onClick={() => onEditar(fila)} titulo="Editar libro"><FaPenToSquare /></BtnAccion>
            <BtnAccion tipo="eliminar" onClick={() => onEliminar(fila)} titulo="Eliminar libro"><FaTrash /></BtnAccion>
        </>
    );
}

function Contador({ total, activos, inactivos }) {
    return (
        <div className="summary-strip flex flex-wrap gap-2">
            <span className="rounded-xl border border-[#e6e0d7] bg-white px-4 py-2.5 text-sm font-medium text-[#433c35] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Total: <span className="font-bold text-[#1c1814]">{total}</span>
            </span>
            <span className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-2.5 text-sm font-medium text-[#15803d] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Activos: <span className="font-bold text-[#15803d]">{activos}</span>
            </span>
            <span className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-2.5 text-sm font-medium text-[#e11d48] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Inactivos: <span className="font-bold text-[#e11d48]">{inactivos}</span>
            </span>
        </div>
    );
}

function TablaLibros({ titulo, subtitulo, paginados, contadorLibros, pagina, totalPaginas, onCambiarPagina, color, onVer, onEditar, onEliminar }) {
    return (
        <Card>
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
                    acciones={(fila) => accionesLibro(fila, { onVer, onEditar, onEliminar })}
                />
            </CardBody>
            <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={onCambiarPagina} />
        </Card>
    );
}

export default function LibrosPage() {
    const { exito, error: mostrarError } = useToast();

    const [libros, setLibros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroStock, setFiltroStock] = useState('todos');

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
            setLibros(await listarLibros());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los libros');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarLibros();
    }, []);

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

            const stock = Number(libro.stock);
            const coincideStock =
                filtroStock === 'todos' ||
                (filtroStock === 'disponible' && stock > 5) ||
                (filtroStock === 'bajo' && stock > 0 && stock <= 5) ||
                (filtroStock === 'sin-stock' && stock <= 0);

            return coincideBusqueda && coincideEstado && coincideStock;
        });
    }, [libros, busqueda, filtroEstado, filtroStock]);

    const librosActivos = useMemo(() => librosFiltrados.filter((l) => Number(l.estado) === 1), [librosFiltrados]);
    const librosInactivos = useMemo(() => librosFiltrados.filter((l) => Number(l.estado) !== 1), [librosFiltrados]);

    const totalActivos = Math.ceil(librosActivos.length / POR_PAGINA);
    const totalInactivos = Math.ceil(librosInactivos.length / POR_PAGINA);
    const activosPaginados = librosActivos.slice((paginaActivos - 1) * POR_PAGINA, paginaActivos * POR_PAGINA);
    const inactivosPaginados = librosInactivos.slice((paginaInactivos - 1) * POR_PAGINA, paginaInactivos * POR_PAGINA);

    useEffect(() => {
        setPaginaActivos(1);
        setPaginaInactivos(1);
    }, [busqueda, filtroEstado, filtroStock]);

    useEffect(() => {
        if (totalActivos > 0 && paginaActivos > totalActivos) setPaginaActivos(totalActivos);
    }, [paginaActivos, totalActivos]);

    useEffect(() => {
        if (totalInactivos > 0 && paginaInactivos > totalInactivos) setPaginaInactivos(totalInactivos);
    }, [paginaInactivos, totalInactivos]);

    const verLibro = async (libro) => {
        try {
            setLibroVer(await obtenerLibro(libro.id_libro));
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
        <div className="space-y-4">
            <PageHeader
                titulo="Libros"
                descripcion="Administra el catálogo de la librería"
                acciones={<Contador total={libros.length} activos={librosActivos.length} inactivos={librosInactivos.length} />}
            />

            <LibroForm onLibroCreado={libroCreado} />

            <Card>
                <CardHeader
                    titulo="Catálogo de libros"
                    subtitulo="Busca y filtra los libros registrados"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar libro..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-64"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary-400 transition hover:text-slate-700"
                                        title="Limpiar búsqueda"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="sm:w-44">
                                <option value="todos">Todos los estados</option>
                                <option value="activo">Activos</option>
                                <option value="inactivo">Inactivos</option>
                            </Select>

                            <Select value={filtroStock} onChange={(e) => setFiltroStock(e.target.value)} className="sm:w-44">
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

            {!cargando && !error && libros.length === 0 && (
                <EmptyState
                    titulo="No hay libros registrados"
                    descripcion="Registra un nuevo libro utilizando el formulario."
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
                    pagina={paginaActivos}
                    totalPaginas={totalActivos}
                    onCambiarPagina={setPaginaActivos}
                    color="bg-success-bg text-success"
                    onVer={verLibro}
                    onEditar={editarLibro}
                    onEliminar={(l) => setLibroEliminar(l)}
                />
            )}

            {!cargando && !error && librosInactivos.length > 0 && (
                <TablaLibros
                    titulo="Libros inactivos"
                    subtitulo="Libros retirados temporalmente del catálogo"
                    paginados={inactivosPaginados}
                    contadorLibros={librosInactivos.length}
                    pagina={paginaInactivos}
                    totalPaginas={totalInactivos}
                    onCambiarPagina={setPaginaInactivos}
                    color="bg-parchment-400 text-slate-700"
                    onVer={verLibro}
                    onEditar={editarLibro}
                    onEliminar={(l) => setLibroEliminar(l)}
                />
            )}

            <LibroViewModal libro={libroVer} abierto={Boolean(libroVer)} onCerrar={() => setLibroVer(null)} />
            <LibroEditModal libro={libroEditar} abierto={Boolean(libroEditar)} onCerrar={() => setLibroEditar(null)} onActualizado={libroActualizado} />
            <LibroDeleteModal
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

