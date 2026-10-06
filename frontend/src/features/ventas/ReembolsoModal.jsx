import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { formatearMoneda } from '../../lib/utils/format';
import { reembolsarVenta } from './ventasService';

export default function ReembolsoModal({ venta, abierto, onCerrar, onReembolsada }) {
    const [motivo, setMotivo] = useState(venta?.motivo_reembolso || '');
    const [referencia, setReferencia] = useState('');
    const [evidencia, setEvidencia] = useState('');
    const [devolverStock, setDevolverStock] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    if (!abierto || !venta) return null;
    const confirmar = venta.estado_reembolso === 'pendiente_verificacion';
    const yaSalio = venta.estado === 'entregada' || ['en_camino', 'entregado'].includes(venta.estado_entrega);
    const enviar = async event => {
        event.preventDefault();
        if (guardando) return;
        if (confirmar && (referencia.trim().length < 3 || evidencia.trim().length < 10)) {
            setError('Introduce la referencia PayU y evidencia verificable de la devolución externa.'); return;
        }
        try {
            setGuardando(true); setError('');
            const res = await reembolsarVenta(venta.id_venta, { accion: confirmar ? 'confirmar' : 'solicitar',
                motivo, referencia, evidencia, devolverStock });
            await onReembolsada?.(res); onCerrar();
        } catch (err) { setError(err.response?.data?.mensaje || 'No se pudo registrar la devolución'); }
        finally { setGuardando(false); }
    };
    return <Modal abierto={abierto} onCerrar={onCerrar}
        titulo={confirmar ? 'Verificar devolución externa PayU' : 'Solicitar devolución PayU'}
        subtitulo={`Venta #${venta.id_venta} · ${formatearMoneda(Number(venta.total || 0))}`}>
        <form onSubmit={enviar} className="space-y-4">
            <Alert tipo="warning">{confirmar
                ? 'Devuelve y verifica el dinero en PayU antes de confirmar. Esta API solo registra tu verificación documental; no ejecuta ni verifica automáticamente la devolución.'
                : 'La solicitud queda pendiente de verificación. No devuelve dinero, no repone stock y no anula comprobantes.'}</Alert>
            <Textarea label="Motivo de la devolución" value={motivo} onChange={e => setMotivo(e.target.value)}
                minLength={5} maxLength={255} rows="3" requerido required disabled={guardando}/>
            {confirmar && <>
                <Input label="Referencia de devolución PayU" value={referencia} onChange={e => setReferencia(e.target.value)}
                    minLength={3} maxLength={100} requerido required disabled={guardando}/>
                <Textarea label="Evidencia verificable de la devolución" value={evidencia} onChange={e => setEvidencia(e.target.value)}
                    placeholder="Referencia al comprobante del proveedor, enlace o detalle que permita verificar la devolución"
                    minLength={10} maxLength={500} rows="3" requerido required disabled={guardando}/>
                {venta.pago_revision_motivo === 'aprobacion_tardia'
                    ? <p>El stock ya se liberó al cancelar; no se ingresará nuevamente.</p>
                    : yaSalio ? <label className="flex items-start gap-3 text-sm">
                        <input type="checkbox" checked={devolverStock} onChange={e => setDevolverStock(e.target.checked)} disabled={guardando}/>
                        El cliente devolvió los libros y están disponibles para vender.
                    </label> : <p>Al confirmar se liberará el stock de los libros que no salieron.</p>}
                {Number(venta.tiene_comprobante) === 1 && <p>El comprobante interno se anulará al confirmar. Gestiona la nota de crédito externa en SUNAT.</p>}
            </>}
            {error && <Alert tipo="error">{error}</Alert>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variante="secondary" onClick={onCerrar} disabled={guardando}>Cerrar</Button>
                <Button type="submit" variante="danger" cargando={guardando}>
                    {confirmar ? 'Confirmar verificación documental' : 'Registrar solicitud pendiente'}
                </Button>
            </div>
        </form>
    </Modal>;
}
