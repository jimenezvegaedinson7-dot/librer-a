import { useEffect, useMemo, useState } from 'react';

import { FaBoxesStacked, FaClockRotateLeft, FaMagnifyingGlass, FaRotate, FaXmark } from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';

import { FaEye, FaPenToSquare } from 'react-icons/fa6';
import { formatearFecha } from '../../lib/utils/format';

import { useToast } from '../../components/providers/ToastProvider';

import { listarInventario, obtenerInventarioLibro } from './inventarioService';
import InventarioForm from './InventarioForm';
import InventarioViewModal from './InventarioViewModal';
import InventarioEditModal from './InventarioEditModal';
import MovimientosModal from './MovimientosModal';

const POR_PAGINA = 10;

function EstadoStock({ stock, stockMinimo }) {
    const cantidad = Number(stock);
    const minimo = Number(stockMinimo);
    if (cantidad <= 0) return <Badge color="danger">Sin stock</Badge>;
    if (cantidad <= minimo) return <Badge color="warning">Bajo: {cantidad}</Badge>;
    return <Badge color="success">{cantidad} disponibles</Badge>;
}

const columnasInventario = [
    { titulo: 'ID', alineacion: 'centro', render: (fila) => <span className="text-slate-700">{fila.id_inventario}</span> },
    { titulo: 'Libro', render: (fila) => <span className="font-semibold text-slate-700">{fila.titulo}</span> },
    { titulo: 'Stock', alineacion: 'centro', render: (fila) => <EstadoStock stock={fila.stock} stockMinimo={fila.stock_minimo} /> },
    { titulo: 'Stock mínimo', alineacion: 'centro', render: (fila) => <span className="font-medium text-slate-700">{Number(fila.stock_minimo)}</span> },
    { titulo: 'Ubicación', render: (fila) => <span className="text-slate-700">{fila.ubicacion || 'No registrada'}</span> },
    { titulo: 'Última actualización', alineacion: 'centro', render: (fila) => <span className="text-xs font-medium text-slate-700">{formatearFecha(fila.ultima_actualizacion) || 'Sin registro'}</span> },
];

function accionesInventario(fila, { onVer, onEditar }) {
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver inventario"><FaEye /></BtnAccion>
            <BtnAccion tipo="editar" onClick={() => onEditar(fila)} titulo="Editar inventario"><FaPenToSquare /></BtnAccion>
        </>
    );
}

function Contador({ total, disponibles, stockBajo, sinStock }) {
    return (
        <div className="summary-strip flex flex-wrap gap-2">
            <span className="rounded-xl border border-[#e6e0d7] bg-white px-4 py-2.5 text-sm font-medium text-[#433c35] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Total: <span className="font-bold text-[#1c1814]">{total}</span>
            </span>
            <span className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-2.5 text-sm font-medium text-[#15803d] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Disponibles: <span className="font-bold text-[#15803d]">{disponibles}</span>
            </span>
            <span className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-2.5 text-sm font-medium text-[#ea580c] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Stock bajo: <span className="font-bold text-[#ea580c]">{stockBajo}</span>
            </span>
            <span className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-2.5 text-sm font-medium text-[#e11d48] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Sin stock: <span className="font-bold text-[#e11d48]">{sinStock}</span>
            </span>
        </div>
    );
}

export default function InventarioPage() {
    const { exito, error: mostrarError } = useToast();

    const [inventario, setInventario] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [busqueda, setBusqueda] = useState('');
    const [filtroStock, setFiltroStock] = useState('todos');

    const [paginaActual, setPaginaActual] = useState(1);

const [inventarioVer, setInventarioVer] = useState(null);
    const [inventarioEditar, setInventarioEditar] = useState(null);
    const [movimientosAbierto, setMovimientosAbierto] = useState(false);

    const cargarInventario = async () => {
        try {
            setCargando(true);
            setError('');
            setInventario(await listarInventario());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar el inventario');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarInventario();
    }, []);

    const totalStockBajo = inventario.filter((registro) => {
        const stock = Number(registro.stock);
        const minimo = Number(registro.stock_minimo);
        return stock > 0 && stock <= minimo;
    }).length;

    const totalSinStock = inventario.filter((registro) => Number(registro.stock) <= 0).length;

    const totalDisponibles = inventario.filter((registro) => {
        const stock = Number(registro.stock);
        const minimo = Number(registro.stock_minimo);
        return stock > minimo;
    }).length;

    const inventarioFiltrado = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return inventario.filter((registro) => {
            const titulo = String(registro.titulo || '').toLowerCase();
            const ubicacion = String(registro.ubicacion || '').toLowerCase();
            const stock = Number(registro.stock);
            const stockMinimo = Number(registro.stock_minimo);

            const coincideBusqueda = !texto || titulo.includes(texto) || ubicacion.includes(texto);

            const coincideStock =
                filtroStock === 'todos' ||
                (filtroStock === 'disponible' && stock > stockMinimo) ||
                (filtroStock === 'bajo' && stock > 0 && stock <= stockMinimo) ||
                (filtroStock === 'sin-stock' && stock <= 0);

            return coincideBusqueda && coincideStock;
        });
    }, [inventario, busqueda, filtroStock]);

    const totalPaginas = Math.ceil(inventarioFiltrado.length / POR_PAGINA);
    const inventarioPaginado = inventarioFiltrado.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, filtroStock]);

    useEffect(() => {
        if (totalPaginas > 0 && paginaActual > totalPaginas) setPaginaActual(totalPaginas);
    }, [paginaActual, totalPaginas]);

    const verInventario = async (registro) => {
        try {
            setInventarioVer(await obtenerInventarioLibro(registro.id_libro));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener el inventario');
        }
    };

    const editarInventario = async (registro) => {
        try {
            setInventarioEditar(await obtenerInventarioLibro(registro.id_libro));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener el inventario');
        }
    };

    const inventarioCreado = async () => {
        await cargarInventario();
        exito('Inventario registrado correctamente');
    };

    const inventarioActualizado = async () => {
        await cargarInventario();
        exito('Inventario actualizado correctamente');
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroStock('todos');
        setPaginaActual(1);
    };

    const hayFiltros = busqueda || filtroStock !== 'todos';

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Inventario"
                descripcion="Administra el stock y ubicación de los libros"
acciones={
                    <>
                        <Contador
                            total={inventario.length}
                            disponibles={totalDisponibles}
                            stockBajo={totalStockBajo}
                            sinStock={totalSinStock}
                        />
                        <Button variante="secondary" onClick={() => setMovimientosAbierto(true)}>
                            <FaClockRotateLeft /> Movimientos
                        </Button>
                    </>
                }
            />

            <InventarioForm onInventarioCreado={inventarioCreado} />

            <Card>
                <CardHeader
                    titulo="Control de inventario"
                    subtitulo="Busca libros y filtra según el nivel de stock"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar libro o ubicación..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition hover:text-slate-700"
                                        title="Limpiar búsqueda"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

                            <Select value={filtroStock} onChange={(e) => setFiltroStock(e.target.value)} className="sm:w-44">
                                <option value="todos">Todo el stock</option>
                                <option value="disponible">Disponible</option>
                                <option value="bajo">Stock bajo</option>
                                <option value="sin-stock">Sin stock</option>
                            </Select>

                            {hayFiltros && (
                                <Button variante="secondary" onClick={limpiarFiltros}>Limpiar</Button>
                            )}

                            <Button variante="secondary" onClick={cargarInventario} disabled={cargando}>
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

            {!cargando && !error && inventario.length === 0 && (
                <EmptyState
                    titulo="No hay inventario registrado"
                    descripcion="Registra el inventario de un libro utilizando el formulario."
                    icono={<FaBoxesStacked />}
                />
            )}

            {!cargando && !error && inventario.length > 0 && inventarioFiltrado.length === 0 && (
                <EmptyState
                    titulo="No se encontraron registros"
                    descripcion="Cambia la búsqueda o el filtro seleccionado."
                    icono={<FaMagnifyingGlass />}
                    acciones={<Button variante="secondary" onClick={limpiarFiltros}>Limpiar filtros</Button>}
                />
            )}

            {!cargando && !error && inventarioPaginado.length > 0 && (
                <Card>
                    <CardHeader
                        titulo="Inventario registrado"
                        subtitulo="Estado actual del stock de los libros"
                        acciones={
                            <span className="rounded-full bg-success-bg px-3 py-1 text-xs font-bold text-success">
                                {inventarioFiltrado.length} {inventarioFiltrado.length === 1 ? 'registro' : 'registros'}
                            </span>
                        }
                    />
                    <CardBody className="p-0">
                        <DataTable
                            columnas={columnasInventario}
                            filas={inventarioPaginado}
                            keyExtractor={(fila) => fila.id_inventario}
                            acciones={(fila) => accionesInventario(fila, { onVer: verInventario, onEditar: editarInventario })}
                        />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

<InventarioViewModal inventario={inventarioVer} abierto={Boolean(inventarioVer)} onCerrar={() => setInventarioVer(null)} />
            <InventarioEditModal
                inventario={inventarioEditar}
                abierto={Boolean(inventarioEditar)}
                onCerrar={() => setInventarioEditar(null)}
                onActualizado={inventarioActualizado}
            />
            <MovimientosModal abierto={movimientosAbierto} onCerrar={() => setMovimientosAbierto(false)} />
        </div>
    );
}

