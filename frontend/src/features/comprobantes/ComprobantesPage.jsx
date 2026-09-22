import { useEffect, useState } from 'react';

import {
    FaCircleCheck,
    FaEye,
    FaMagnifyingGlass,
    FaPaperPlane,
    FaPrint,
    FaReceipt,
    FaRotate,
    FaXmark,
} from 'react-icons/fa6';

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
import { useToast } from '../../components/providers/ToastProvider';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';

import { listarComprobantes, obtenerResumen, enviarComprobanteEmail } from './comprobantesService';
import ComprobanteViewModal from './ComprobanteViewModal';

const POR_PAGINA = 10;

function formatearSerieNumero(comprobante) {
    const serie = String(comprobante?.serie ?? '');
    const numero = String(comprobante?.numero ?? '');
    return `${serie}-${numero.padStart(8, '0')}`;
}

function badgeTipo(tipo) {
    const esFactura = String(tipo) === 'factura';
    return <Badge color={esFactura ? 'primary' : 'neutral'}>{esFactura ? 'Factura' : 'Boleta'}</Badge>;
}

const columnasComprobantes = [
    {
        titulo: 'Serie-Número',
        render: (fila) => (
            <span className="font-mono text-xs font-bold tracking-wide text-mahogany-700">{formatearSerieNumero(fila)}</span>
        ),
    },
    { titulo: 'Tipo', alineacion: 'centro', render: (fila) => badgeTipo(fila.tipo) },
    {
        titulo: 'Cliente',
        render: (fila) => (
            <p className="text-sm text-mahogany-700">
                <span className="font-semibold text-mahogany-700">{fila.cliente_nombre || 'Sin nombre'}</span>
                {fila.cliente_dni_ruc && <span className="block text-xs text-primary-400">{fila.cliente_dni_ruc}</span>}
            </p>
        ),
    },
    {
        titulo: 'Total',
        alineacion: 'centro',
        render: (fila) => <span className="font-bold text-mahogany-700">{formatearMoneda(fila.total)}</span>,
    },
    {
        titulo: 'Fecha',
        alineacion: 'centro',
        render: (fila) => (
            <span className="text-xs font-medium text-mahogany-700">{formatearFecha(fila.fecha_emision) || 'Sin fecha'}</span>
        ),
    },
];

function accionesComprobante(fila, { onVer, onImprimir, onEnviarEmail, enviando }) {
    const fueEnviado = fila.enviado_por_email;
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver comprobante">
                <FaEye />
            </BtnAccion>
            <BtnAccion tipo="ver" onClick={() => onImprimir(fila)} titulo="Imprimir comprobante">
                <FaPrint />
            </BtnAccion>
            <BtnAccion
                tipo="ver"
                onClick={() => onEnviarEmail(fila)}
                titulo={fueEnviado ? 'Ya enviado por correo' : 'Enviar por correo'}
                disabled={enviando}
                className={fueEnviado ? 'text-green-600' : ''}
            >
                {enviando ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : fueEnviado ? (
                    <FaCircleCheck />
                ) : (
                    <FaPaperPlane />
                )}
            </BtnAccion>
        </>
    );
}

export default function ComprobantesPage() {
    const [comprobantes, setComprobantes] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [resumen, setResumen] = useState({ boletas: 0, facturas: 0, ingresos: 0 });

    const [busqueda, setBusqueda] = useState('');
    const [busquedaAplicada, setBusquedaAplicada] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [paginaActual, setPaginaActual] = useState(1);

    const [comprobanteVer, setComprobanteVer] = useState(null);
    const [comprobanteImprimir, setComprobanteImprimir] = useState(null);
    const [enviandoEmail, setEnviandoEmail] = useState(null);
    const { exito, error: mostrarError } = useToast();

    const cargarComprobantes = async () => {
        try {
            setCargando(true);
            setError('');
            const resultado = await listarComprobantes({
                tipo: filtroTipo === 'todos' ? undefined : filtroTipo,
                q: busquedaAplicada.trim() || undefined,
                pagina: paginaActual,
                por_pagina: POR_PAGINA,
            });
            setComprobantes(resultado.comprobantes);
            setTotal(resultado.total);
            setTotalPaginas(resultado.paginas);
            if (paginaActual > resultado.paginas) {
                setPaginaActual(resultado.paginas);
            }
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los comprobantes');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarComprobantes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busquedaAplicada, filtroTipo, paginaActual]);

    const cargarResumen = async () => {
        try {
            const datos = await obtenerResumen();
            setResumen({
                boletas: Number(datos.boletas || 0),
                facturas: Number(datos.facturas || 0),
                ingresos: Number(datos.ingresos || 0),
            });
        } catch {
            setResumen({ boletas: 0, facturas: 0, ingresos: 0 });
        }
    };

    useEffect(() => {
        cargarResumen();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const actualizar = () => {
        cargarComprobantes();
        cargarResumen();
    };

    const aplicarBusqueda = (valor) => {
        setBusqueda(valor);
        setBusquedaAplicada(valor);
        setPaginaActual(1);
    };

    const cambiarTipo = (valor) => {
        setFiltroTipo(valor);
        setPaginaActual(1);
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setBusquedaAplicada('');
        setFiltroTipo('todos');
        setPaginaActual(1);
    };

    const handleEnviarEmail = async (comprobante) => {
        if (!comprobante?.cliente_email && !comprobante?.correo_compra) {
            mostrarError('No hay correo registrado para este cliente');
            return;
        }
        try {
            setEnviandoEmail(comprobante.id_comprobante);
            const resultado = await enviarComprobanteEmail(comprobante.id_comprobante);
            exito(resultado?.mensaje || 'Comprobante enviado correctamente');
            cargarComprobantes();
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al enviar el comprobante');
        } finally {
            setEnviandoEmail(null);
        }
    };

    const hayFiltros = Boolean(busquedaAplicada) || filtroTipo !== 'todos';

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Comprobantes de pago"
                descripcion="Boletas y facturas emitidas por las ventas"
                icono={<FaReceipt />}
                acciones={
                    <div className="summary-strip flex flex-wrap gap-2">
                        <span className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-medium text-[#334155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            Total: <span className="font-bold text-[#0f172a]">{total}</span>
                        </span>
                        <span className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-sm font-medium text-[#475569] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            Boletas: <span className="font-bold text-[#1e293b]">{resumen.boletas}</span>
                        </span>
                        <span className="rounded-xl border border-[#c7d2fe] bg-[#eef2ff] px-4 py-2.5 text-sm font-medium text-[#4f46e5] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            Facturas: <span className="font-bold text-[#4f46e5]">{resumen.facturas}</span>
                        </span>
                        <span className="rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] px-4 py-2.5 text-sm font-medium text-[#059669] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            Ingresos: <span className="font-bold text-[#059669]">{formatearMoneda(resumen.ingresos)}</span>
                        </span>
                    </div>
                }
            />

            <Card>
                <CardHeader
                    titulo="Filtros de comprobantes"
                    subtitulo="Busca por serie, número, cliente o documento"
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
                                    placeholder="Buscar comprobante..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => aplicarBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary-400 transition hover:text-mahogany-700"
                                        title="Limpiar búsqueda"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

                            <Select value={filtroTipo} onChange={(e) => cambiarTipo(e.target.value)} className="sm:w-44">
                                <option value="todos">Todos los tipos</option>
                                <option value="boleta">Boletas</option>
                                <option value="factura">Facturas</option>
                            </Select>

                            {hayFiltros && (
                                <Button variante="secondary" onClick={limpiarFiltros}>
                                    Limpiar
                                </Button>
                            )}

                            <Button variante="secondary" onClick={actualizar} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && <TableSkeleton columnas={6} filas={8} titulo />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && total === 0 && (
                <EmptyState
                    titulo="No hay comprobantes emitidos"
                    descripcion="Los comprobantes se generan al emitir boletas o facturas desde el módulo de ventas."
                    icono={<FaReceipt />}
                />
            )}

            {!cargando && !error && total > 0 && comprobantes.length === 0 && (
                <EmptyState
                    titulo="No se encontraron comprobantes"
                    descripcion="Cambia la búsqueda o el filtro seleccionado."
                    icono={<FaMagnifyingGlass />}
                    acciones={
                        <Button variante="secondary" onClick={limpiarFiltros}>
                            Limpiar filtros
                        </Button>
                    }
                />
            )}

            {!cargando && !error && comprobantes.length > 0 && (
                <Card>
                    <CardHeader
                        titulo="Comprobantes emitidos"
                        subtitulo="Boletas y facturas generadas"
                        acciones={
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-bold text-mahogany-700">
                                    {total} {total === 1 ? 'comprobante' : 'comprobantes'} · {formatearMoneda(resumen.ingresos)}
                                </span>
                            </div>
                        }
                    />
                    <CardBody className="p-0">
                        <DataTable
                            columnas={columnasComprobantes}
                            filas={comprobantes}
                            keyExtractor={(fila) => fila.id_comprobante}
                            acciones={(fila) =>
                                accionesComprobante(fila, {
                                    onVer: setComprobanteVer,
                                    onImprimir: setComprobanteImprimir,
                                    onEnviarEmail: handleEnviarEmail,
                                    enviando: enviandoEmail === fila.id_comprobante,
                                })
                            }
                        />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

            <ComprobanteViewModal
                comprobante={comprobanteVer}
                abierto={Boolean(comprobanteVer)}
                onCerrar={() => setComprobanteVer(null)}
            />
            <ComprobanteViewModal
                comprobante={comprobanteImprimir}
                abierto={Boolean(comprobanteImprimir)}
                onCerrar={() => setComprobanteImprimir(null)}
                autoImprimir
            />
        </div>
    );
}
