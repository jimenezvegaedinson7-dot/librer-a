import { useEffect, useMemo, useState } from 'react';

import { FaMagnifyingGlass, FaRotate, FaXmark } from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { CargandoPantalla } from '../../components/ui/Spinner';
import { ConfirmarEliminacion } from '../../components/ui/ConfirmarEliminacion';
import { DataTable } from '../../components/ui/DataTable';
import { EstadoActivo } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';

import { FaEye, FaPenToSquare, FaTrash } from 'react-icons/fa6';

import { useToast } from '../../components/providers/ToastProvider';

import { listarAutores, obtenerAutor, eliminarAutor } from './autoresService';
import AutorForm from './AutorForm';
import AutorViewModal from './AutorViewModal';
import AutorEditModal from './AutorEditModal';

const POR_PAGINA = 10;

const columnasAutores = [
    { titulo: 'ID', alineacion: 'centro', render: (fila) => <span className="text-mahogany-700">{fila.id_autor}</span> },
    { titulo: 'Autor', render: (fila) => <span className="font-semibold text-mahogany-700">{fila.nombre} {fila.apellido}</span> },
    { titulo: 'Nacionalidad', render: (fila) => <span className="text-mahogany-700">{fila.nacionalidad || 'No registrada'}</span> },
    { titulo: 'Estado', alineacion: 'centro', render: (fila) => <EstadoActivo activo={fila.estado} /> },
];

function accionesAutor(fila, { onVer, onEditar, onEliminar }) {
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver autor"><FaEye /></BtnAccion>
            <BtnAccion tipo="editar" onClick={() => onEditar(fila)} titulo="Editar autor"><FaPenToSquare /></BtnAccion>
            <BtnAccion tipo="eliminar" onClick={() => onEliminar(fila)} titulo="Eliminar autor"><FaTrash /></BtnAccion>
        </>
    );
}

function Contador({ total, activos, inactivos }) {
    return (
        <div className="summary-strip flex flex-wrap gap-2">
            <span className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-medium text-[#334155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Total: <span className="font-bold text-[#0f172a]">{total}</span>
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

function TablaAutores({ titulo, subtitulo, paginados, contador, pagina, totalPaginas, onCambiarPagina, color, onVer, onEditar, onEliminar }) {
    return (
        <Card>
            <CardHeader
                titulo={titulo}
                subtitulo={subtitulo}
                acciones={<span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>{contador}</span>}
            />
            <CardBody className="p-0">
                <DataTable
                    columnas={columnasAutores}
                    filas={paginados}
                    keyExtractor={(fila) => fila.id_autor}
                    acciones={(fila) => accionesAutor(fila, { onVer, onEditar, onEliminar })}
                />
            </CardBody>
            <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={onCambiarPagina} />
        </Card>
    );
}

export default function AutoresPage() {
    const { exito, error: mostrarError } = useToast();

    const [autores, setAutores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');

    const [paginaActivos, setPaginaActivos] = useState(1);
    const [paginaInactivos, setPaginaInactivos] = useState(1);

    const [autorVer, setAutorVer] = useState(null);
    const [autorEditar, setAutorEditar] = useState(null);
    const [autorEliminar, setAutorEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const cargarAutores = async () => {
        try {
            setCargando(true);
            setError('');
            setAutores(await listarAutores());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los autores');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarAutores();
    }, []);

    const autoresFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return autores.filter((autor) => {
            const nombre = String(autor.nombre || '').toLowerCase();
            const apellido = String(autor.apellido || '').toLowerCase();
            const nacionalidad = String(autor.nacionalidad || '').toLowerCase();
            const nombreCompleto = `${nombre} ${apellido}`;
            return !texto || nombre.includes(texto) || apellido.includes(texto) || nombreCompleto.includes(texto) || nacionalidad.includes(texto);
        });
    }, [autores, busqueda]);

    const autoresActivos = useMemo(() => autoresFiltrados.filter((a) => Number(a.estado) === 1), [autoresFiltrados]);
    const autoresInactivos = useMemo(() => autoresFiltrados.filter((a) => Number(a.estado) !== 1), [autoresFiltrados]);

    const totalActivos = Math.ceil(autoresActivos.length / POR_PAGINA);
    const totalInactivos = Math.ceil(autoresInactivos.length / POR_PAGINA);
    const activosPaginados = autoresActivos.slice((paginaActivos - 1) * POR_PAGINA, paginaActivos * POR_PAGINA);
    const inactivosPaginados = autoresInactivos.slice((paginaInactivos - 1) * POR_PAGINA, paginaInactivos * POR_PAGINA);

    useEffect(() => {
        setPaginaActivos(1);
        setPaginaInactivos(1);
    }, [busqueda]);

    useEffect(() => {
        if (totalActivos > 0 && paginaActivos > totalActivos) setPaginaActivos(totalActivos);
    }, [paginaActivos, totalActivos]);

    useEffect(() => {
        if (totalInactivos > 0 && paginaInactivos > totalInactivos) setPaginaInactivos(totalInactivos);
    }, [paginaInactivos, totalInactivos]);

    const verAutor = async (autor) => {
        try {
            setAutorVer(await obtenerAutor(autor.id_autor));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener el autor');
        }
    };

    const editarAutor = async (autor) => {
        try {
            setAutorEditar(await obtenerAutor(autor.id_autor));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener el autor');
        }
    };

    const confirmarEliminar = async (password) => {
        if (!autorEliminar || eliminando) return;
        const seleccionado = { ...autorEliminar };
        try {
            setEliminando(true);
            const respuesta = await eliminarAutor(seleccionado.id_autor, password);
            setAutorEliminar(null);
            await cargarAutores();
            exito(respuesta?.mensaje || `Autor "${seleccionado.nombre} ${seleccionado.apellido}" eliminado correctamente`);
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || err.response?.data?.error || 'Error al eliminar el autor');
        } finally {
            setEliminando(false);
        }
    };

    const autorCreado = async () => {
        await cargarAutores();
        exito('Autor registrado correctamente');
    };

    const autorActualizado = async () => {
        await cargarAutores();
        exito('Autor actualizado correctamente');
    };

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Autores"
                descripcion="Administra los autores registrados en la librería"
                acciones={<Contador total={autores.length} activos={autoresActivos.length} inactivos={autoresInactivos.length} />}
            />

            <AutorForm onAutorCreado={autorCreado} />

            <Card>
                <CardHeader
                    titulo="Catálogo de autores"
                    subtitulo="Busca autores por nombre, apellido o nacionalidad"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar autor..."
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
                            <Button variante="secondary" onClick={cargarAutores} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && <Card><CargandoPantalla texto="Cargando autores..." /></Card>}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && autores.length > 0 && autoresFiltrados.length === 0 && (
                <EmptyState
                    titulo="No se encontraron autores"
                    descripcion="Cambia la búsqueda o limpia los filtros."
                    icono={<FaMagnifyingGlass />}
                />
            )}

            {!cargando && !error && autoresActivos.length > 0 && (
                <TablaAutores
                    titulo="Autores activos"
                    subtitulo="Autores disponibles actualmente"
                    paginados={activosPaginados}
                    contador={autoresActivos.length}
                    pagina={paginaActivos}
                    totalPaginas={totalActivos}
                    onCambiarPagina={setPaginaActivos}
                    color="bg-success-bg text-success"
                    onVer={verAutor}
                    onEditar={editarAutor}
                    onEliminar={setAutorEliminar}
                />
            )}

            {!cargando && !error && autoresInactivos.length > 0 && (
                <TablaAutores
                    titulo="Autores inactivos"
                    subtitulo="Autores retirados temporalmente"
                    paginados={inactivosPaginados}
                    contador={autoresInactivos.length}
                    pagina={paginaInactivos}
                    totalPaginas={totalInactivos}
                    onCambiarPagina={setPaginaInactivos}
                    color="bg-parchment-400 text-mahogany-700"
                    onVer={verAutor}
                    onEditar={editarAutor}
                    onEliminar={setAutorEliminar}
                />
            )}

            <AutorViewModal autor={autorVer} abierto={Boolean(autorVer)} onCerrar={() => setAutorVer(null)} />
            <AutorEditModal autor={autorEditar} abierto={Boolean(autorEditar)} onCerrar={() => setAutorEditar(null)} onActualizado={autorActualizado} />
            <ConfirmarEliminacion
                abierto={Boolean(autorEliminar)}
                titulo="Eliminar autor"
                mensaje={
                    <>
                        ¿Estás seguro de que deseas eliminar al autor{' '}
                        <span className="font-bold">"{autorEliminar?.nombre} {autorEliminar?.apellido}"</span>?
                    </>
                }
                advertencia="Si el autor tiene libros relacionados, el sistema no permitirá eliminarlo."
                eliminando={eliminando}
                onCerrar={() => {
                    if (!eliminando) setAutorEliminar(null);
                }}
                onConfirmar={confirmarEliminar}
            />
        </div>
    );
}

