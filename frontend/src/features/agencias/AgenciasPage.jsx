import { useEffect, useMemo, useState } from 'react';

import {
    FaMagnifyingGlass,
    FaPenToSquare,
    FaRotate,
    FaTruckFast,
    FaXmark,
} from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { FormularioAlta } from '../../components/ui/FormularioAlta';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { EstadoActivo } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';

import { useToast } from '../../components/providers/ToastProvider';

import { listarAgencias, crearAgencia } from './agenciasService';
import AgenciaEditModal from './AgenciaEditModal';
import { requerido, numeroNoNegativo } from '../../lib/utils/validaciones';

const POR_PAGINA = 10;

const FORMATO_PRECIO = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
});

const FORMULARIO_VACIO = { nombre: '', tarifa_base: '', descripcion: '' };

const REGLAS = {
    nombre: [(v) => requerido(v, 'El nombre de la agencia')],
    tarifa_base: [(v) => numeroNoNegativo(v, 'La tarifa base')],
};

const columnasAgencias = [
    { titulo: 'ID', alineacion: 'centro', render: (fila) => <span className="text-mahogany-700">{fila.id_agencia}</span> },
    { titulo: 'Nombre', render: (fila) => <span className="font-semibold text-mahogany-700">{fila.nombre}</span> },
    { titulo: 'Tarifa base', alineacion: 'centro', render: (fila) => <span className="font-semibold text-mahogany-700">{FORMATO_PRECIO.format(Number(fila.tarifa_base) || 0)}</span> },
    { titulo: 'Descripción', render: (fila) => <span className="text-mahogany-700">{fila.descripcion || 'Sin descripción'}</span> },
    { titulo: 'Estado', alineacion: 'centro', render: (fila) => <EstadoActivo activo={fila.estado} /> },
];

function accionesAgencia(fila, { onEditar }) {
    return (
        <>
            <BtnAccion tipo="editar" onClick={() => onEditar(fila)} titulo="Editar agencia"><FaPenToSquare /></BtnAccion>
        </>
    );
}

function TablaAgencias({
    titulo,
    subtitulo,
    paginadas,
    totalFiltradas,
    pagina,
    totalPaginas,
    onCambiarPagina,
    onEditar,
}) {
    return (
        <Card>
            <CardHeader
                titulo={titulo}
                subtitulo={subtitulo}
                acciones={
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-parchment-400 px-3 py-1 text-xs font-bold text-mahogany-700">{totalFiltradas}</span>
                    </div>
                }
            />
            <CardBody className="p-0">
                <DataTable
                    columnas={columnasAgencias}
                    filas={paginadas}
                    keyExtractor={(fila) => fila.id_agencia}
                    acciones={(fila) => accionesAgencia(fila, { onEditar })}
                />
            </CardBody>
            {totalPaginas > 1 && (
                <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={onCambiarPagina} />
            )}
        </Card>
    );
}

export default function AgenciasPage() {
    const { exito } = useToast();

    const [agencias, setAgencias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [agenciaEditar, setAgenciaEditar] = useState(null);

    const [paginaActivas, setPaginaActivas] = useState(1);
    const [paginaInactivas, setPaginaInactivas] = useState(1);

    const cargarAgencias = async () => {
        try {
            setCargando(true);
            setError('');
            setAgencias(await listarAgencias());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar las agencias');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarAgencias();
    }, []);

    const agenciasFiltradas = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return agencias.filter((agencia) => {
            const nombre = String(agencia.nombre || '').toLowerCase();
            const descripcion = String(agencia.descripcion || '').toLowerCase();
            return !texto || nombre.includes(texto) || descripcion.includes(texto);
        });
    }, [agencias, busqueda]);

    const agenciasActivasFiltradas = useMemo(
        () => agenciasFiltradas.filter((a) => Number(a.estado) === 1),
        [agenciasFiltradas],
    );
    const agenciasInactivasFiltradas = useMemo(
        () => agenciasFiltradas.filter((a) => Number(a.estado) !== 1),
        [agenciasFiltradas],
    );

    const paginasActivas = Math.max(1, Math.ceil(agenciasActivasFiltradas.length / POR_PAGINA));
    const paginasInactivas = Math.max(1, Math.ceil(agenciasInactivasFiltradas.length / POR_PAGINA));

    useEffect(() => {
        setPaginaActivas(1);
        setPaginaInactivas(1);
    }, [busqueda]);

    useEffect(() => {
        if (paginaActivas > paginasActivas) setPaginaActivas(paginasActivas);
    }, [paginaActivas, paginasActivas]);

    useEffect(() => {
        if (paginaInactivas > paginasInactivas) setPaginaInactivas(paginasInactivas);
    }, [paginaInactivas, paginasInactivas]);

    const agenciasActivas = agenciasActivasFiltradas.slice((paginaActivas - 1) * POR_PAGINA, paginaActivas * POR_PAGINA);
    const agenciasInactivas = agenciasInactivasFiltradas.slice(
        (paginaInactivas - 1) * POR_PAGINA,
        paginaInactivas * POR_PAGINA,
    );

    const agenciaCreada = async () => {
        await cargarAgencias();
        exito('Agencia registrada correctamente');
    };

    const agenciaActualizada = async () => {
        await cargarAgencias();
        exito('Agencia actualizada correctamente');
    };

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Agencias courier"
                descripcion="Administra las agencias de envío disponibles para los pedidos"
                acciones={
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-xl border border-primary-200 bg-white px-4 py-2 text-sm">
                            Total: <span className="font-bold text-mahogany-700">{agencias.length}</span>
                        </span>
                        <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                            Activas: <span className="font-bold text-emerald-800">{agenciasActivasFiltradas.length}</span>
                        </span>
                        <span className="rounded-xl border border-primary-200 bg-parchment-300 px-4 py-2 text-sm text-primary-500">
                            Inactivas: <span className="font-bold text-mahogany-700">{agenciasInactivasFiltradas.length}</span>
                        </span>
                    </div>
                }
            />

            <FormularioAlta
                titulo="Registrar agencia"
                subtitulo="Complete la información de la nueva agencia de envío"
                etiquetaAlta="Nuevo registro"
                icono={<FaTruckFast />}
                botonGuardar="Guardar agencia"
                formularioVacio={FORMULARIO_VACIO}
                reglas={REGLAS}
                guardar={crearAgencia}
                mensajeExito="Agencia registrada correctamente"
                mensajeError="Error al registrar la agencia"
                onRegistrado={agenciaCreada}
                renderCampos={({ formulario, manejarCambio, errores }) => (
                    <>
                        <Input
                            label="Nombre de la agencia"
                            name="nombre"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            error={errores?.nombre}
                            placeholder="Ej. Olva Courier"
                            required
                        />
                        <Input
                            label="Tarifa base (S/)"
                            name="tarifa_base"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formulario.tarifa_base}
                            onChange={manejarCambio}
                            error={errores?.tarifa_base}
                            placeholder="Ej. 12.00"
                            required
                        />
                        <Textarea
                            label="Descripción"
                            name="descripcion"
                            value={formulario.descripcion}
                            onChange={manejarCambio}
                            placeholder="Escriba una descripción de la agencia"
                            rows="3"
                        />
                    </>
                )}
            />

            <Card>
                <CardHeader
                    titulo="Catálogo de agencias"
                    subtitulo="Busca agencias por nombre o descripción"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar agencia..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary-400 hover:text-mahogany-700"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>
                            <Button variante="secondary" onClick={cargarAgencias} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && <TableSkeleton columnas={5} filas={8} titulo />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && agencias.length === 0 && (
                <EmptyState
                    titulo="No hay agencias registradas"
                    descripcion="Registra una agencia utilizando el formulario."
                    icono={<FaTruckFast />}
                />
            )}

            {!cargando && !error && agencias.length > 0 && agenciasFiltradas.length === 0 && (
                <EmptyState
                    titulo="No se encontraron agencias"
                    descripcion="Cambia la búsqueda o limpia los filtros."
                    icono={<FaMagnifyingGlass />}
                />
            )}

            {!cargando && !error && agenciasActivasFiltradas.length > 0 && (
                <TablaAgencias
                    titulo="Agencias activas"
                    subtitulo="Agencias disponibles para los pedidos"
                    paginadas={agenciasActivas}
                    totalFiltradas={agenciasActivasFiltradas.length}
                    pagina={paginaActivas}
                    totalPaginas={paginasActivas}
                    onCambiarPagina={setPaginaActivas}
                    onEditar={setAgenciaEditar}
                />
            )}

            {!cargando && !error && agenciasInactivasFiltradas.length > 0 && (
                <TablaAgencias
                    titulo="Agencias inactivas"
                    subtitulo="Agencias deshabilitadas temporalmente"
                    paginadas={agenciasInactivas}
                    totalFiltradas={agenciasInactivasFiltradas.length}
                    pagina={paginaInactivas}
                    totalPaginas={paginasInactivas}
                    onCambiarPagina={setPaginaInactivas}
                    onEditar={setAgenciaEditar}
                />
            )}

            <AgenciaEditModal
                agencia={agenciaEditar}
                abierto={Boolean(agenciaEditar)}
                onCerrar={() => setAgenciaEditar(null)}
                onActualizado={agenciaActualizada}
            />
        </div>
    );
}