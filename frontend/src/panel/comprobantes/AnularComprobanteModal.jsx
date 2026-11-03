import { useRef, useState } from 'react';
import { FaBan } from 'react-icons/fa6';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Form';
import { Alert } from '../ui/Alert';
import { anularComprobante } from './comprobantesService';

export function AnularComprobanteModal({ comprobante, abierto, onCerrar, onAnulado }) {
    const [motivo, setMotivo] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const enCurso = useRef(false);
    if (!abierto || !comprobante) return null;

    const cerrar = () => { if (!enCurso.current) onCerrar(); };
    const enviar = async evento => {
        evento.preventDefault();
        if (enCurso.current) return;
        if (motivo.trim().length < 5) {
            setError('Describe el motivo de la anulación (al menos 5 caracteres)');
            return;
        }
        enCurso.current = true;
        setGuardando(true);
        setError('');
        try {
            const actualizado = await anularComprobante(comprobante.id_comprobante, { motivo });
            await onAnulado?.(actualizado);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo anular el comprobante');
        } finally {
            enCurso.current = false;
            setGuardando(false);
        }
    };

    return <Modal abierto titulo="Anular comprobante" subtitulo={`${comprobante.serie}-${String(comprobante.numero).padStart(8, '0')}`}
        onCerrar={cerrar} cerrarDeshabilitado={guardando}>
        <form onSubmit={enviar} className="space-y-4">
            <Alert tipo="warning">Úsalo si el comprobante tiene datos errados: la venta sigue vigente y podrás emitir uno nuevo. Para devolver el dinero usa la devolución en Ventas.</Alert>
            <Textarea label="Motivo de la anulación" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. DNI del cliente equivocado" rows="2" maxLength={255} disabled={guardando} requerido />
            {error && <Alert tipo="error">{error}</Alert>}
            <div className="flex flex-col-reverse gap-3 border-t border-primary-200 pt-5 sm:flex-row sm:justify-end">
                <Button variante="secondary" onClick={cerrar} disabled={guardando}>Cancelar</Button>
                <Button type="submit" variante="danger" cargando={guardando}><FaBan /> {guardando ? 'Anulando...' : 'Anular comprobante'}</Button>
            </div>
        </form>
    </Modal>;
}
