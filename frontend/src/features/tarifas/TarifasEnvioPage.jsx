import { useEffect, useRef, useState } from 'react';
import { FaFloppyDisk, FaRotate } from 'react-icons/fa6';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { listarZonasDelivery, actualizarTarifaDelivery } from './tarifasService';
import { formatearMoneda } from '../../lib/utils/format';
import { DELIVERY_CIUDAD, DIRECCION_RECOJO } from '../../public-site/config/site';

const importeValido = valor => valor.trim() !== '' && Number.isFinite(Number(valor)) && Number(valor) >= 0.01 &&
    Number(valor) <= 99999999.99 && Math.abs(Number(valor) * 100 - Math.round(Number(valor) * 100)) < 0.00001;

export default function TarifasEnvioPage() {
    const [cargando, setCargando] = useState(true), [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(''), [mensaje, setMensaje] = useState(''), [cobertura, setCobertura] = useState(null), [tarifa, setTarifa] = useState('');
    const activo = useRef(true), mutando = useRef(false), revision = useRef(0);
    const obtener = async () => {
        const turno = ++revision.current;
        setMensaje('');
        try {
            const zonas = await listarZonasDelivery();
            const ciudad = zonas.find(z => z.nombre === DELIVERY_CIUDAD.nombre && Number(z.tarifa) > 0 && Number(z.estado) === 1);
            if (!ciudad) throw new Error('La cobertura de Ciudad de Pallasca no está disponible en el servidor.');
            if (activo.current && turno === revision.current) { setCobertura(ciudad); setTarifa(Number(ciudad.tarifa).toFixed(2)); setError(''); }
        } catch (e) { if (activo.current && turno === revision.current) { setCobertura(null); setError(e.response?.data?.mensaje || e.message); } }
        finally { if (activo.current && turno === revision.current) setCargando(false); }
    };
    useEffect(() => {
        activo.current = true;
        revision.current++;
        queueMicrotask(() => { if (activo.current) obtener(); });
        return () => { activo.current = false; };
    }, []);
    const guardar = async e => {
        e.preventDefault();
        if (!cobertura || !importeValido(tarifa) || mutando.current || cargando) return;
        mutando.current = true; revision.current++; setGuardando(true); setError(''); setMensaje('');
        try {
            const actualizada = await actualizarTarifaDelivery(cobertura.id_zona, Number(tarifa), Number(cobertura.tarifa));
            if (activo.current) { setCobertura(actualizada); setTarifa(Number(actualizada.tarifa).toFixed(2)); setMensaje(`Tarifa vigente actualizada a ${formatearMoneda(actualizada.tarifa)} por pedido. Aplicación: pedidos nuevos con delivery.`); }
        } catch (e) { if (activo.current) setError(e.response?.data?.mensaje || e.message); }
        finally { mutando.current = false; if (activo.current) setGuardando(false); }
    };
    const modificado = cobertura && Number(tarifa) !== Number(cobertura.tarifa);
    return <div className="space-y-5">
        <PageHeader titulo="Configuración de entrega" descripcion="Administración de la tarifa única de delivery y del punto de recojo."
            acciones={<Button variante="secondary" disabled={cargando || guardando} onClick={() => { setCargando(true); obtener(); }}><FaRotate/> Actualizar</Button>}/>
        {error && <Alert tipo="error">{error}</Alert>}
        {mensaje && <Alert tipo="success">{mensaje}</Alert>}
        <Card><CardHeader titulo="Tarifa única de delivery" subtitulo="Un importe por pedido, independiente del número de libros o del barrio dentro de la cobertura."/>
            <CardBody><div className="grid gap-6 lg:grid-cols-2">
                <dl className="space-y-4">
                    <div><dt className="font-semibold">Tarifa vigente</dt><dd className="mt-1 text-xl font-bold">{cargando ? 'Consultando…' : cobertura ? `${formatearMoneda(cobertura.tarifa)} por pedido` : 'No disponible'}</dd></div>
                    <div><dt className="font-semibold">Cobertura habilitada</dt><dd className="mt-1 text-sm text-slate-600">Ciudad de Pallasca. Excluye anexos y otros distritos.</dd></div>
                    <div><dt className="font-semibold">Moneda y cálculo</dt><dd className="mt-1 text-sm text-slate-600">PEN (soles). Total del pedido = subtotal de libros + tarifa de delivery.</dd></div>
                </dl>
                <form onSubmit={guardar} className="space-y-3" aria-label="Editar tarifa de delivery">
                    <Input label="Tarifa de delivery (S/)" prefijo="S/" type="number" min="0.01" max="99999999.99" step="0.01" inputMode="decimal" required
                        value={tarifa} onChange={e => { setTarifa(e.target.value); setMensaje(''); }} disabled={!cobertura || cargando || guardando}
                        error={tarifa && !importeValido(tarifa) ? 'Ingrese un importe mayor que cero, con hasta dos decimales.' : undefined}/>
                    <p className="text-sm text-slate-600">Guardar registra la tarifa y el administrador responsable en el historial. Solo afecta pedidos creados después de la actualización.</p>
                    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!cobertura || !importeValido(tarifa) || !modificado || cargando || guardando} cargando={guardando}><FaFloppyDisk/> Guardar tarifa</Button>
                        <Button type="button" variante="secondary" disabled={!modificado || guardando || cargando} onClick={() => { setTarifa(Number(cobertura.tarifa).toFixed(2)); setMensaje(''); }}>Descartar cambios</Button></div>
                </form>
            </div><p className="mt-6 text-sm text-slate-600">La tarifa se incorpora al total al crear el pedido. Esta configuración no recalcula pedidos existentes, no modifica pagos ni comprobantes y no genera cargos adicionales.</p></CardBody></Card>
        <Card><CardHeader titulo="Recojo en tienda" subtitulo="Modalidad sin cargo de entrega."/><CardBody>
            <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="font-semibold">Costo de recojo</dt><dd className="mt-1">Gratis · S/ 0.00</dd></div>
                <div><dt className="font-semibold">Punto de recojo</dt><dd className="mt-1">{DIRECCION_RECOJO}</dd></div></dl>
        </CardBody></Card>
    </div>;
}
