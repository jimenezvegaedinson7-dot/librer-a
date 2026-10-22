import { useEffect, useRef, useState } from 'react';
import { FaFloppyDisk, FaPenToSquare, FaRotate } from 'react-icons/fa6';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Form';
import { Alert } from '../ui/Alert';
import { listarZonasDelivery, actualizarTarifaDelivery } from './tarifasService';
import { formatearMoneda } from '../../compartido/lib/utils/format';
import { DELIVERY_CIUDAD } from '../../web/config/site';

const importeValido = valor => valor.trim() !== '' && Number.isFinite(Number(valor)) && Number(valor) >= 0.01 &&
    Number(valor) <= 99999999.99 && Math.abs(Number(valor) * 100 - Math.round(Number(valor) * 100)) < 0.00001;

export default function TarifasEnvioPage() {
    const [cargando, setCargando] = useState(true), [guardando, setGuardando] = useState(false);
    const [editando, setEditando] = useState(false);
    const [error, setError] = useState(''), [mensaje, setMensaje] = useState(''), [cobertura, setCobertura] = useState(null), [tarifa, setTarifa] = useState('');
    const activo = useRef(true), mutando = useRef(false), revision = useRef(0);
    const botonEditar = useRef(null), edicionAnterior = useRef(false);
    const obtener = async () => {
        const turno = ++revision.current;
        setMensaje('');
        try {
            const zonas = await listarZonasDelivery();
            const ciudad = zonas.find(z => z.nombre === DELIVERY_CIUDAD.nombre && Number(z.tarifa) > 0 && Number(z.estado) === 1);
            if (!ciudad) throw new Error('La cobertura de Ciudad de Pallasca no está disponible en el servidor.');
            if (activo.current && turno === revision.current) { setCobertura(ciudad); setTarifa(Number(ciudad.tarifa).toFixed(2)); setEditando(false); setError(''); }
        } catch (e) { if (activo.current && turno === revision.current) { setCobertura(null); setEditando(false); setError(e.response?.data?.mensaje || e.message); } }
        finally { if (activo.current && turno === revision.current) setCargando(false); }
    };
    useEffect(() => {
        activo.current = true;
        revision.current++;
        queueMicrotask(() => { if (activo.current) obtener(); });
        return () => { activo.current = false; };
    }, []);
    useEffect(() => {
        if (!editando && edicionAnterior.current) botonEditar.current?.focus();
        edicionAnterior.current = editando;
    }, [editando]);
    const editar = () => {
        if (!cobertura || cargando || guardando) return;
        setTarifa(Number(cobertura.tarifa).toFixed(2)); setEditando(true); setError(''); setMensaje('');
    };
    const cancelar = () => {
        if (guardando) return;
        setTarifa(Number(cobertura.tarifa).toFixed(2)); setEditando(false); setError(''); setMensaje('');
    };
    const guardar = async e => {
        e.preventDefault();
        if (!editando || !cobertura || !importeValido(tarifa) || mutando.current || cargando) return;
        mutando.current = true; revision.current++; setGuardando(true); setError(''); setMensaje('');
        try {
            const actualizada = await actualizarTarifaDelivery(cobertura.id_zona, Number(tarifa), Number(cobertura.tarifa));
            if (activo.current) { setCobertura(actualizada); setTarifa(Number(actualizada.tarifa).toFixed(2)); setEditando(false); setMensaje(`Tarifa actualizada a ${formatearMoneda(actualizada.tarifa)} por pedido. Se aplicará a pedidos nuevos.`); }
        } catch (e) { if (activo.current) setError(e.response?.data?.mensaje || e.message); }
        finally { mutando.current = false; if (activo.current) setGuardando(false); }
    };
    const modificado = cobertura && Number(tarifa) !== Number(cobertura.tarifa);
    return <div className="space-y-5">
        <PageHeader titulo="Tarifa de delivery" descripcion="Administra el importe único por pedido dentro de la ciudad de Pallasca."
            acciones={<Button variante="secondary" disabled={cargando || guardando} onClick={() => { setCargando(true); obtener(); }}><FaRotate/> Actualizar</Button>}/>
        {error && <Alert tipo="error">{error}</Alert>}
        {mensaje && <Alert tipo="success">{mensaje}</Alert>}
        <Card><CardHeader titulo={editando ? 'Editar tarifa de delivery' : 'Configuración de tarifa'}
            subtitulo="Una tarifa para todos los barrios de la ciudad."
            acciones={!editando && <Button ref={botonEditar} onClick={editar} disabled={!cobertura || cargando || guardando} className="shrink-0"><FaPenToSquare/> Editar tarifa</Button>}/>
            <CardBody>
                <dl className="grid gap-6 md:grid-cols-3">
                    <div><dt className="text-sm font-semibold text-slate-600">Tarifa vigente</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{cargando ? 'Consultando…' : cobertura ? `${formatearMoneda(cobertura.tarifa)} por pedido` : 'No disponible'}</dd><dd className="mt-1 text-sm text-slate-600">PEN (soles)</dd></div>
                    <div><dt className="text-sm font-semibold text-slate-600">Cobertura</dt><dd className="mt-2 font-semibold">Ciudad de Pallasca</dd><dd className="mt-1 text-sm text-slate-600">Excluye anexos y otros distritos.</dd></div>
                    <div><dt className="text-sm font-semibold text-slate-600">Aplicación</dt><dd className="mt-2 font-semibold">Pedidos nuevos con delivery</dd><dd className="mt-1 text-sm text-slate-600">Un importe por pedido, no por libro.</dd></div>
                </dl>
                {editando && <form onSubmit={guardar} className="mt-6 space-y-4 border-t border-slate-200 pt-5" aria-label="Editar tarifa de delivery">
                    <div className="max-w-sm">
                    <Input label="Tarifa de delivery (S/)" prefijo="S/" type="number" min="0.01" max="99999999.99" step="0.01" inputMode="decimal" required
                        autoFocus
                        value={tarifa} onChange={e => { setTarifa(e.target.value); setMensaje(''); }} disabled={!cobertura || cargando || guardando}
                        error={tarifa && !importeValido(tarifa) ? 'Ingrese un importe mayor que cero, con hasta dos decimales.' : undefined}/>
                    </div>
                    <p className="text-sm text-slate-600">Importe en PEN, mayor que cero y con hasta dos decimales. Los pedidos ya creados conservan su tarifa.</p>
                    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!cobertura || !importeValido(tarifa) || !modificado || cargando || guardando} cargando={guardando}><FaFloppyDisk/> Guardar tarifa</Button>
                        <Button type="button" variante="secondary" disabled={guardando || cargando} onClick={cancelar}>Cancelar</Button></div>
                </form>}
                <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">Los cambios se registran en Historial y solo afectan pedidos nuevos.</p>
        </CardBody></Card>
    </div>;
}
