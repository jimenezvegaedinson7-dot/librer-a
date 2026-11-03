import { useEffect, useRef, useState } from 'react';

import { FaPrint, FaReceipt } from 'react-icons/fa6';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { CargandoPantalla } from '../ui/Spinner';

import { montoEnLetras } from '../lib/utils/numeroALetras';

import { obtenerComprobante } from './comprobantesService';
import { obtenerEmpresa } from '../configuracion/empresaService';
import { emisorHistorico } from './emisorHistorico';
import { correoVisible } from '../lib/utils/cuentas';
import { useImpresion } from '../lib/hooks/useImpresion';

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
    const documentoRef = useRef(null);
    const { imprimir, imprimiendo, errorImpresion } = useImpresion(documentoRef);
    const idComprobante = comprobante?.id_comprobante;
    const listo = abierto && !cargando && !error && detalle && String(detalle.id_comprobante) === String(idComprobante);

    useEffect(() => {
        if (!abierto) return undefined;
        if (!idComprobante) return undefined;

        let activo = true;
        const cargar = async () => {
            try {
                setCargando(true);
                setError('');
                const [datos, datosEmpresa] = await Promise.all([
                    obtenerComprobante(idComprobante),
                    obtenerEmpresa().catch(() => null),
                ]);
                if (!activo) return;
                if (!datos || String(datos.id_comprobante) !== String(idComprobante)) throw new Error('Comprobante no disponible');
                setDetalle(datos);
                setEmpresa(datosEmpresa || {});
            } catch (err) {
                if (activo) {
                    setError(err.response?.data?.mensaje || 'Error al obtener el comprobante');
                    setDetalle(null);
                }
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargar();
        return () => { activo = false; };
    }, [abierto, idComprobante]);

    useEffect(() => {
        impresoRef.current = false;
    }, [abierto, idComprobante]);

    useEffect(() => {
        if (!autoImprimir || !listo) return undefined;
        if (impresoRef.current) return undefined;
        const t = setTimeout(() => {
            if (impresoRef.current) return;
            impresoRef.current = true;
            imprimir();
        }, 200);
        return () => clearTimeout(t);
    }, [autoImprimir, listo, imprimir]);

    if (!abierto) return null;

    const esFactura = detalle?.tipo === 'factura';
    // Denominación temporal: el sistema aún no emite el comprobante
    // electrónico ante SUNAT, así que boletas y facturas no se presentan como
    // documento electrónico oficial.
    const tipoLabel = 'COMPROBANTE DE VENTA';

    const empresaData = emisorHistorico(detalle || {}, empresa);

    const numeroSerie = `${detalle?.serie || ''}-${String(detalle?.numero ?? '').padStart(8, '0')}`;

    const clienteNombre = detalle?.cliente_nombre || '—';
    const clienteTipoDoc = detalle?.cliente_tipo_documento || (esFactura ? 'RUC' : 'DNI');
    const clienteDoc = detalle?.cliente_dni_ruc || '';
    const clienteCorreo = correoVisible(detalle?.cliente_email) || correoVisible(detalle?.correo_compra) || '—';

    const detalles = Array.isArray(detalle?.detalle) ? detalle.detalle : [];

    const costoEnvio = Number(detalle?.costo_envio || 0);
    const total = Number(detalle?.total || 0);

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
                    <Button variante="secondary" onClick={onCerrar} disabled={imprimiendo}>Cerrar</Button>
                    <Button onClick={() => { impresoRef.current = true; imprimir(); }} icono={<FaPrint />} disabled={!listo} cargando={imprimiendo}>Imprimir</Button>
                </div>
            }
        >
            {(cargando || (!error && !listo && idComprobante)) && (
                <div className="py-10">
                    <CargandoPantalla texto="Cargando comprobante..." />
                </div>
            )}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}
            {errorImpresion && <Alert tipo="error">{errorImpresion}</Alert>}

            {listo && (
                <div
                    id="boleta-documento"
                    ref={documentoRef}
                    className="print-area comprobante-documento relative mx-auto w-full max-w-[1100px] border border-black bg-white p-3 text-[12px] font-sans text-black"
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
                    <div className="comprobante-cabecera border-b border-black pb-5">
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
                        <div className="comprobante-cliente">
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
                    <div className="comprobante-tabla"><table className="w-full border-collapse border border-black">
                        <thead>
                            <tr>
                                <th className="w-[10%] border-r border-black px-2 py-2 font-bold">Cantidad</th>
                                <th className="w-[14%] border-r border-black px-2 py-2 font-bold">Unidad Medida</th>
                                <th className="border-r border-black px-3 py-2 font-bold">Descripción</th>
                                <th className="w-[15%] border-r border-black px-2 py-2 font-bold">Valor Unitario</th>
                                <th className="w-[13%] border-r border-black px-2 py-2 font-bold">Descuento</th>
                                <th className="w-[17%] px-2 py-2 font-bold">Importe de Venta</th>
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
                    </table></div>

                    {/* ========================= */}
                    {/* PARTE INFERIOR             */}
                    {/* ========================= */}
                    <div className="comprobante-totales">
                        {/* MONTO EN LETRAS */}
                        <div className="flex items-end">
                            <p className="text-[16px] font-bold uppercase leading-snug">
                                SON: {montoLetras}
                            </p>
                        </div>

                        {/* TOTALES */}
                        <div className="border border-black p-2">
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
