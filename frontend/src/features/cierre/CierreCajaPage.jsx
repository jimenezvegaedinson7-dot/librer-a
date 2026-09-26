import { useEffect, useState } from 'react';

import { FaCashRegister, FaPrint, FaRotate } from 'react-icons/fa6';

import client from '../../lib/api/client';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { formatearMoneda } from '../../lib/utils/format';

import { textoMetodoPago } from '../ventas/metodosPago';

const hoyLima = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

const textoMedio = (medio) => (medio === 'payu' ? 'PayU (app)' : textoMetodoPago(medio));

const ESTADOS = {
    pagada: { texto: 'Pagada', color: 'success' },
    entregada: { texto: 'Entregada', color: 'info' },
    reembolsada: { texto: 'Reembolsada', color: 'neutral' },
};

// ============================================================
// CIERRE DE CAJA DEL DÍA (hora de Perú)
// Cobros por medio de pago, reembolsos y neto. El efectivo contado se
// compara con el esperado; no se guarda: el cierre se imprime.
// ============================================================
export default function CierreCajaPage() {
    const [fecha, setFecha] = useState(hoyLima);
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [contado, setContado] = useState('');

    const [version, setVersion] = useState(0);

    // Consulta del día: el estado se actualiza al llegar la respuesta.
    useEffect(() => {
        let activo = true;
        client
            .get('/reportes/cierre-caja', { params: { fecha } })
            .then((res) => {
                if (!activo) return;
                setDatos(res?.data || null);
                setError('');
            })
            .catch((err) => {
                if (activo) setError(err.response?.data?.mensaje || 'Error al obtener el cierre de caja');
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => {
            activo = false;
        };
    }, [fecha, version]);

    const cambiarFecha = (valor) => {
        if (!valor || valor === fecha) return;
        setCargando(true);
        setContado('');
        setFecha(valor);
    };

    const actualizar = () => {
        setCargando(true);
        setVersion((v) => v + 1);
    };

    const efectivo = datos?.por_medio?.find((m) => m.medio === 'efectivo');
    const esperadoEfectivo = efectivo ? efectivo.neto : 0;
    const diferencia = contado === '' ? null : Math.round((Number(contado) - esperadoEfectivo) * 100) / 100;

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Cierre de caja"
                descripcion="Lo cobrado en el día por medio de pago, los reembolsos y el neto"
                icono={<FaCashRegister />}
                acciones={
                    <div className="no-print flex flex-wrap items-end gap-2">
                        <Input type="date" value={fecha} max={hoyLima()} onChange={(e) => cambiarFecha(e.target.value)} aria-label="Día del cierre" />
                        <Button variante="secondary" onClick={actualizar} disabled={cargando}><FaRotate /> Actualizar</Button>
                        <Button onClick={() => window.print()} disabled={!datos}><FaPrint /> Imprimir</Button>
                    </div>
                }
            />

            {cargando && <TableSkeleton columnas={5} filas={4} titulo />}
            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && datos && (
                <div className="print-area space-y-4">
                    <p className="hidden text-sm print:block">
                        Cierre de caja del {new Date(`${datos.fecha}T12:00:00`).toLocaleDateString('es-PE')}
                    </p>
                    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Totales del día">
                        {[
                            { t: 'Cobrado', v: datos.totales.cobrado, d: `${datos.totales.cobros} ${datos.totales.cobros === 1 ? 'venta' : 'ventas'}` },
                            { t: 'Reembolsado', v: datos.totales.reembolsado, d: `${datos.totales.reembolsos} ${datos.totales.reembolsos === 1 ? 'reembolso' : 'reembolsos'}` },
                            { t: 'Neto del día', v: datos.totales.neto, d: 'Cobrado − reembolsado', fuerte: true },
                        ].map((k) => (
                            <div key={k.t} className={`rounded-xl border p-4 ${k.fuerte ? 'border-[#7a2530]/40 bg-[#fbf7f0]' : 'border-slate-200 bg-white'}`}>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.t}</p>
                                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{formatearMoneda(k.v)}</p>
                                <p className="text-xs text-slate-500">{k.d}</p>
                            </div>
                        ))}
                    </section>

                    <Card>
                        <CardHeader titulo="Por medio de pago" subtitulo="PayU se liquida en la cuenta; el resto se cobró en tienda" />
                        <CardBody>
                            {datos.por_medio.length === 0 ? (
                                <p className="text-sm text-slate-500">No hubo cobros ni reembolsos este día.</p>
                            ) : (
                                <div className="tabla-reporte overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-left">Medio</th>
                                                <th className="text-right">Cobrado</th>
                                                <th className="text-right">Reembolsado</th>
                                                <th className="text-right">Neto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datos.por_medio.map((m) => (
                                                <tr key={m.medio}>
                                                    <td className="font-semibold">{textoMedio(m.medio)} <span className="text-xs font-normal text-slate-500">({m.cobros})</span></td>
                                                    <td className="text-right tabular-nums">{formatearMoneda(m.cobrado)}</td>
                                                    <td className="text-right tabular-nums">{m.reembolsado ? `− ${formatearMoneda(m.reembolsado)}` : '—'}</td>
                                                    <td className="text-right font-semibold tabular-nums">{formatearMoneda(m.neto)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="mt-5 grid grid-cols-1 items-end gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Efectivo esperado en caja</p>
                                    <p className="text-xl font-semibold tabular-nums">{formatearMoneda(esperadoEfectivo)}</p>
                                </div>
                                <Input
                                    label="Efectivo contado"
                                    type="number"
                                    min="0"
                                    step="0.10"
                                    value={contado}
                                    onChange={(e) => setContado(e.target.value)}
                                    placeholder="0.00"
                                />
                                <div aria-live="polite">
                                    {diferencia !== null && (
                                        <p className={`text-sm font-semibold ${diferencia === 0 ? 'text-emerald-700' : diferencia > 0 ? 'text-sky-700' : 'text-red-700'}`}>
                                            {diferencia === 0
                                                ? 'Cuadra exacto'
                                                : diferencia > 0
                                                  ? `Sobran ${formatearMoneda(diferencia)}`
                                                  : `Faltan ${formatearMoneda(-diferencia)}`}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            titulo="Ventas cobradas del día"
                            subtitulo={`Comprobantes emitidos: ${datos.comprobantes.emitidos}${datos.comprobantes.sin_sunat ? ` · ${datos.comprobantes.sin_sunat} sin N.° SUNAT` : ''}`}
                        />
                        <CardBody className="p-0">
                            {datos.ventas.length === 0 ? (
                                <p className="p-5 text-sm text-slate-500">Sin ventas cobradas este día.</p>
                            ) : (
                                <div className="tabla-reporte overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-left">Hora</th>
                                                <th className="text-left">Venta</th>
                                                <th className="text-left">Cliente</th>
                                                <th className="text-left">Medio</th>
                                                <th className="text-center">Estado</th>
                                                <th className="text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datos.ventas.map((v) => (
                                                <tr key={v.id_venta}>
                                                    <td className="tabular-nums">{v.hora}</td>
                                                    <td>#{v.id_venta}</td>
                                                    <td>{v.cliente}</td>
                                                    <td>
                                                        {textoMedio(v.medio)}
                                                        {(v.referencia_pago || v.payu_order_id) && (
                                                            <span className="block text-xs text-slate-500">Op. {v.referencia_pago || v.payu_order_id}</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        <Badge color={ESTADOS[v.estado]?.color || 'neutral'}>{ESTADOS[v.estado]?.texto || v.estado}</Badge>
                                                    </td>
                                                    <td className="text-right font-semibold tabular-nums">{formatearMoneda(v.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
}
