import { useEffect, useRef, useState } from 'react';

import { FaPrint, FaReceipt } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { CargandoPantalla } from '../../components/ui/Spinner';

import { montoEnLetras } from '../../lib/utils/numeroALetras';

import { obtenerComprobante } from './comprobantesService';
import { obtenerEmpresa } from '../configuracion/empresaService';

const CSS_IMPRESION = `
@media print {
    body * { visibility: hidden !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .print-area, .print-area * { visibility: visible !important; }
    .print-area {
        position: fixed !important; left: 0 !important; top: 0 !important;
        margin: 0 auto !important;
        overflow: visible !important;
        background: white !important;
    }
    .no-print { display: none !important; }
}
`;

function formatMoney(value) {
    return Number(value || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fechaEmision(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return '—';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
}

function TotalFila({ label, value, strong = false }) {
    return (
        <div className="grid grid-cols-[1fr_160px] items-center">
            <div className={`px-3 py-2 text-right ${strong ? 'font-bold' : ''}`}>
                {label} :
            </div>
            <div className={`border border-black px-3 py-2 text-right ${strong ? 'font-bold' : ''}`}>
                S/ {formatMoney(value)}
            </div>
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
        return () => { activo = false; };
    }, [abierto, comprobante]);

    useEffect(() => {
        if (!abierto) impresoRef.current = false;
    }, [abierto, comprobante?.id_comprobante]);

    useEffect(() => {
        if (!autoImprimir || !abierto || cargando || !detalle?.id_comprobante) return undefined;
        if (impresoRef.current) return undefined;
        impresoRef.current = true;
        const t = setTimeout(() => window.print(), 200);
        return () => clearTimeout(t);
    }, [autoImprimir, abierto, cargando, detalle]);

    if (!abierto) return null;

    const esFactura = detalle?.tipo === 'factura';
    // Denominación temporal: el sistema aún no emite el comprobante
    // electrónico ante SUNAT, así que boletas y facturas no se presentan como
    // documento electrónico oficial.
    const tipoLabel = 'COMPROBANTE DE VENTA';

    const empresaData = {
        ruc: empresa.ruc || detalle?.ruc || '',
        razon_social: empresa.razon_social || detalle?.razon_social || '',
        nombre_comercial: empresa.nombre_comercial || '',
        direccion: empresa.direccion || '',
    };

    const numeroSerie = `${detalle?.serie || ''}-${String(detalle?.numero ?? '').padStart(8, '0')}`;

    const clienteNombre = detalle?.cliente_nombre || '—';
    const clienteTipoDoc = detalle?.cliente_tipo_documento || (esFactura ? 'RUC' : 'DNI');
    const clienteDoc = detalle?.cliente_dni_ruc || '';
    const clienteCorreo = detalle?.cliente_email || detalle?.correo_compra || '—';

    const detalles = Array.isArray(detalle?.detalle) ? detalle.detalle : [];

    const igvVal = Number(detalle?.igv || 0);
    const costoEnvio = Number(detalle?.costo_envio || 0);
    const total = Number(detalle?.total || 0);

    // Desglose calculado por el backend (utils/impuestos): libros exonerados
    // mientras rija la Ley 31053 y envío gravado. Siempre cumple
    // gravada + exonerada + IGV = total. Comprobantes antiguos sin desglose:
    // se deriva del IGV registrado.
    const tieneDesglose = Number(detalle?.op_gravada || 0) + Number(detalle?.op_exonerada || 0) > 0;
    const opGravada = tieneDesglose ? Number(detalle.op_gravada || 0) : igvVal > 0 ? total - igvVal : 0;
    const opExonerada = tieneDesglose ? Number(detalle.op_exonerada || 0) : igvVal > 0 ? 0 : total;
    const anulado = detalle?.estado === 'anulado';

    const montoLetras = montoEnLetras(total);

    return (
        <Modal
            abierto={abierto}
            titulo=""
            subtitulo=""
            onCerrar={onCerrar}
            grande
            footer={
                <div className="no-print flex gap-2">
                    <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
                    <Button onClick={() => window.print()} icono={<FaPrint />}>Imprimir</Button>
                </div>
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
                <div
                    id="boleta-documento"
                    className="print-area relative mx-auto w-full max-w-[1100px] border border-black bg-white p-3 text-[12px] font-sans text-black"
                >
                    {anulado && (
                        <div
                            className="pointer-events-none absolute inset-0 flex items-center justify-center"
                            aria-hidden="true"
                        >
                            <span className="-rotate-12 rounded-lg border-4 border-red-600 px-6 py-2 text-[48px] font-black tracking-[0.2em] text-red-600 opacity-40">
                                ANULADO
                            </span>
                        </div>
                    )}
                    {/* ========================= */}
                    {/* CABECERA                   */}
                    {/* ========================= */}
                    <div className="grid grid-cols-[1fr_300px] gap-6 border-b border-black pb-5">
                        <div>
                            <h1 className="text-[20px] font-bold uppercase leading-tight">
                                {empresaData.razon_social || '—'}
                            </h1>
                            {empresaData.nombre_comercial && (
                                <p className="mt-1 text-[13px]">{empresaData.nombre_comercial}</p>
                            )}
                            {empresaData.direccion && (
                                <p className="mt-1 text-[12px]">{empresaData.direccion}</p>
                            )}
                        </div>

                        <div className="border-2 border-black px-3 py-2 text-center">
                            <div className="text-[14px] font-bold uppercase">{tipoLabel}</div>
                            <div className="mt-1 text-[12px] font-bold">
                                RUC: {empresaData.ruc || '—'}
                            </div>
                            <div className="mt-1 text-[16px] font-bold tracking-wide">
                                {numeroSerie}
                            </div>
                            {detalle?.numero_sunat && (
                                <div className="mt-1 text-[11px]">
                                    Comprobante SUNAT: <strong>{detalle.numero_sunat}</strong>
                                </div>
                            )}
                            {detalle?.nota_credito_sunat && (
                                <div className="text-[11px]">
                                    Nota de crédito: <strong>{detalle.nota_credito_sunat}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    {anulado && (
                        <p className="mt-3 border border-red-600 px-3 py-2 text-[12px] font-semibold text-red-700">
                            Comprobante anulado{detalle?.motivo_anulacion ? `: ${detalle.motivo_anulacion}` : ''}
                        </p>
                    )}

                    {/* ========================= */}
                    {/* DATOS DEL COMPRADOR        */}
                    {/* ========================= */}
                    <div className="py-5">
                        <div className="grid grid-cols-[190px_20px_1fr] gap-y-2">
                            <span className="font-medium">Fecha de Emisión</span>
                            <span>:</span>
                            <span>{fechaEmision(detalle?.fecha_emision)}</span>

                            <span className="font-medium">Señor(es)</span>
                            <span>:</span>
                            <span>{clienteNombre}</span>

                            <span className="font-medium">Documento</span>
                            <span>:</span>
                            <span>
                                {clienteDoc
                                    ? `${clienteTipoDoc} - ${clienteDoc}`
                                    : '—'}
                            </span>

                            <span className="font-medium">Tipo de Moneda</span>
                            <span>:</span>
                            <span>SOLES</span>

                            <span className="font-medium">Correo</span>
                            <span>:</span>
                            <span>{clienteCorreo}</span>
                        </div>
                    </div>

                    {/* ========================= */}
                    {/* DETALLE                    */}
                    {/* ========================= */}
                    <table className="w-full border-collapse border border-black">
                        <thead>
                            <tr>
                                <th className="w-[90px] border-r border-black px-2 py-2 font-bold">Cantidad</th>
                                <th className="w-[130px] border-r border-black px-2 py-2 font-bold">Unidad Medida</th>
                                <th className="border-r border-black px-3 py-2 font-bold">Descripción</th>
                                <th className="w-[130px] border-r border-black px-2 py-2 font-bold">Valor Unitario</th>
                                <th className="w-[110px] border-r border-black px-2 py-2 font-bold">Descuento</th>
                                <th className="w-[150px] px-2 py-2 font-bold">Importe de Venta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item, index) => {
                                const cantidad = Number(item.cantidad || 0);
                                const precio = Number(item.precio_unitario ?? 0);
                                const descuento = Number(item.descuento || 0);
                                const importe = Number(item.subtotal ?? (cantidad * precio - descuento));

                                return (
                                    <tr
                                        key={item.id_detalle || item.id_libro || index}
                                        className="border-t border-black"
                                    >
                                        <td className="border-r border-black px-2 py-3 text-center">
                                            {cantidad.toFixed(2)}
                                        </td>
                                        <td className="border-r border-black px-2 py-3 text-center">
                                            UNIDAD
                                        </td>
                                        <td className="border-r border-black px-3 py-3">
                                            {item.titulo || '—'}
                                        </td>
                                        <td className="border-r border-black px-3 py-3 text-right">
                                            {formatMoney(precio)}
                                        </td>
                                        <td className="border-r border-black px-3 py-3 text-right">
                                            {formatMoney(descuento)}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {formatMoney(importe)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {costoEnvio > 0 && (
                                <tr className="border-t border-black">
                                    <td className="border-r border-black px-2 py-3 text-center">1.00</td>
                                    <td className="border-r border-black px-2 py-3 text-center">SERVICIO</td>
                                    <td className="border-r border-black px-3 py-3">Servicio de envío a domicilio</td>
                                    <td className="border-r border-black px-3 py-3 text-right">{formatMoney(costoEnvio)}</td>
                                    <td className="border-r border-black px-3 py-3 text-right">{formatMoney(0)}</td>
                                    <td className="px-3 py-3 text-right">{formatMoney(costoEnvio)}</td>
                                </tr>
                            )}
                            {detalles.length === 0 && (
                                <tr className="border-t border-black">
                                    <td colSpan={6} className="px-3 py-6 text-center">Sin detalle registrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* ========================= */}
                    {/* PARTE INFERIOR             */}
                    {/* ========================= */}
                    <div className="grid grid-cols-[1fr_360px] gap-10 pt-5">
                        {/* MONTO EN LETRAS */}
                        <div className="flex items-end pb-10">
                            <p className="text-[16px] font-bold uppercase leading-snug">
                                SON: {montoLetras}
                            </p>
                        </div>

                        {/* TOTALES */}
                        <div className="border border-black p-2">
                            <TotalFila label="Op. Gravada" value={opGravada} />
                            <TotalFila label="Op. Exonerada" value={opExonerada} />
                            <TotalFila label="Op. Inafecta" value={0} />
                            <TotalFila label="IGV" value={igvVal} />
                            <TotalFila label="Importe Total" value={total} strong />
                        </div>
                    </div>
                </div>
            )}

            {!cargando && !error && !detalle && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <FaReceipt className="text-3xl text-slate-300" />
                    <p className="text-sm text-slate-500">No hay información del comprobante.</p>
                </div>
            )}
        </Modal>
    );
}
