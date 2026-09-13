import { useEffect, useRef, useState } from 'react';

import { FaPrint, FaReceipt } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { CargandoPantalla } from '../../components/ui/Spinner';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';

import { obtenerComprobante } from './comprobantesService';
import { obtenerEmpresa } from '../configuracion/empresaService';

const CSS_IMPRESION = `
@media print {
    body * {
        visibility: hidden !important;
    }
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .print-area,
    .print-area * {
        visibility: visible !important;
    }
    .print-area {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        right: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;
    }
}
`;

function formatearSerieNumero(comprobante) {
    const serie = String(comprobante?.serie ?? '');
    const numero = String(comprobante?.numero ?? '');
    return `${serie}-${numero.padStart(8, '0')}`;
}

function FilaTotal({ etiqueta, valor, resaltado = false }) {
    return (
        <div className="flex w-full max-w-xs items-center justify-between text-sm">
            <span className={`${resaltado ? 'font-extrabold uppercase tracking-wide' : 'text-slate-600'} text-slate-800`}>
                {etiqueta}
            </span>
            <span className={`${resaltado ? 'text-lg font-extrabold' : 'font-semibold'} text-slate-900`}>{valor}</span>
        </div>
    );
}

export default function ComprobanteViewModal({
    comprobante,
    abierto,
    onCerrar,
    autoImprimir = false,
}) {
    const [detalle, setDetalle] = useState(null);
    const [empresa, setEmpresa] = useState({});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const impresoRef = useRef(false);

    useEffect(() => {
        if (!abierto) return undefined;
        if (!comprobante?.id_comprobante) return undefined;

        let activo = true;
        const cargar = async () => {
            try {
                setCargando(true);
                setError('');
                const [datos, datosEmpresa] = await Promise.all([
                    obtenerComprobante(comprobante.id_comprobante),
                    obtenerEmpresa().catch(() => null),
                ]);
                if (!activo) return;
                setDetalle(datos || comprobante);
                setEmpresa(datosEmpresa || {});
            } catch (err) {
                if (activo) {
                    setError(err.response?.data?.mensaje || 'Error al obtener el comprobante');
                    setDetalle(comprobante);
                }
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargar();
        return () => {
            activo = false;
        };
    }, [abierto, comprobante]);

    // Reinicia el flag de impresión automática al cerrar / cambiar de comprobante.
    useEffect(() => {
        if (!abierto) impresoRef.current = false;
    }, [abierto, comprobante?.id_comprobante]);

    useEffect(() => {
        if (!autoImprimir || !abierto || cargando || !detalle?.id_comprobante) return undefined;
        if (impresoRef.current) return undefined;

        impresoRef.current = true;
        const temporizador = setTimeout(() => window.print(), 200);
        return () => clearTimeout(temporizador);
    }, [autoImprimir, abierto, cargando, detalle]);

    if (!abierto) return null;

    // Fuente del emisor: el comprobante tiene prioridad, la empresa complementa.
    const emisorRuc = detalle?.ruc || empresa.ruc || '';
    const emisorRazonSocial = detalle?.razon_social || empresa.razon_social || '—';
    const emisorNombreComercial = empresa.nombre_comercial || '';
    const emisorDireccion = empresa.direccion || '';

    const tipoComprobante = detalle?.tipo === 'factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA';
    const mostrarIgv = Number(detalle?.igv || 0) > 0;

    return (
        <Modal
            abierto={abierto}
            titulo="Comprobante de pago"
            subtitulo={detalle ? formatearSerieNumero(detalle) : 'Boleta / Factura'}
            onCerrar={onCerrar}
            grande
            footer={
                <>
                    <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
                    <Button onClick={() => window.print()} icono={<FaPrint />}>Imprimir</Button>
                </>
            }
        >
            <style>{CSS_IMPRESION}</style>

            {cargando && (
                <div className="py-10">
                    <CargandoPantalla texto="Cargando comprobante..." />
                </div>
            )}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && detalle && (
                <div className="print-area overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                    {/* ENCABEZADO DEL EMISOR */}
                    <div className="flex flex-col gap-4 border-b-2 border-slate-800 bg-slate-50/60 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                RUC: <span className="font-extrabold text-slate-800">{emisorRuc || '—'}</span>
                            </p>
                            <h3 className="mt-1 text-lg font-extrabold text-slate-900">{emisorRazonSocial}</h3>
                            {emisorNombreComercial && <p className="text-sm text-slate-600">{emisorNombreComercial}</p>}
                            {emisorDireccion && <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{emisorDireccion}</p>}
                        </div>
                        <div className="shrink-0 rounded-lg bg-slate-900 px-4 py-3 text-right text-white">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{tipoComprobante}</p>
                            <p className="mt-1 font-mono text-sm font-bold tracking-wider">{formatearSerieNumero(detalle)}</p>
                        </div>
                    </div>

                    {/* DATOS DEL CLIENTE Y FECHA */}
                    <div className="grid grid-cols-1 gap-4 border-b border-slate-200 p-5 sm:grid-cols-2">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cliente</p>
                            <p className="mt-1 text-sm font-bold text-slate-800">{detalle.cliente_nombre || '—'}</p>
                            {detalle.cliente_dni_ruc && (
                                <p className="mt-0.5 text-xs text-slate-600">DNI/RUC: {detalle.cliente_dni_ruc}</p>
                            )}
                        </div>
                        <div className="sm:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Fecha de emisión</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                                {formatearFecha(detalle.fecha_emision) || '—'}
                            </p>
                        </div>
                    </div>

                    {/* DETALLE */}
                    <div className="overflow-x-auto border-b border-slate-200">
                        <table className="min-w-full">
                            <thead className="bg-slate-100">
                                <tr className="border-b border-slate-300">
                                    <th className="w-16 px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                        Cant.
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                        Descripción
                                    </th>
                                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                        P. Unit.
                                    </th>
                                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                        Subtotal
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {Array.isArray(detalle.detalle) && detalle.detalle.length > 0 ? (
                                    detalle.detalle.map((item, i) => (
                                        <tr key={item.id_libro ?? i}>
                                            <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{item.cantidad}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.titulo || 'Sin título'}</td>
                                            <td className="px-4 py-3 text-right text-sm text-slate-700">{formatearMoneda(item.precio_unitario)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{formatearMoneda(item.subtotal)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                                            Sin detalle registrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* TOTALES */}
                    <div className="flex flex-col items-end gap-1.5 bg-slate-50/60 p-5">
                        <FilaTotal etiqueta="Subtotal" valor={formatearMoneda(detalle.subtotal)} />
                        {Number(detalle.costo_envio) > 0 && (
                            <FilaTotal etiqueta="Costo de envío" valor={formatearMoneda(detalle.costo_envio)} />
                        )}
                        {mostrarIgv && <FilaTotal etiqueta="IGV incluido (18%)" valor={formatearMoneda(detalle.igv)} />}
                        <div className="mt-2 flex w-full max-w-xs items-center justify-between border-t-2 border-slate-800 pt-2">
                            <span className="text-sm font-extrabold uppercase tracking-wide text-slate-900">TOTAL</span>
                            <span className="text-lg font-extrabold text-slate-900">{formatearMoneda(detalle.total)}</span>
                        </div>
                    </div>
                </div>
            )}

            {!cargando && !error && !detalle && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <FaReceipt className="text-3xl text-slate-300" />
                    <p className="text-sm text-slate-600">No hay información del comprobante.</p>
                </div>
            )}
        </Modal>
    );
}
