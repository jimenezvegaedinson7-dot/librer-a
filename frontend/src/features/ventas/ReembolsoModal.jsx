import { useState } from 'react';

import { FaRotateLeft } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { formatearMoneda } from '../../lib/utils/format';

import { reembolsarVenta } from './ventasService';
import { textoMetodoPago } from './metodosPago';

// Reembolso de una venta pagada o entregada. Deja registro del motivo,
// devuelve el stock y anula el comprobante emitido. El dinero se devuelve
// por el mismo medio del cobro (en pedidos PayU, desde el panel de PayU).
// Se monta al abrirla: cada apertura empieza con el formulario limpio.
export default function ReembolsoModal({ venta, abierto, onCerrar, onReembolsada }) {
    const [motivo, setMotivo] = useState('');
    const [devolverStock, setDevolverStock] = useState(false);
    const [referencia, setReferencia] = useState('');
    const [evidencia, setEvidencia] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    if (!abierto || !venta) return null;

    const entregada = venta.estado === 'entregada' || ['en_camino', 'entregado'].includes(venta.estado_entrega) || (venta.origen === 'reserva' && venta.id_reserva);
    const aprobacionTardia = venta.pago_revision_motivo === 'aprobacion_tardia';
    const esPayU = !venta.origen || venta.origen === 'app';
    const conComprobante = Number(venta.tiene_comprobante ?? 0) === 1;

    const enviar = async (e) => {
        e.preventDefault();
        const texto = motivo.trim();
        if (texto.length < 5) {
            setError('Describe el motivo del reembolso (al menos 5 caracteres)');
            return;
        }
        try {
            setGuardando(true);
            setError('');
            const respuesta = await reembolsarVenta(venta.id_venta, {
                motivo: texto,
                devolverStock: !aprobacionTardia && (entregada ? devolverStock : true),
                referencia,
                evidencia,
            });
            if (onReembolsada) await onReembolsada(respuesta);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo registrar el reembolso');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal
            abierto={abierto}
            titulo="Reembolsar venta"
            subtitulo={`Venta #${venta.id_venta} · ${formatearMoneda(Number(venta.total || 0))}`}
            onCerrar={onCerrar}
        >
            <form onSubmit={enviar} className="space-y-4">
                <Alert tipo="warning">
                    {esPayU
                        ? 'Devuelve el dinero al cliente desde el panel de PayU. Aquí solo queda registrado el reembolso.'
                        : `Devuelve el dinero por el mismo medio del cobro${venta.metodo_pago ? ` (${textoMetodoPago(venta.metodo_pago)})` : ''}.`}
                </Alert>

                <Textarea
                    label="Motivo del reembolso"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. El cliente devolvió el libro por fallas de impresión"
                    rows="3"
                    maxLength={255}
                    disabled={guardando}
                    requerido
                />

                <Input label="Referencia de la devolución (opcional)" value={referencia}
                    onChange={e => setReferencia(e.target.value)} maxLength={100} disabled={guardando}/>
                <Textarea label="Evidencia o detalle de la devolución (opcional)" value={evidencia}
                    onChange={e => setEvidencia(e.target.value)} maxLength={500} rows="2" disabled={guardando}/>

                {aprobacionTardia ? <p className="text-sm text-slate-600">El stock ya se liberó al cancelar el pedido. No se ingresará nuevamente.</p> : entregada ? (
                    <label className="flex items-start gap-3 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={devolverStock}
                            onChange={(e) => setDevolverStock(e.target.checked)}
                            disabled={guardando}
                            className="mt-0.5 h-4 w-4"
                        />
                        <span>
                            El cliente devolvió los libros: volver a ingresarlos al inventario.
                        </span>
                    </label>
                ) : (
                    <p className="text-sm text-slate-600">
                        Los libros no salieron de la tienda: vuelven al inventario.
                    </p>
                )}

                {conComprobante && (
                    <p className="text-sm text-slate-600">
                        Su comprobante quedará <strong>anulado</strong>. Emite la nota de crédito en SUNAT y
                        registra su número desde Comprobantes.
                    </p>
                )}

                {error && <Alert tipo="error">{error}</Alert>}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                    <Button variante="secondary" type="button" onClick={onCerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" variante="danger" cargando={guardando}>
                        <FaRotateLeft /> {guardando ? 'Registrando...' : 'Registrar reembolso'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
