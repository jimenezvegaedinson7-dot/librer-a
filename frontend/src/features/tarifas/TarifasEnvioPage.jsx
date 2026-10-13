import { useEffect, useState } from 'react';
import { FaRotate } from 'react-icons/fa6';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { listarZonasDelivery } from './tarifasService';
import { formatearMoneda } from '../../lib/utils/format';
import { DELIVERY_CIUDAD, DIRECCION_RECOJO } from '../../public-site/config/site';

export default function TarifasEnvioPage() {
    const [cargando, setCargando] = useState(true), [error, setError] = useState(''), [cobertura, setCobertura] = useState(null);
    const obtener = async (vigente = () => true) => {
        try {
            const zonas = await listarZonasDelivery();
            const ciudad = zonas.find(z => z.nombre === DELIVERY_CIUDAD.nombre && Number(z.tarifa) === DELIVERY_CIUDAD.tarifa && Number(z.estado) === 1);
            if (!ciudad) throw new Error('La cobertura fija todavía no está disponible en el servidor.');
            if (vigente()) { setCobertura(ciudad); setError(''); }
        } catch (e) { if (vigente()) { setCobertura(null); setError(e.response?.data?.mensaje || e.message); } }
        finally { if (vigente()) setCargando(false); }
    };
    useEffect(() => { let activo = true; queueMicrotask(() => { if (activo) obtener(() => activo); }); return () => { activo = false; }; }, []);
    return <div className="space-y-5">
        <PageHeader titulo="Delivery y recojo" descripcion="Una sola tarifa para toda la ciudad de Pallasca."
            acciones={<Button variante="secondary" disabled={cargando} onClick={() => { setCargando(true); obtener(); }}><FaRotate/> Actualizar</Button>}/>
        {error && <Alert tipo="error">{error}</Alert>}
        <Card><CardHeader titulo="Cobertura y precio" subtitulo="El importe se calcula en el servidor para cada compra nueva."/>
            <CardBody><dl className="grid gap-6 sm:grid-cols-2">
                <div><dt className="font-semibold">Delivery en la ciudad de Pallasca</dt><dd className="mt-2 text-xl font-bold">{cargando ? 'Consultando…' : cobertura ? `${formatearMoneda(cobertura.tarifa)} fijo` : 'No disponible'}</dd>
                    <dd className="mt-2 text-sm text-slate-600">Mismo precio en todos los barrios de la ciudad. No incluye anexos ni otros distritos.</dd></div>
                <div><dt className="font-semibold">Recojo en tienda</dt><dd className="mt-2 text-xl font-bold">Gratis</dd><dd className="mt-2 text-sm text-slate-600">{DIRECCION_RECOJO}</dd></div>
            </dl><p className="mt-6 text-sm text-slate-600">Las compras anteriores conservan su dirección, cobertura y costo de envío originales.</p></CardBody></Card>
    </div>;
}
