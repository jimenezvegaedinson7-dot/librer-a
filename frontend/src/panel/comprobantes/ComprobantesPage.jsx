import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
    FaBan,
    FaCircleCheck,
    FaEye,
    FaMagnifyingGlass,
    FaPaperPlane,
    FaPrint,
    FaReceipt,
    FaRotate,
    FaXmark,
} from 'react-icons/fa6';

import { FaFileLines, FaFileInvoice, FaMoneyBillWave } from 'react-icons/fa6';
import { Indicador, Indicadores } from '../ui/Indicadores';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Form';
import { Alert } from '../ui/Alert';
import { ErrorCarga } from '../ui/ErrorCarga';
import { Pagination } from '../ui/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/TableSkeleton';
import { DataTable } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { BtnAccion } from '../ui/Acciones';
import { ConfirmarAccion } from '../ui/ConfirmarAccion';
import { useToast } from '../../app/providers/ToastProvider';

import { formatearMoneda, formatearFecha } from '../../compartido/lib/utils/format';
import { correoVisible } from '../lib/utils/cuentas';

import { listarComprobantes, obtenerResumen, enviarComprobanteEmail } from './comprobantesService';
import { envioAutomaticoActivo, guardarEnvioAutomatico } from './envioAutomatico';
import ComprobanteViewModal from './ComprobanteViewModal';
import { AnularComprobanteModal } from './AnularComprobanteModal';
import { useRol } from '../auth/useRol';

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
        className: 'tabla-col-principal',
        render: (fila) => (
            <p className="text-xs">
                <span className={`tabla-dato ${fila.estado === 'anulado' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {formatearSerieNumero(fila)}
                </span>
                <span className="tabla-nota">{badgeTipo(fila.tipo)} · {formatearFecha(fila.fecha_emision) || 'Sin fecha'}</span>
                {fila.estado === 'anulado' && (
                    <span className="ml-2 align-middle"><Badge color="danger">Anulado</Badge></span>
                )}
            </p>
        ),
    },
    {
        titulo: 'Cliente',
        className: 'tabla-col-principal',
        render: (fila) => (
            <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-700">{fila.cliente_nombre || 'Cliente sin nombre'}</span>
                {fila.cliente_dni_ruc && <span className="block text-xs text-slate-500">{fila.cliente_dni_ruc}</span>}
            </p>
        ),
    },
    {
        titulo: 'Total',
        alineacion: 'derecha',
        className: 'tabla-col-importe',
        render: (fila) => <span className="font-bold text-slate-700">{formatearMoneda(fila.total)}</span>,
    },
    {
        titulo: 'Correo',
        alineacion: 'centro',
        render: (fila) => {
            if (fila.estado === 'anulado') {
                return <span className="text-xs text-slate-400" title="Los comprobantes anulados no se envían">No aplica</span>;
            }
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
            return correoVisible(fila.email_destino)
                ? <span className="correo-estado correo-estado--pendiente" title={`Se enviará a ${fila.email_destino}`}>Pendiente</span>
                : <span className="correo-estado" title="El cliente no tiene correo registrado">Sin correo</span>;
        },
    },
];

function accionesComprobante(fila, { onVer, onImprimir, onEnviarEmail, enviando, onAnular, puedeAnular }) {
    const fueEnviado = fila.enviado_por_email;
    const anulado = fila.estado === 'anulado';
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
                        : correoVisible(fila.email_destino) ? 'Enviar por correo' : 'Sin correo registrado'
                }
                disabled={anulado || enviando || (!fueEnviado && !correoVisible(fila.email_destino))}
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
            {puedeAnular && !anulado && (
                <BtnAccion tipo="eliminar" onClick={() => onAnular(fila)} titulo="Anular comprobante (datos errados)">
                    <FaBan />
                </BtnAccion>
            )}
        </>
    );
}

export default function ComprobantesPage({ incrustado = false }) {
    const [parametros, setParametros] = useSearchParams();
    const idVenta = parametros.get('venta') || '';
    const revisionLista = useRef(0);
    const [comprobantes, setComprobantes] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [resumen, setResumen] = useState(null);
    const [cargandoResumen, setCargandoResumen] = useState(true);
    const [errorResumen, setErrorResumen] = useState('');

    const [busqueda, setBusqueda] = useState('');
    const [busquedaAplicada, setBusquedaAplicada] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [paginaActual, setPaginaActual] = useState(1);

    const [vistaComprobante, setVistaComprobante] = useState(null);
    const [enviandoEmail, setEnviandoEmail] = useState(null);
    const [reenviarConfirmar, setReenviarConfirmar] = useState(null);
    const [filtroEnvio, setFiltroEnvio] = useState('todos');
    const [pendientesEnvio, setPendientesEnvio] = useState(0);
    // Pendientes que sí tienen un correo al que enviar (excluye cuentas eliminadas).
    const [enviables, setEnviables] = useState(0);
    const [envioAuto, setEnvioAuto] = useState(() => envioAutomaticoActivo());
    const [confirmarLote, setConfirmarLote] = useState(false);
    const [enviandoLote, setEnviandoLote] = useState(null); // { actual, total }
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [comprobanteAnular, setComprobanteAnular] = useState(null);
    const { exito, error: mostrarError } = useToast();
    const { puedeAnularComprobantes } = useRol();

    const cargarComprobantes = async (estaVigente = () => true) => {
        const revision = ++revisionLista.current;
        try {
            setCargando(true);
            setError('');
            const resultado = await listarComprobantes({
                id_venta: idVenta || undefined,
                tipo: filtroTipo === 'todos' ? undefined : filtroTipo,
                q: busquedaAplicada.trim() || undefined,
                envio: filtroEnvio === 'todos' ? undefined : filtroEnvio,
                estado: filtroEstado === 'todos' ? undefined : filtroEstado,
                pagina: paginaActual,
                por_pagina: POR_PAGINA,
            });
            if (!estaVigente() || revision !== revisionLista.current) return;
            setComprobantes(resultado.comprobantes);
            setTotal(resultado.total);
            setTotalPaginas(resultado.paginas);
            if (paginaActual > resultado.paginas) {
                setPaginaActual(resultado.paginas);
            }
        } catch (err) {
            if (estaVigente() && revision === revisionLista.current) setError(err.response?.data?.mensaje || err.message || 'Error al cargar los comprobantes');
        } finally {
            if (estaVigente() && revision === revisionLista.current) setCargando(false);
        }
    };

    useEffect(() => {
        let vigente = true;
        cargarComprobantes(() => vigente);
        return () => { vigente = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busquedaAplicada, filtroTipo, filtroEnvio, filtroEstado, paginaActual, idVenta]);

    const cargarResumen = async () => {
        setCargandoResumen(true);
        setErrorResumen('');
        try {
            const datos = await obtenerResumen();
            setResumen({
                boletas: Number(datos.boletas || 0),
                facturas: Number(datos.facturas || 0),
                ingresos: Number(datos.ingresos || 0),
                anulados: Number(datos.anulados || 0),
            });
        } catch {
            setResumen(null);
            setErrorResumen('No se pudo cargar el resumen de comprobantes. Pulsa Actualizar para reintentar.');
        } finally {
            setCargandoResumen(false);
        }
        try {
            const pendientes = await listarComprobantes({ envio: 'pendiente', por_pagina: 100 });
            setPendientesEnvio(pendientes.total);
            setEnviables(pendientes.comprobantes.filter((c) => correoVisible(c.email_destino) && c.estado !== 'anulado').length);
        } catch {
            setPendientesEnvio(0);
            setEnviables(0);
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
        setFiltroEstado('todos');
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
            const conCorreo = lista.filter((c) => correoVisible(c.email_destino) && c.estado !== 'anulado');
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
        if (!correoVisible(comprobante?.email_destino)) {
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

    const hayFiltros = Boolean(busquedaAplicada || idVenta) || filtroTipo !== 'todos' || filtroEnvio !== 'todos' || filtroEstado !== 'todos';
    const referencia = hayFiltros || error ? undefined : total;

    const comprobanteActualizado = async (comprobante, mensaje) => {
        exito(mensaje);
        actualizar();
        return comprobante;
    };

    return (
        <div className="space-y-4">
            {!incrustado && <PageHeader
                titulo="Comprobantes de pago"
                descripcion="Boletas y facturas emitidas por las ventas"
                icono={<FaReceipt />}
            />}
            {idVenta && <div className="gestion-ventas__contexto">
                <p className="text-sm text-slate-700">Comprobantes de la venta <strong>#{idVenta}</strong></p>
                <Button variante="secondary" onClick={() => {
                    setPaginaActual(1);
                    setParametros(actuales => {
                        const siguientes = new URLSearchParams(actuales);
                        siguientes.delete('venta');
                        return siguientes;
                    });
                }}>Ver todos los comprobantes</Button>
            </div>}
            <Indicadores cargando={cargando || cargandoResumen} etiqueta="Resumen de comprobantes">
                <Indicador titulo="Comprobantes" valor={error ? 'No disponible' : total} icono={<FaReceipt />} tono="primary" detalle="Emitidos en el filtro" />
                <Indicador titulo="Boletas" valor={resumen?.boletas ?? 'No disponible'} icono={<FaFileLines />} tono="sky" detalle={hayFiltros ? 'Consumidores finales · global' : 'Para consumidores finales'} de={referencia} />
                <Indicador titulo="Facturas" valor={resumen?.facturas ?? 'No disponible'} icono={<FaFileInvoice />} tono="violet" detalle={hayFiltros ? 'Empresas con RUC · global' : 'Para empresas con RUC'} de={referencia} />
                <Indicador titulo="Importe emitido" valor={resumen?.ingresos ?? 'No disponible'} formato="moneda" icono={<FaMoneyBillWave />} tono="teal" detalle={hayFiltros ? 'Total emitido · global' : 'Comprobantes emitidos'} />
                {resumen?.anulados > 0 && (
                    <Indicador titulo="Anulados" valor={resumen.anulados} icono={<FaBan />} tono="danger" detalle={hayFiltros ? 'Sin validez · global' : 'Sin validez'} de={referencia} />
                )}
            </Indicadores>
            {errorResumen && <Alert tipo="error">{errorResumen}</Alert>}

            <Card>
                <CardHeader
                    titulo="Filtros de comprobantes"
                    subtitulo="Busca por serie, número, cliente o documento"
                    acciones={<div className="tabla-filtros-acciones">
                        {hayFiltros && <Button variante="secondary" onClick={limpiarFiltros}>Limpiar</Button>}
                        <Button variante="secondary" onClick={actualizar} disabled={cargando}><FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}</Button>
                    </div>}
                    filtros={
                        <div className="filtros-grid">
                            <div className="filtro-busqueda-envio"><div className="filtro-busqueda">
                                <Input
                                    label="Serie, número o cliente"
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
                            </div><Button variante="secondary" onClick={() => aplicarBusqueda(busqueda)} disabled={cargando}>Buscar</Button></div>

                            <Select label="Tipo de comprobante" value={filtroTipo} onChange={(e) => cambiarTipo(e.target.value)}>
                                <option value="todos">Todos los tipos</option>
                                <option value="boleta">Boletas</option>
                                <option value="factura">Facturas</option>
                            </Select>

                            <Select
                                label="Estado del comprobante"
                                value={filtroEstado}
                                onChange={(e) => {
                                    setFiltroEstado(e.target.value);
                                    setPaginaActual(1);
                                }}
                                className="sm:w-52"
                                aria-label="Filtrar por estado"
                            >
                                <option value="todos">Todos los estados</option>
                                <option value="emitido">Emitidos</option>
                                <option value="anulado">Anulados</option>
                            </Select>

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
                        disabled={enviables === 0 || Boolean(enviandoLote)}
                        cargando={Boolean(enviandoLote)}
                    >
                        {enviandoLote
                            ? `Enviando ${enviandoLote.actual} de ${enviandoLote.total}…`
                            : <><FaPaperPlane /> Enviar pendientes{enviables > 0 ? ` (${enviables})` : ''}</>}
                    </Button>
                </div>
            </section>

            {cargando && <TableSkeleton columnas={5} filas={8} titulo />}

            {!cargando && error && <ErrorCarga mensaje={error} onReintentar={actualizar} />}

            {!cargando && !error && total === 0 && !hayFiltros && (
                <EmptyState
                    titulo="No hay comprobantes emitidos"
                    descripcion="Los comprobantes se generan al emitir boletas o facturas desde el módulo de ventas."
                    icono={<FaReceipt />}
                />
            )}

            {!cargando && !error && comprobantes.length === 0 && (total > 0 || hayFiltros) && (
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
                                    {total} {total === 1 ? 'comprobante' : 'comprobantes'}{resumen ? ` · ${formatearMoneda(resumen.ingresos)}` : ''}
                                </span>
                            </div>
                        }
                    />
                    <CardBody className="p-0">
                        <DataTable
                            etiqueta="Comprobantes emitidos"
                            columnas={columnasComprobantes}
                            filas={comprobantes}
                            keyExtractor={(fila) => fila.id_comprobante}
                            acciones={(fila) =>
                                accionesComprobante(fila, {
                                    onVer: comprobante => setVistaComprobante({ comprobante, imprimir: false }),
                                    onImprimir: comprobante => setVistaComprobante({ comprobante, imprimir: true }),
                                    onEnviarEmail: handleEnviarEmail,
                                    enviando: enviandoEmail === fila.id_comprobante,
                                    onAnular: setComprobanteAnular,
                                    puedeAnular: puedeAnularComprobantes,
                                })
                            }
                        />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

            {vistaComprobante && <ComprobanteViewModal
                key={vistaComprobante.comprobante.id_comprobante}
                comprobante={vistaComprobante.comprobante} abierto
                onCerrar={() => setVistaComprobante(null)} autoImprimir={vistaComprobante.imprimir}
            />}
            {comprobanteAnular && (
                <AnularComprobanteModal
                    comprobante={comprobanteAnular}
                    abierto
                    onCerrar={() => setComprobanteAnular(null)}
                    onAnulado={(c) => comprobanteActualizado(c, 'Comprobante anulado. Ya puedes emitir uno nuevo desde Ventas.')}
                />
            )}

            <ConfirmarAccion
                abierto={confirmarLote}
                titulo="Enviar comprobantes pendientes"
                mensaje={enviables === 1
                    ? 'Se enviará por correo el comprobante pendiente que tiene correo registrado.'
                    : `Se enviarán por correo los ${enviables} comprobantes pendientes que tienen correo registrado.`}
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
