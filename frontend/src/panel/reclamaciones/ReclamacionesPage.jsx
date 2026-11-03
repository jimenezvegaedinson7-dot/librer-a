import { useRef, useState } from 'react';
import { FaBook, FaEye, FaMagnifyingGlass, FaPrint, FaReply, FaRotate, FaHourglassHalf, FaClock, FaTriangleExclamation } from 'react-icons/fa6';
import { Indicador, Indicadores } from '../ui/Indicadores';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Form';
import { Alert } from '../ui/Alert';
import { ErrorCarga } from '../ui/ErrorCarga';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/TableSkeleton';
import { DataTable } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { BtnAccion } from '../ui/Acciones';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { useToast } from '../../app/providers/ToastContext';
import { useImpresion } from '../lib/hooks/useImpresion';
import { formatearFecha, formatearMoneda } from '../../compartido/lib/utils/format';
import { listarReclamaciones, obtenerResumenReclamaciones, responderReclamacion } from './reclamacionesService';
import { useCarga } from '../lib/hooks/useCarga';

const hoyLima = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

function diasRestantes(fechaLimite) {
    if (!fechaLimite) return null;
    const hoy = new Date(`${hoyLima()}T00:00:00Z`);
    const limite = new Date(`${fechaLimite}T00:00:00Z`);
    if (Number.isNaN(limite.getTime())) return null;
    return Math.round((limite - hoy) / 86400000);
}

function Plazo({ fila }) {
    if (fila.estado === 'respondido') {
        return <Badge color="success">Respondida</Badge>;
    }
    const dias = diasRestantes(fila.fecha_limite);
    if (dias === null) return <span className="text-xs text-slate-600">Sin fecha límite</span>;
    const fecha = new Date(`${fila.fecha_limite}T12:00:00`).toLocaleDateString('es-PE');
    if (dias < 0)
        return (
            <span title={`Venció el ${fecha}`}>
                <Badge color="danger">Vencida</Badge>
            </span>
        );
    if (dias <= 3)
        return (
            <span title={`Vence el ${fecha}`}>
                <Badge color="warning">{dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`}</Badge>
            </span>
        );
    return <span className="text-xs text-slate-600">Hasta el {fecha}</span>;
}

const columnas = [
    { titulo: 'Hoja', render: (f) => <span className="font-mono text-xs font-bold text-slate-700">{f.numero}</span> },
    { titulo: 'Fecha', alineacion: 'centro', render: (f) => <span className="text-xs text-slate-700">{formatearFecha(f.fecha_registro)}</span> },
    {
        titulo: 'Consumidor',
        render: (f) => (
            <p className="text-sm">
                <span className="block font-semibold text-slate-800">{f.consumidor_nombre}</span>
                <span className="block text-xs text-slate-500">
                    {f.consumidor_tipo_documento} {f.consumidor_documento}
                </span>
            </p>
        )
    },
    { titulo: 'Tipo', alineacion: 'centro', render: (f) => <Badge color={f.tipo === 'queja' ? 'info' : 'primary'}>{f.tipo === 'queja' ? 'Queja' : 'Reclamo'}</Badge> },
    { titulo: 'Plazo', alineacion: 'centro', render: (f) => <Plazo fila={f} /> }
];

function Hoja({ r, documentoRef }) {
    const limite = r.fecha_limite ? new Date(`${r.fecha_limite}T12:00:00`) : null;
    const fila = (etiqueta, valor) => (
        <div className="grid grid-cols-1 gap-1 border-b border-slate-200 py-2 text-sm sm:grid-cols-[170px_1fr] sm:gap-2 print:grid-cols-[170px_1fr]">
            <span className="text-slate-500">{etiqueta}</span>
            <span className="min-w-0 whitespace-pre-line break-words text-slate-900">{valor || '—'}</span>
        </div>
    );
    return (
        <div ref={documentoRef} id="hoja-reclamacion" className="print-area">
            <h3 className="mb-2 font-title text-lg font-semibold">Hoja de reclamación N.° {r.numero}</h3>
            {fila('Fecha de registro', formatearFecha(r.fecha_registro))}
            {fila('Plazo de respuesta', limite && !Number.isNaN(limite.getTime()) ? limite.toLocaleDateString('es-PE') : '')}
            {fila('Consumidor', r.consumidor_nombre)}
            {fila('Documento', [r.consumidor_tipo_documento, r.consumidor_documento].filter(Boolean).join(' '))}
            {fila('Domicilio', r.consumidor_domicilio)}
            {fila('Teléfono', r.consumidor_telefono)}
            {fila('Correo', r.consumidor_email)}
            {r.es_menor && fila('Padre, madre o apoderado', r.apoderado_nombre)}
            {fila('Bien contratado', r.bien_descripcion ? `${r.bien_tipo === 'servicio' ? 'Servicio' : 'Producto'}: ${r.bien_descripcion}` : '')}
            {fila('Monto reclamado', r.monto_reclamado != null && r.monto_reclamado !== '' && Number.isFinite(Number(r.monto_reclamado)) ? formatearMoneda(r.monto_reclamado) : '')}
            {fila('N.° de pedido', r.id_venta ? `#${r.id_venta}` : '')}
            {fila('Tipo', r.tipo === 'queja' ? 'Queja' : 'Reclamo')}
            {fila('Detalle', r.detalle)}
            {fila('Pedido del consumidor', r.pedido)}
            {r.estado === 'respondido' && (
                <>
                    {fila('Respuesta del proveedor', r.respuesta)}
                    {fila('Fecha de respuesta', formatearFecha(r.fecha_respuesta))}
                </>
            )}
        </div>
    );
}

function HojaModal({ reclamacion, onCerrar, onRespondida }) {
    const [respuesta, setRespuesta] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const documentoRef = useRef(null);
    const { imprimir, imprimiendo, errorImpresion } = useImpresion(documentoRef);

    const enviar = async (e) => {
        e.preventDefault();
        if (respuesta.trim().length < 10) {
            setError('Escribe la respuesta (al menos 10 caracteres)');
            return;
        }
        try {
            setGuardando(true);
            setError('');
            const res = await responderReclamacion(reclamacion.id_reclamacion, respuesta.trim());
            await onRespondida(res);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo registrar la respuesta');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal
            abierto
            titulo="Libro de Reclamaciones"
            subtitulo={`Hoja N.° ${reclamacion.numero}`}
            onCerrar={onCerrar}
            grande
            footer={
                <div className="no-print flex gap-2">
                    <Button variante="secondary" onClick={onCerrar}>
                        Cerrar
                    </Button>
                    <Button variante="secondary" onClick={imprimir} cargando={imprimiendo}>
                        <FaPrint /> Imprimir
                    </Button>
                </div>
            }>
            {errorImpresion && <Alert tipo="error">{errorImpresion}</Alert>}
            <Hoja r={reclamacion} documentoRef={documentoRef} />
            {reclamacion.estado === 'pendiente' && (
                <form onSubmit={enviar} className="no-print mt-5 space-y-3 border-t border-slate-200 pt-5">
                    <Textarea
                        label="Respuesta al consumidor"
                        value={respuesta}
                        onChange={(e) => setRespuesta(e.target.value)}
                        rows="5"
                        maxLength={3000}
                        placeholder="Explica qué harás para atender el reclamo. Se enviará a su correo y quedará en el libro."
                        requerido
                    />
                    {error && <Alert tipo="error">{error}</Alert>}
                    <div className="flex justify-end">
                        <Button type="submit" cargando={guardando}>
                            <FaReply /> {guardando ? 'Enviando...' : 'Responder y enviar'}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}

export default function ReclamacionesPage() {
    const { exito, error: mostrarError } = useToast();
    const [lista, setLista] = useState([]);
    const [resumen, setResumen] = useState({ total: 0, pendientes: 0, vencidos: 0, por_vencer: 0 });
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [estado, setEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [abierta, setAbierta] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [paginas, setPaginas] = useState(1);
    const [total, setTotal] = useState(0);
    const [avisoResumen, setAvisoResumen] = useState('');
    const solicitud = useRef(0);

    const cargar = async (estaVigente = () => true) => {
        const turno = ++solicitud.current;
        try {
            setCargando(true);
            setError('');

            let resumenFallo = false;
            const [datos, res] = await Promise.all([
                listarReclamaciones({ estado: estado === 'todos' ? undefined : estado, q: busqueda.trim() || undefined, pagina, por_pagina: 20 }),
                obtenerResumenReclamaciones().catch(() => {
                    resumenFallo = true;
                    return null;
                })
            ]);
            if (!estaVigente() || turno !== solicitud.current) return;
            setLista(datos.reclamaciones);
            setTotal(datos.total);
            setPaginas(datos.paginas);
            if (pagina > datos.paginas) setPagina(datos.paginas);
            if (res) setResumen(res);
            setAvisoResumen(resumenFallo ? 'No se pudo actualizar el resumen de arriba. La lista de hojas sí está al día.' : '');
        } catch (err) {
            if (estaVigente() && turno === solicitud.current) setError(err.response?.data?.mensaje || 'Error al cargar el libro de reclamaciones');
        } finally {
            if (estaVigente() && turno === solicitud.current) setCargando(false);
        }
    };

    useCarga(cargar, JSON.stringify([estado, busqueda, pagina]), true, 250);
    const filtradas = lista;

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Libro de Reclamaciones"
                descripcion="Reclamos y quejas de los consumidores: respóndelos en un plazo no mayor a 15 días hábiles"
                icono={<FaBook />}
            />
            <Indicadores cargando={cargando} error={error} etiqueta="Resumen de reclamaciones">
                <Indicador titulo="Hojas" valor={resumen.total} icono={<FaBook />} tono="primary" detalle="Registradas en el libro" />
                <Indicador titulo="Pendientes" valor={resumen.pendientes} icono={<FaHourglassHalf />} tono="sky" detalle="Por responder" de={resumen.total} />
                <Indicador titulo="Por vencer" valor={resumen.por_vencer} icono={<FaClock />} tono="warning" detalle="Cerca del plazo de 15 días hábiles" de={resumen.total} />
                <Indicador titulo="Vencidas" valor={resumen.vencidos} icono={<FaTriangleExclamation />} tono="danger" detalle="Fuera de plazo" de={resumen.total} />
            </Indicadores>

            <Card>
                <CardHeader
                    titulo={`Hojas registradas · ${total} resultados`}
                    subtitulo="Consulta y responde las hojas de reclamación recibidas."
                    acciones={
                        <div className="tabla-filtros-acciones">
                            <Button variante="secondary" onClick={() => cargar()} disabled={cargando}>
                                <FaRotate /> Actualizar
                            </Button>
                        </div>
                    }
                    filtros={
                        <div className="filtros-grid filtros-grid--dos">
                            <Input
                                label="Hoja o consumidor"
                                value={busqueda}
                                onChange={(e) => {
                                    setBusqueda(e.target.value);
                                    setPagina(1);
                                }}
                                placeholder="Buscar hoja o consumidor..."
                                icono={<FaMagnifyingGlass />}
                            />
                            <Select
                                label="Estado de la reclamación"
                                value={estado}
                                onChange={(e) => {
                                    setEstado(e.target.value);
                                    setPagina(1);
                                }}
                                aria-label="Filtrar por estado">
                                <option value="todos">Todas</option>
                                <option value="pendiente">Pendientes</option>
                                <option value="vencido">Vencidas</option>
                                <option value="respondido">Respondidas</option>
                            </Select>
                        </div>
                    }
                />
                <CardBody className="p-0">
                    {cargando && <TableSkeleton columnas={5} filas={5} />}
                    {avisoResumen && (
                        <div className="px-4 pt-4">
                            <Alert tipo="warning">{avisoResumen}</Alert>
                        </div>
                    )}
                    {!cargando && error && (
                        <div className="p-4">
                            <ErrorCarga mensaje={error} onReintentar={() => cargar()} />
                        </div>
                    )}
                    {!cargando && !error && filtradas.length === 0 && (
                        <EmptyState titulo="Sin hojas" descripcion="No hay hojas de reclamación con este filtro." icono={<FaBook />} />
                    )}
                    {!cargando && !error && filtradas.length > 0 && (
                        <DataTable
                            etiqueta="Hojas de reclamación registradas"
                            columnas={columnas}
                            filas={filtradas}
                            keyExtractor={(f) => f.id_reclamacion}
                            acciones={(f) => (
                                <BtnAccion tipo="ver" onClick={() => setAbierta(f)} titulo={f.estado === 'pendiente' ? 'Ver y responder' : 'Ver hoja'}>
                                    {f.estado === 'pendiente' ? <FaReply /> : <FaEye />}
                                </BtnAccion>
                            )}
                        />
                    )}
                </CardBody>
                {!error && <Pagination pagina={pagina} totalPaginas={paginas} onCambiarPagina={setPagina} />}
            </Card>

            {abierta && (
                <HojaModal
                    reclamacion={abierta}
                    onCerrar={() => setAbierta(null)}
                    onRespondida={async (res) => {
                        (res?.enviado === false ? mostrarError : exito)(res?.mensaje || 'Respuesta registrada');
                        await cargar();
                    }}
                />
            )}
        </div>
    );
}
