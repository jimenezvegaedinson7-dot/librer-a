import { useEffect, useRef, useState } from 'react';

import { FaPrint, FaReceipt } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { CargandoPantalla } from '../../components/ui/Spinner';

import { formatearFecha } from '../../lib/utils/format';
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
        right: 0 !important; width: 100% !important; max-width: 100% !important;
        margin: 0 !important; border: none !important; border-radius: 0 !important;
        box-shadow: none !important; overflow: visible !important;
        background: white !important;
    }
    .no-print { display: none !important; }
}
`;

function formatearSerieNumero(comprobante) {
    const serie = String(comprobante?.serie ?? '');
    const numero = String(comprobante?.numero ?? '');
    return `${serie}-${numero.padStart(8, '0')}`;
}

function formatearMonedaPlain(valor) {
    return `S/ ${Number(valor || 0).toFixed(2)}`;
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

    const emisorRuc = detalle?.ruc || empresa.ruc || '';
    const emisorRazonSocial = detalle?.razon_social || empresa.razon_social || '—';
    const emisorNombreComercial = empresa.nombre_comercial || '';
    const emisorDireccion = empresa.direccion || '';

    const esFactura = detalle?.tipo === 'factura';
    const tipoTitulo = esFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA';
    const prefijoSerie = esFactura ? 'F' : 'B';

    const clienteNombre = detalle?.cliente_nombre || '—';
    const clienteDoc = detalle?.cliente_dni_ruc || '';
    const clienteTipoDoc = detalle?.cliente_tipo_documento || (esFactura ? 'RUC' : 'DNI');
    const clienteEmail = detalle?.cliente_email || detalle?.correo_compra || '';

    const items = Array.isArray(detalle?.detalle) ? detalle.detalle : [];
    const subtotal = Number(detalle?.subtotal || 0);
    const igv = Number(detalle?.igv || 0);
    const costoEnvio = Number(detalle?.costo_envio || 0);
    const total = Number(detalle?.total || 0);

    const opGravada = igv > 0 ? subtotal : 0;
    const opExonerada = igv > 0 ? 0 : subtotal;

    const serieDisplay = formatearSerieNumero(detalle);
    const serieCorta = detalle?.serie || `${prefijoSerie}001`;
    const numeroDisplay = String(detalle?.numero ?? '').padStart(8, '0');

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
                <div className="print-area mx-auto w-full max-w-[800px] border border-slate-700 bg-white p-4 text-[12px] text-slate-950">

                    {/* ====== CABECERA ====== */}
                    <div className="grid grid-cols-[1fr_260px] gap-4 border-b-2 border-slate-700 pb-4">
                        {/* Emisor */}
                        <div>
                            <p className="text-[15px] font-bold leading-tight text-slate-900">
                                {emisorRazonSocial}
                            </p>
                            {emisorNombreComercial && (
                                <p className="text-[11px] text-slate-600">{emisorNombreComercial}</p>
                            )}
                            {emisorDireccion && (
                                <p className="mt-0.5 text-[11px] text-slate-600">{emisorDireccion}</p>
                            )}
                            <p className="mt-0.5 text-[11px] text-slate-600">
                                RUC: <span className="font-bold">{emisorRuc || '—'}</span>
                            </p>
                        </div>

                        {/* Cuadro comprobante */}
                        <div className="flex flex-col items-center justify-center border-2 border-slate-900 p-3 text-center">
                            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-900">
                                {tipoTitulo}
                            </p>
                            <div className="my-1 h-px w-full bg-slate-400" />
                            <p className="text-[11px] text-slate-700">
                                RUC: <span className="font-bold">{emisorRuc || '—'}</span>
                            </p>
                            <p className="mt-1 font-mono text-[15px] font-bold tracking-wider text-slate-900">
                                {serieDisplay}
                            </p>
                        </div>
                    </div>

                    {/* ====== DATOS CLIENTE ====== */}
                    <div className="border-b border-slate-400 py-3">
                        <table className="w-full text-[12px]">
                            <tbody>
                                <tr>
                                    <td className="w-32 py-0.5 font-bold text-slate-700">Fecha de emisión:</td>
                                    <td className="py-0.5 text-slate-900">{fechaEmision(detalle?.fecha_emision)}</td>
                                    <td className="w-32 py-0.5 font-bold text-slate-700">Tipo de moneda:</td>
                                    <td className="py-0.5 text-slate-900">SOLES</td>
                                </tr>
                                <tr>
                                    <td className="py-0.5 font-bold text-slate-700">Señor(es):</td>
                                    <td className="py-0.5 text-slate-900" colSpan={3}>{clienteNombre}</td>
                                </tr>
                                <tr>
                                    <td className="py-0.5 font-bold text-slate-700">Documento:</td>
                                    <td className="py-0.5 text-slate-900" colSpan={3}>
                                        {clienteDoc ? `${clienteTipoDoc} - ${clienteDoc}` : '—'}
                                    </td>
                                </tr>
                                {clienteEmail && (
                                    <tr>
                                        <td className="py-0.5 font-bold text-slate-700">Correo:</td>
                                        <td className="py-0.5 text-slate-900" colSpan={3}>{clienteEmail}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ====== TABLA DETALLE ====== */}
                    <div className="border-b border-slate-400">
                        <table className="w-full border-collapse text-[12px]">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="w-14 border border-slate-500 px-2 py-2 text-center text-[10px] font-bold uppercase">CANT.</th>
                                    <th className="w-14 border border-slate-500 px-2 py-2 text-center text-[10px] font-bold uppercase">UND.</th>
                                    <th className="border border-slate-500 px-2 py-2 text-left text-[10px] font-bold uppercase">DESCRIPCIÓN</th>
                                    <th className="w-24 border border-slate-500 px-2 py-2 text-right text-[10px] font-bold uppercase">V. UNIT.</th>
                                    <th className="w-20 border border-slate-500 px-2 py-2 text-right text-[10px] font-bold uppercase">DSCTO.</th>
                                    <th className="w-24 border border-slate-500 px-2 py-2 text-right text-[10px] font-bold uppercase">IMPORTE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? items.map((item, i) => (
                                    <tr key={item.id_libro ?? i}>
                                        <td className="border border-slate-400 px-2 py-2 text-center">{item.cantidad}</td>
                                        <td className="border border-slate-400 px-2 py-2 text-center">UND</td>
                                        <td className="border border-slate-400 px-2 py-2 text-left">{item.titulo || 'Sin título'}</td>
                                        <td className="border border-slate-400 px-2 py-2 text-right">{formatearMonedaPlain(item.precio_unitario)}</td>
                                        <td className="border border-slate-400 px-2 py-2 text-right">0.00</td>
                                        <td className="border border-slate-400 px-2 py-2 text-right font-semibold">{formatearMonedaPlain(item.subtotal)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="border border-slate-400 px-2 py-6 text-center text-slate-500">
                                            Sin detalle registrado.
                                        </td>
                                    </tr>
                                )}
                                {/* Filas vacias para completar */}
                                {items.length > 0 && items.length < 6 && Array.from({ length: 6 - items.length }).map((_, i) => (
                                    <tr key={`empty-${i}`}>
                                        <td className="border border-slate-400 px-2 py-2">&nbsp;</td>
                                        <td className="border border-slate-400 px-2 py-2" />
                                        <td className="border border-slate-400 px-2 py-2" />
                                        <td className="border border-slate-400 px-2 py-2" />
                                        <td className="border border-slate-400 px-2 py-2" />
                                        <td className="border border-slate-400 px-2 py-2" />
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ====== TOTALES ====== */}
                    <div className="grid grid-cols-[1fr_300px] gap-4 border-b border-slate-400 py-3">
                        <div className="flex items-end">
                            <p className="text-[11px] italic text-slate-600">
                                SON: {montoEnLetras(total)}
                            </p>
                        </div>
                        <div className="border border-slate-400 text-[12px]">
                            <div className="flex justify-between border-b border-slate-300 px-3 py-1">
                                <span className="text-slate-600">Op. Gravada</span>
                                <span className="font-semibold">{formatearMonedaPlain(opGravada)}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-300 px-3 py-1">
                                <span className="text-slate-600">Op. Exonerada</span>
                                <span className="font-semibold">{formatearMonedaPlain(opExonerada)}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-300 px-3 py-1">
                                <span className="text-slate-600">Op. Inafecta</span>
                                <span className="font-semibold">S/ 0.00</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-300 px-3 py-1">
                                <span className="text-slate-600">IGV (18%)</span>
                                <span className="font-semibold">{formatearMonedaPlain(igv)}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-300 px-3 py-1">
                                <span className="text-slate-600">Otros Cargos</span>
                                <span className="font-semibold">S/ 0.00</span>
                            </div>
                            {costoEnvio > 0 && (
                                <div className="flex justify-between border-b border-slate-300 px-3 py-1">
                                    <span className="text-slate-600">Costo Envío</span>
                                    <span className="font-semibold">{formatearMonedaPlain(costoEnvio)}</span>
                                </div>
                            )}
                            <div className="flex justify-between bg-slate-100 px-3 py-2">
                                <span className="font-bold uppercase text-slate-900">Importe Total</span>
                                <span className="font-bold text-slate-900">{formatearMonedaPlain(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ====== PIE ====== */}
                    <div className="pt-3 text-center text-[10px] text-slate-500">
                        Representación impresa del comprobante electrónico.
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
