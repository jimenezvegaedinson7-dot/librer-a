import { useState } from 'react';

import { FaBan, FaFloppyDisk } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { anularComprobante, registrarSunat } from './comprobantesService';

const FORMATO_SUNAT = /^[A-Za-z0-9]{4}-\d{1,8}$/;

const serieNumero = (c) => `${c?.serie ?? ''}-${String(c?.numero ?? '').padStart(8, '0')}`;

const validarSunat = (valor) => !valor.trim() || FORMATO_SUNAT.test(valor.trim());

// ------------------------------------------------------------
// Registrar el comprobante electrónico emitido en SUNAT (portal SOL)
// que respalda al comprobante interno.
// ------------------------------------------------------------
export function RegistrarSunatModal({ comprobante, abierto, onCerrar, onGuardado }) {
    // Se monta al abrirla: parte de los datos ya registrados.
    const [numero, setNumero] = useState(comprobante?.numero_sunat || '');
    const [nota, setNota] = useState(comprobante?.nota_credito_sunat || '');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    if (!abierto || !comprobante) return null;

    const anulado = comprobante.estado === 'anulado';
    const esFactura = comprobante.tipo === 'factura';

    const enviar = async (e) => {
        e.preventDefault();
        if (!numero.trim() && !nota.trim()) {
            setError('Escribe el número del comprobante SUNAT');
            return;
        }
        if (!validarSunat(numero) || !validarSunat(nota)) {
            setError('Usa la serie y el número, por ejemplo EB01-125 o E001-40');
            return;
        }
        try {
            setGuardando(true);
            setError('');
            const actualizado = await registrarSunat(comprobante.id_comprobante, {
                numeroSunat: numero,
                notaCreditoSunat: anulado ? nota : '',
            });
            if (onGuardado) await onGuardado(actualizado);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo="Comprobante electrónico SUNAT" subtitulo={`Comprobante interno ${serieNumero(comprobante)}`} onCerrar={onCerrar}>
            <form onSubmit={enviar} className="space-y-4">
                <p className="text-sm text-slate-600">
                    Emite la {esFactura ? 'factura' : 'boleta'} en el portal de SUNAT (Clave SOL) con los mismos datos y anota aquí su
                    serie y número, para que la venta quede enlazada con su comprobante legal.
                </p>
                <Input
                    label={`N.° de ${esFactura ? 'factura' : 'boleta'} SUNAT`}
                    value={numero}
                    onChange={(e) => setNumero(e.target.value.toUpperCase())}
                    placeholder={esFactura ? 'Ej. E001-40' : 'Ej. EB01-125'}
                    maxLength={13}
                    disabled={guardando}
                />
                {anulado && (
                    <Input
                        label="N.° de la nota de crédito SUNAT"
                        value={nota}
                        onChange={(e) => setNota(e.target.value.toUpperCase())}
                        placeholder="Ej. BC01-3"
                        maxLength={13}
                        disabled={guardando}
                    />
                )}
                {error && <Alert tipo="error">{error}</Alert>}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                    <Button variante="secondary" type="button" onClick={onCerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" cargando={guardando}>
                        <FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ------------------------------------------------------------
// Anular por datos errados: la venta sigue vigente y se puede emitir
// un comprobante nuevo. Para devolver dinero se usa "Reembolsar" en
// Ventas, que también anula el comprobante.
// ------------------------------------------------------------
export function AnularComprobanteModal({ comprobante, abierto, onCerrar, onAnulado }) {
    const [motivo, setMotivo] = useState('');
    const [nota, setNota] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    if (!abierto || !comprobante) return null;

    const enviar = async (e) => {
        e.preventDefault();
        if (motivo.trim().length < 5) {
            setError('Describe el motivo de la anulación (al menos 5 caracteres)');
            return;
        }
        if (!validarSunat(nota)) {
            setError('Nota de crédito no válida. Ejemplo: BC01-3');
            return;
        }
        try {
            setGuardando(true);
            setError('');
            const actualizado = await anularComprobante(comprobante.id_comprobante, {
                motivo,
                notaCreditoSunat: nota,
            });
            if (onAnulado) await onAnulado(actualizado);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo anular el comprobante');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo="Anular comprobante" subtitulo={serieNumero(comprobante)} onCerrar={onCerrar}>
            <form onSubmit={enviar} className="space-y-4">
                <Alert tipo="warning">
                    Úsalo solo si el comprobante tiene datos errados: la venta sigue vigente y podrás emitir uno nuevo. Para devolver
                    el dinero usa «Reembolsar» en Ventas.
                </Alert>
                <Textarea
                    label="Motivo de la anulación"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. DNI del cliente equivocado"
                    rows="2"
                    maxLength={255}
                    disabled={guardando}
                    requerido
                />
                <Input
                    label="N.° de la nota de crédito SUNAT (si ya la emitiste)"
                    value={nota}
                    onChange={(e) => setNota(e.target.value.toUpperCase())}
                    placeholder="Ej. BC01-3"
                    maxLength={13}
                    disabled={guardando}
                />
                {error && <Alert tipo="error">{error}</Alert>}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                    <Button variante="secondary" type="button" onClick={onCerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" variante="danger" cargando={guardando}>
                        <FaBan /> {guardando ? 'Anulando...' : 'Anular comprobante'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
