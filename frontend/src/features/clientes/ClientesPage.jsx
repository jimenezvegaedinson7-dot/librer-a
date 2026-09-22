import { useEffect, useState } from 'react';

import { FaEye, FaFileCsv, FaMagnifyingGlass, FaRotate, FaUserGroup, FaXmark } from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { BtnAccion } from '../../components/ui/Acciones';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';
import { exportarCsv } from '../../lib/utils/exportarCsv';

import { listarClientes } from './clientesService';
import ClienteViewModal from './ClienteViewModal';

const POR_PAGINA = 10;

const columnasClientes = [
    {
        titulo: 'Cliente',
        render: (fila) => (
            <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-700">{fila.nombre_completo || 'Sin nombre'}</span>
                <span className="block text-xs text-slate-500">{fila.email || 'Sin correo'}</span>
            </p>
        ),
    },
    {
        titulo: 'Nº compras',
        alineacion: 'centro',
        render: (fila) => <span className="font-semibold text-slate-700">{Number(fila.numero_compras || 0)}</span>,
    },
    {
        titulo: 'Total gastado',
        alineacion: 'centro',
        render: (fila) => <span className="font-bold text-slate-700">{formatearMoneda(Number(fila.total_gastado || 0))}</span>,
    },
    {
        titulo: 'Última compra',
        alineacion: 'centro',
        render: (fila) => (
            <span className="text-xs font-medium text-slate-700">
                {formatearFecha(fila.ultima_compra, { soloDia: true }) || 'Sin compras'}
            </span>
        ),
    },
];

function accionesCliente(fila, { onVer }) {
    return (
        <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver detalle del cliente">
            <FaEye />
        </BtnAccion>
    );
}

function Contador({ total, totalComprado, conCompras }) {
    return (
        <div className="summary-strip flex flex-wrap gap-2">
            <span className="rounded-xl border border-[#e6e0d7] bg-white px-4 py-2.5 text-sm font-medium text-[#433c35] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Total: <span className="font-bold text-[#1c1814]">{total}</span>
            </span>
            <span className="rounded-xl border border-[#e6e0d7] bg-[#faf8f5] px-4 py-2.5 text-sm font-medium text-[#5c544b] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Total comprado: <span className="font-bold text-[#2c2621]">{formatearMoneda(totalComprado)}</span>
            </span>
            <span className="rounded-xl border border-[#ecccc8] bg-[#fbf5f4] px-4 py-2.5 text-sm font-medium text-[#8a2c36] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Con compras: <span className="font-bold text-[#8a2c36]">{conCompras}</span>
            </span>
        </div>
    );
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [resumen, setResumen] = useState({ total_general: 0, con_compras: 0 });

    const [busqueda, setBusqueda] = useState('');
    const [busquedaAplicada, setBusquedaAplicada] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);

    const [clienteVer, setClienteVer] = useState(null);

    const cargarClientes = async () => {
        try {
            setCargando(true);
            setError('');
            const resultado = await listarClientes({
                q: busquedaAplicada.trim() || undefined,
                pagina: paginaActual,
                por_pagina: POR_PAGINA,
            });
            setClientes(resultado.clientes);
            setTotal(resultado.total);
            setTotalPaginas(resultado.paginas);
            setResumen(
                resultado.resumen || { total_general: 0, con_compras: 0 },
            );
            if (paginaActual > resultado.paginas) {
                setPaginaActual(resultado.paginas);
            }
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los clientes');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarClientes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busquedaAplicada, paginaActual]);

    const aplicarBusqueda = (valor) => {
        setBusqueda(valor);
        setBusquedaAplicada(valor);
        setPaginaActual(1);
    };

    const conCompras = Number(resumen.con_compras || 0);

    const exportar = () => {
        exportarCsv({
            nombreArchivo: `clientes_${new Date().toISOString().slice(0, 10)}`,
            columnas: [
                { titulo: 'ID', exportar: (f) => f.id_usuario },
                { titulo: 'Cliente', exportar: (f) => f.nombre_completo || '' },
                { titulo: 'Email', exportar: (f) => f.email || '' },
                { titulo: 'Nº compras', exportar: (f) => f.numero_compras || 0 },
                { titulo: 'Total gastado', exportar: (f) => f.total_gastado || 0 },
                { titulo: 'Última compra', exportar: (f) => f.ultima_compra || '' },
            ],
            filas: clientes,
        });
    };

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Clientes"
                descripcion="Clientes registrados y su actividad de compras"
                icono={<FaUserGroup />}
                acciones={
                    <Contador
                        total={total}
                        totalComprado={Number(resumen.total_general || 0)}
                        conCompras={conCompras}
                    />
                }
            />

            <Card>
                <CardHeader
                    titulo="Filtros de clientes"
                    subtitulo="Busca por nombre o correo"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') aplicarBusqueda(busqueda);
                                    }}
                                    placeholder="Buscar cliente..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => aplicarBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition hover:text-slate-700"
                                        title="Limpiar búsqueda"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

                            <Button variante="secondary" onClick={cargarClientes} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && <TableSkeleton columnas={5} filas={8} titulo />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && total === 0 && (
                <EmptyState
                    titulo="No hay clientes registrados"
                    descripcion="Cuando los clientes realicen compras, su información aparecerá aquí."
                    icono={<FaUserGroup />}
                />
            )}

            {!cargando && !error && total > 0 && clientes.length === 0 && (
                <EmptyState
                    titulo="No se encontraron clientes"
                    descripcion="Cambia la búsqueda o el filtro seleccionado."
                    icono={<FaMagnifyingGlass />}
                    acciones={
                        <Button
                            variante="secondary"
                            onClick={() => {
                                setBusqueda('');
                                setBusquedaAplicada('');
                                setPaginaActual(1);
                            }}
                        >
                            Limpiar filtros
                        </Button>
                    }
                />
            )}

            {!cargando && !error && clientes.length > 0 && (
                <Card>
                    <CardHeader
                        titulo="Clientes registrados"
                        subtitulo="Detalle de clientes y su actividad de compras"
                        acciones={
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                                    {total} {total === 1 ? 'cliente' : 'clientes'}
                                </span>
                                <Button variante="secondary" tamano="sm" onClick={exportar}>
                                    <FaFileCsv /> Exportar CSV
                                </Button>
                            </div>
                        }
                    />
                    <CardBody className="p-0">
                        <DataTable
                            columnas={columnasClientes}
                            filas={clientes}
                            keyExtractor={(fila) => fila.id_usuario}
                            onFilaClick={setClienteVer}
                            acciones={(fila) => accionesCliente(fila, { onVer: setClienteVer })}
                        />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

            <ClienteViewModal cliente={clienteVer} abierto={Boolean(clienteVer)} onCerrar={() => setClienteVer(null)} />
        </div>
    );
}
