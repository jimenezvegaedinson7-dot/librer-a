import { useEffect, useMemo, useState } from 'react';

import { FaMagnifyingGlass, FaRotate, FaXmark } from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';

import { FaEye, FaPenToSquare } from 'react-icons/fa6';

import { useToast } from '../../components/providers/ToastProvider';
import { BtnAccion } from '../../components/ui/Acciones';

import { listarReservas, obtenerReserva } from './reservasService';
import ReservaForm from './ReservaForm';
import ReservaViewModal from './ReservaViewModal';
import ReservaEstadoModal from './ReservaEstadoModal';

const POR_PAGINA = 10;

function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleString('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

function obtenerEstado(estado) {
    switch (estado) {
        case 'pendiente':
            return { texto: 'Pendiente', clases: 'bg-warning-bg text-warning' };
        case 'confirmada':
            return { texto: 'Confirmada', clases: 'bg-sky-100 text-sky-700' };
        case 'cancelada':
            return { texto: 'Cancelada', clases: 'bg-crimson-100 text-crimson-500' };
        case 'completada':
            return { texto: 'Completada', clases: 'bg-success-bg text-success' };
        default:
            return { texto: estado || 'Sin estado', clases: 'bg-parchment-400 text-slate-700' };
    }
}

const columnasReservas = [
    { titulo: 'ID', alineacion: 'centro', render: (fila) => <span className="text-slate-700">{fila.id_reserva}</span> },
    { titulo: 'Usuario', render: (fila) => <span className="font-semibold text-slate-700">{fila.nombre_usuario} {fila.apellido_usuario}</span> },
    { titulo: 'Libro', render: (fila) => <span className="font-semibold text-slate-700">{fila.titulo}</span> },
    { titulo: 'Cantidad', alineacion: 'centro', render: (fila) => <span className="font-bold text-slate-700">{fila.cantidad}</span> },
    { titulo: 'Fecha reserva', alineacion: 'centro', render: (fila) => <span className="text-xs font-medium text-slate-700">{formatearFecha(fila.fecha_reserva)}</span> },
    { titulo: 'Vencimiento', alineacion: 'centro', render: (fila) => <span className="text-xs font-medium text-slate-700">{formatearFecha(fila.fecha_vencimiento)}</span> },
    {
        titulo: 'Estado',
        alineacion: 'centro',
        render: (fila) => {
            const estado = obtenerEstado(fila.estado);
            return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${estado.clases}`}>{estado.texto}</span>;
        },
    },
];

function Contador({ total, pendientes, confirmadas, canceladas, completadas }) {
    return (
        <div className="summary-strip flex flex-wrap gap-2">
            <span className="rounded-xl border border-[#e6e0d7] bg-white px-4 py-2.5 text-sm font-medium text-[#433c35] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Total: <span className="font-bold text-[#1c1814]">{total}</span>
            </span>
            <span className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-2.5 text-sm font-medium text-[#d97706] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Pendientes: <span className="font-bold text-[#d97706]">{pendientes}</span>
            </span>
            <span className="rounded-xl border border-[#ecccc8] bg-[#fbf5f4] px-4 py-2.5 text-sm font-medium text-[#8a2c36] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Confirmadas: <span className="font-bold text-[#8a2c36]">{confirmadas}</span>
            </span>
            <span className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-2.5 text-sm font-medium text-[#e11d48] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Canceladas: <span className="font-bold text-[#e11d48]">{canceladas}</span>
            </span>
            <span className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-2.5 text-sm font-medium text-[#15803d] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Completadas: <span className="font-bold text-[#15803d]">{completadas}</span>
            </span>
        </div>
    );
}

export default function ReservasPage() {
    const { exito, error: mostrarError } = useToast();

    const [reservas, setReservas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const [paginaActual, setPaginaActual] = useState(1);

    const [reservaVer, setReservaVer] = useState(null);
    const [reservaEstado, setReservaEstado] = useState(null);

    const cargarReservas = async () => {
        try {
            setCargando(true);
            setError('');
            setReservas(await listarReservas());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar las reservas');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarReservas();
    }, []);

    const totalPendientes = useMemo(() => reservas.filter((r) => r.estado === 'pendiente').length, [reservas]);
    const totalConfirmadas = useMemo(() => reservas.filter((r) => r.estado === 'confirmada').length, [reservas]);
    const totalCanceladas = useMemo(() => reservas.filter((r) => r.estado === 'cancelada').length, [reservas]);
    const totalCompletadas = useMemo(() => reservas.filter((r) => r.estado === 'completada').length, [reservas]);

    const reservasFiltradas = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return reservas.filter((reserva) => {
            const usuario = `${reserva.nombre_usuario || ''} ${reserva.apellido_usuario || ''}`.toLowerCase();
            const libro = String(reserva.titulo || '').toLowerCase();
            const id = String(reserva.id_reserva || '');
            const coincideBusqueda = !texto || usuario.includes(texto) || libro.includes(texto) || id.includes(texto);
            const coincideEstado = filtroEstado === 'todos' || reserva.estado === filtroEstado;
            return coincideBusqueda && coincideEstado;
        });
    }, [reservas, busqueda, filtroEstado]);

    const totalPaginas = Math.ceil(reservasFiltradas.length / POR_PAGINA);
    const reservasPaginadas = reservasFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, filtroEstado]);

    useEffect(() => {
        if (totalPaginas > 0 && paginaActual > totalPaginas) setPaginaActual(totalPaginas);
    }, [paginaActual, totalPaginas]);

    const verReserva = async (reserva) => {
        try {
            setReservaVer(await obtenerReserva(reserva.id_reserva));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener la reserva');
        }
    };

    const cambiarEstadoReserva = async (reserva) => {
        try {
            setReservaEstado(await obtenerReserva(reserva.id_reserva));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener la reserva');
        }
    };

    const reservaCreada = async () => {
        await cargarReservas();
        exito('Reserva registrada correctamente');
    };

    const reservaActualizada = async (mensaje) => {
        await cargarReservas();
        exito(mensaje || 'Estado de reserva actualizado correctamente');
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroEstado('todos');
    };

    const hayFiltros = busqueda || filtroEstado !== 'todos';

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Reservas"
                descripcion="Administra las reservas realizadas en la librería"
                acciones={
                    <Contador
                        total={reservas.length}
                        pendientes={totalPendientes}
                        confirmadas={totalConfirmadas}
                        canceladas={totalCanceladas}
                        completadas={totalCompletadas}
                    />
                }
            />

            <ReservaForm onReservaCreada={reservaCreada} />

            <Card>
                <CardHeader
                    titulo="Lista de reservas"
                    subtitulo="Busca por usuario, libro o número de reserva"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar reserva..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>
                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                                <option value="todos">Todos los estados</option>
                                <option value="pendiente">Pendientes</option>
                                <option value="confirmada">Confirmadas</option>
                                <option value="cancelada">Canceladas</option>
                                <option value="completada">Completadas</option>
                            </Select>
                            {hayFiltros && (
                                <Button variante="secondary" onClick={limpiarFiltros}>
                                    Limpiar
                                </Button>
                            )}
                            <Button variante="secondary" onClick={cargarReservas} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && (
                <TableSkeleton columnas={7} filas={8} titulo />
            )}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && reservas.length === 0 && (
                <EmptyState
                    titulo="No hay reservas registradas"
                    descripcion="Registra una nueva reserva utilizando el formulario."
                    icono={<FaMagnifyingGlass />}
                />
            )}

            {!cargando && !error && reservas.length > 0 && reservasFiltradas.length === 0 && (
                <EmptyState
                    titulo="No se encontraron reservas"
                    descripcion="Cambia la búsqueda o el filtro seleccionado."
                    icono={<FaMagnifyingGlass />}
                />
            )}

            {!cargando && !error && reservasPaginadas.length > 0 && (
                <Card>
                    <CardHeader
                        titulo="Reservas registradas"
                        subtitulo="Estado actual de las reservas del sistema"
                        acciones={
                            <span className="rounded-full px-3 py-1 text-xs font-bold bg-parchment-300 text-slate-700">
                                {reservasFiltradas.length} {reservasFiltradas.length === 1 ? 'reserva' : 'reservas'}
                            </span>
                        }
                    />
                    <CardBody className="p-0">
                        <DataTable
                            columnas={columnasReservas}
                            filas={reservasPaginadas}
                            keyExtractor={(fila) => fila.id_reserva}
acciones={(reserva) => {
                                const cerrada = reserva.estado === 'cancelada' || reserva.estado === 'completada';
                                return (
                                    <>
                                        <BtnAccion tipo="ver" onClick={() => verReserva(reserva)} titulo="Ver reserva">
                                            <FaEye />
                                        </BtnAccion>
                                        <BtnAccion
                                            tipo="editar"
                                            onClick={() => cambiarEstadoReserva(reserva)}
                                            titulo={cerrada ? 'La reserva ya está cerrada' : 'Cambiar estado'}
                                            disabled={cerrada}
                                        >
                                            <FaPenToSquare />
                                        </BtnAccion>
                                    </>
                                );
                            }}
                        />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

            <ReservaViewModal
                reserva={reservaVer}
                abierto={Boolean(reservaVer)}
                onCerrar={() => setReservaVer(null)}
            />

            <ReservaEstadoModal
                reserva={reservaEstado}
                abierto={Boolean(reservaEstado)}
                onCerrar={() => setReservaEstado(null)}
                onActualizado={reservaActualizada}
            />
        </div>
    );
}

