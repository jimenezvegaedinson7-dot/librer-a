import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { FaMagnifyingGlass, FaRotate, FaXmark } from 'react-icons/fa6';

import { FaCalendarCheck, FaHourglassHalf, FaCircleCheck, FaCircleXmark, FaFlagCheckered } from 'react-icons/fa6';
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

import { FaEye, FaPenToSquare } from 'react-icons/fa6';

import { useToast } from '../../components/providers/ToastProvider';
import { BtnAccion } from '../../components/ui/Acciones';
import { formatearFecha } from '../../lib/utils/format';

import { listarReservas, obtenerReserva } from './reservasService';
import ReservaViewModal from './ReservaViewModal';
import ReservaEstadoModal from './ReservaEstadoModal';

const POR_PAGINA = 10;

// Mismo formato de fecha que el resto del panel.
const mostrarFecha = (fecha) => formatearFecha(fecha) || 'Sin fecha';

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
    { titulo: 'N.º', alineacion: 'centro', render: (fila) => <span className="text-slate-700">{fila.id_reserva}</span> },
    { titulo: 'Usuario', render: (fila) => <span className="font-semibold text-slate-700">{fila.nombre_usuario} {fila.apellido_usuario}</span> },
    { titulo: 'Libro', render: (fila) => <span className="font-semibold text-slate-700">{fila.titulo}</span> },
    { titulo: 'Cantidad', alineacion: 'centro', render: (fila) => <span className="font-bold text-slate-700">{fila.cantidad}</span> },
    { titulo: 'Fecha reserva', alineacion: 'centro', render: (fila) => <span className="text-xs font-medium text-slate-700">{mostrarFecha(fila.fecha_reserva)}</span> },
    { titulo: 'Vencimiento', alineacion: 'centro', render: (fila) => <span className="text-xs font-medium text-slate-700">{mostrarFecha(fila.fecha_vencimiento)}</span> },
    {
        titulo: 'Estado',
        alineacion: 'centro',
        render: (fila) => {
            const estado = obtenerEstado(fila.estado);
            return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${estado.clases}`}>{estado.texto}</span>;
        },
    },
];

function Contador({ cargando, total, pendientes, confirmadas, canceladas, completadas }) {
    return (
        <Indicadores cargando={cargando} etiqueta="Resumen de reservas">
            <Indicador titulo="Reservas" valor={total} icono={<FaCalendarCheck />} tono="primary" detalle="Registradas" />
            <Indicador titulo="Pendientes" valor={pendientes} icono={<FaHourglassHalf />} tono="warning" detalle="Por atender" de={total} />
            <Indicador titulo="Confirmadas" valor={confirmadas} icono={<FaCircleCheck />} tono="sky" detalle="Listas para recoger" de={total} />
            <Indicador titulo="Canceladas" valor={canceladas} icono={<FaCircleXmark />} tono="danger" detalle="Anuladas" de={total} />
            <Indicador titulo="Completadas" valor={completadas} icono={<FaFlagCheckered />} tono="success" detalle="Entregadas" de={total} />
        </Indicadores>
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

    // Desde una notificación: ?ver=... abre directamente la reserva.
    const [parametros, setParametros] = useSearchParams();
    useEffect(() => {
        const ver = parametros.get('ver');
        if (!ver) return;
        setParametros({}, { replace: true });
        verReserva({ id_reserva: ver });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parametros]);

    const cambiarEstadoReserva = async (reserva) => {
        try {
            setReservaEstado(await obtenerReserva(reserva.id_reserva));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener la reserva');
        }
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
                descripcion="Consulta histórica y cancelación de reservas activas"
            />
            <Contador
                cargando={cargando}
                total={reservas.length}
                pendientes={totalPendientes}
                confirmadas={totalConfirmadas}
                canceladas={totalCanceladas}
                completadas={totalCompletadas}
            />

            <Alert tipo="info">No se crean nuevas reservas ni se registran cobros. Puedes consultar el historial y cancelar reservas activas para liberar stock.</Alert>

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
                    descripcion="No hay reservas históricas para consultar."
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

            {reservaEstado && (
                <ReservaEstadoModal
                    reserva={reservaEstado}
                    abierto
                    onCerrar={() => setReservaEstado(null)}
                    onActualizado={reservaActualizada}
                
                />
            )}
        </div>
    );
}
