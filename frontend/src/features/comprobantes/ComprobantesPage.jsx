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
import { ConfirmarAccion } from '../../components/ui/ConfirmarAccion';
import { useToast } from '../../components/providers/ToastProvider';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';

import { listarComprobantes, obtenerResumen, enviarComprobanteEmail } from './comprobantesService';
import { envioAutomaticoActivo, guardarEnvioAutomatico } from './envioAutomatico';
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
            <span className="font-mono text-xs font-bold tracking-wide text-slate-700">{formatearSerieNumero(fila)}</span>
        ),
    },
    { titulo: 'Tipo', alineacion: 'centro', render: (fila) => badgeTipo(fila.tipo) },
    {
        titulo: 'Cliente',
        render: (fila) => (
            <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-700">{fila.cliente_nombre || 'Sin nombre'}</span>
                {fila.cliente_dni_ruc && <span className="block text-xs text-slate-500">{fila.cliente_dni_ruc}</span>}
            </p>
        ),
    },
    {
        titulo: 'Total',
        alineacion: 'centro',
        render: (fila) => <span className="font-bold text-slate-700">{formatearMoneda(fila.total)}</span>,
    },
    {
        titulo: 'Correo',
        alineacion: 'centro',
        render: (fila) => {
            if (fila.enviado_por_email) {
                return (
                    <span
                        className="correo-estado correo-estado--enviado"
                        title={fila.fecha_envio_email ? `Enviado el ${formatearFecha(fila.fecha_envio_email)}` : 'Enviado'}
                    >
                        Enviado
                    </span>
                );
            }
            return fila.email_destino
                ? <span className="correo-estado correo-estado--pendiente" title={`Se enviará a ${fila.email_destino}`}>Pendiente</span>
                : <span className="correo-estado" title="El cliente no tiene correo registrado">Sin correo</span>;
        },
    },
    {
        titulo: 'Fecha',
        alineacion: 'centro',
        render: (fila) => (
            <span className="text-xs font-medium text-slate-700">{formatearFecha(fila.fecha_emision) || 'Sin fecha'}</span>
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
                onClick={() => onEnviarEmail(fila, fueEnviado)}
                titulo={
                    fueEnviado
                        ? `Enviado${fila.fecha_envio_email ? ` el ${formatearFecha(fila.fecha_envio_email)}` : ''} · clic para reenviar`
                        : fila.email_destino ? 'Enviar por correo' : 'Sin correo registrado'
                }
                disabled={enviando || (!fueEnviado && !fila.email_destino)}
                className={fueEnviado ? 'btn-enviado' : ''}
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
    const [reenviarConfirmar, setReenviarConfirmar] = useState(null);
    const [filtroEnvio, setFiltroEnvio] = useState('todos');
    const [pendientesEnvio, setPendientesEnvio] = useState(0);
    const [envioAuto, setEnvioAuto] = useState(() => envioAutomaticoActivo());
    const [confirmarLote, setConfirmarLote] = useState(false);
    const [enviandoLote, setEnviandoLote] = useState(null); // { actual, total }
    const { exito, error: mostrarError } = useToast();

    const cargarComprobantes = async () => {
        try {
            setCargando(true);
            setError('');
            const resultado = await listarComprobantes({
                tipo: filtroTipo === 'todos' ? undefined : filtroTipo,
                q: busquedaAplicada.trim() || undefined,
                envio: filtroEnvio === 'todos' ? undefined : filtroEnvio,
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
    }, [busquedaAplicada, filtroTipo, filtroEnvio, paginaActual]);

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
        try {
            const pendientes = await listarComprobantes({ envio: 'pendiente', por_pagina: 1 });
            setPendientesEnvio(pendientes.total);
        } catch {
            setPendientesEnvio(0);
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
        setFiltroEnvio('todos');
        setPaginaActual(1);
    };

    const cambiarEnvio = (valor) => {
        setFiltroEnvio(valor);
        setPaginaActual(1);
    };

    const alternarEnvioAuto = () => {
        const activo = !envioAuto;
        setEnvioAuto(activo);
        guardarEnvioAutomatico(activo);
        exito(activo
            ? 'Envío automático activado: los comprobantes se enviarán al emitirlos'
            : 'Envío automático desactivado');
    };

    // Envía, uno a uno, todos los comprobantes pendientes que tienen correo.
    const enviarPendientes = async () => {
        setConfirmarLote(false);
        try {
            const { comprobantes: lista } = await listarComprobantes({ envio: 'pendiente', por_pagina: 100 });
            const conCorreo = lista.filter((c) => c.email_destino);
            let enviados = 0;
            let fallidos = 0;
            setEnviandoLote({ actual: 0, total: conCorreo.length });
            for (const [i, comprobante] of conCorreo.entries()) {
                try {
                    await enviarComprobanteEmail(comprobante.id_comprobante);
                    enviados += 1;
                } catch {
                    fallidos += 1;
                }
                setEnviandoLote({ actual: i + 1, total: conCorreo.length });
            }
            const sinCorreo = lista.length - conCorreo.length;
            const partes = [`${enviados} enviados`];
            if (fallidos) partes.push(`${fallidos} con error`);
            if (sinCorreo) partes.push(`${sinCorreo} sin correo`);
            (fallidos ? mostrarError : exito)(`Envío terminado: ${partes.join(' · ')}`);
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'No se pudieron enviar los comprobantes pendientes');
        } finally {
            setEnviandoLote(null);
            actualizar();
        }
    };

    const handleEnviarEmail = async (comprobante, fueEnviado) => {
        if (!comprobante?.email_destino) {
            mostrarError('No hay correo registrado para este cliente');
            return;
        }
        if (fueEnviado) {
            setReenviarConfirmar(comprobante);
            return;
        }
        try {
            setEnviandoEmail(comprobante.id_comprobante);
            const resultado = await enviarComprobanteEmail(comprobante.id_comprobante);
            exito(resultado?.mensaje || 'Comprobante enviado correctamente');
            actualizar();
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al enviar el comprobante');
        } finally {
            setEnviandoEmail(null);
        }
    };

    const confirmarReenvio = async () => {
        if (!reenviarConfirmar) return;
        const comprobante = reenviarConfirmar;
        setReenviarConfirmar(null);
        try {
            setEnviandoEmail(comprobante.id_comprobante);
            const resultado = await enviarComprobanteEmail(comprobante.id_comprobante);
            exito(resultado?.mensaje || 'Comprobante reenviado correctamente');
            actualizar();
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al reenviar el comprobante');
        } finally {
            setEnviandoEmail(null);
        }
    };

    const hayFiltros = Boolean(busquedaAplicada) || filtroTipo !== 'todos' || filtroEnvio !== 'todos';

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Comprobantes de pago"
                descripcion="Boletas y facturas emitidas por las ventas"
                icono={<FaReceipt />}
                acciones={
                    <div className="summary-strip flex flex-wrap gap-2">
                        <span className="rounded-xl border border-[#e6e0d7] bg-white px-4 py-2.5 text-sm font-medium text-[#433c35] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            Total: <span className="font-bold text-[#1c1814]">{total}</span>
                        </span>
                        <span className="rounded-xl border border-[#e6e0d7] bg-[#faf8f5] px-4 py-2.5 text-sm font-medium text-[#5c544b] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            Boletas: <span className="font-bold text-[#2c2621]">{resumen.boletas}</span>
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition hover:text-slate-700"
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

            <section className="correo-panel" aria-label="Envío por correo">
                <div className="correo-filtros" role="radiogroup" aria-label="Filtrar por envío">
                    {[
                        { valor: 'todos', texto: 'Todos' },
                        { valor: 'enviado', texto: 'Enviados' },
                        { valor: 'pendiente', texto: 'Pendientes de envío', conteo: pendientesEnvio },
                    ].map((f) => (
                        <button
                            key={f.valor}
                            type="button"
                            role="radio"
                            aria-checked={filtroEnvio === f.valor}
                            onClick={() => cambiarEnvio(f.valor)}
                            className={`correo-filtro ${filtroEnvio === f.valor ? 'correo-filtro--activo' : ''}`}
                        >
                            {f.texto}
                            {f.conteo > 0 && <span className="correo-filtro-conteo">{f.conteo}</span>}
                        </button>
                    ))}
                </div>

                <div className="correo-controles">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={envioAuto}
                        onClick={alternarEnvioAuto}
                        className={`interruptor ${envioAuto ? 'interruptor--activo' : ''}`}
                    >
                        <span className="interruptor-pista" aria-hidden="true"><span className="interruptor-bola" /></span>
                        <span className="text-left">
                            <span className="interruptor-texto">Envío automático</span>
                            <span className="interruptor-detalle">{envioAuto ? 'Se envía al emitir' : 'Desactivado'}</span>
                        </span>
                    </button>

                    <Button
                        variante="secondary"
                        onClick={() => setConfirmarLote(true)}
                        disabled={pendientesEnvio === 0 || Boolean(enviandoLote)}
                        cargando={Boolean(enviandoLote)}
                    >
                        {enviandoLote
                            ? `Enviando ${enviandoLote.actual} de ${enviandoLote.total}…`
                            : <><FaPaperPlane /> Enviar pendientes{pendientesEnvio > 0 ? ` (${pendientesEnvio})` : ''}</>}
                    </Button>
                </div>
            </section>

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
                                <span className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
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

            <ConfirmarAccion
                abierto={confirmarLote}
                titulo="Enviar comprobantes pendientes"
                mensaje={`Se enviarán por correo los ${pendientesEnvio} comprobantes que aún no se han enviado.`}
                advertencia="Los que no tengan correo registrado se omitirán."
                icono={<FaPaperPlane />}
                textoConfirmar="Enviar ahora"
                onCerrar={() => setConfirmarLote(false)}
                onConfirmar={enviarPendientes}
            />

            <ConfirmarAccion
                abierto={Boolean(reenviarConfirmar)}
                titulo="Reenviar comprobante"
                mensaje={`Este comprobante ya fue enviado por correo a ${reenviarConfirmar?.email_destino}. ¿Desea enviarlo nuevamente?`}
                textoConfirmar="Si, enviar de nuevo"
                variante="primary"
                onCerrar={() => setReenviarConfirmar(null)}
                onConfirmar={confirmarReenvio}
                cargando={Boolean(enviandoEmail)}
            />
        </div>
    );
}
