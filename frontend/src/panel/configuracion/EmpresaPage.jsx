import { useEffect, useRef, useState } from 'react';
import { FaBuilding, FaFloppyDisk, FaPenToSquare, FaRotate } from 'react-icons/fa6';

import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Form';
import { Alert } from '../ui/Alert';
import { ErrorCarga } from '../ui/ErrorCarga';
import { useToast } from '../../app/providers/ToastProvider';
import { obtenerEmpresa, actualizarEmpresa } from './empresaService';
import { requerido, validarFormulario } from '../lib/utils/validaciones';

const FORMULARIO_VACIO = { ruc: '', razon_social: '', nombre_comercial: '', direccion: '' };
const REGLAS = {
    ruc: [valor => {
        const limpio = String(valor ?? '').trim();
        if (!limpio) return 'El RUC es obligatorio';
        return /^\d{11}$/.test(limpio) ? '' : 'El RUC debe tener exactamente 11 dígitos';
    }],
    razon_social: [valor => requerido(valor, 'La razón social')],
};

function datosFormulario(datos) {
    return Object.fromEntries(Object.keys(FORMULARIO_VACIO).map(campo => [campo, String(datos[campo] ?? '')]));
}

function SkeletonFormulario() {
    return <Card>
        <CardHeader titulo="Datos de la empresa" subtitulo="Información del emisor de comprobantes" />
        <CardBody><div className="grid grid-cols-1 gap-4 md:grid-cols-2" role="status" aria-label="Cargando datos de la empresa">
            {Array.from({ length: 4 }, (_, i) => <div key={i}>
                <div className="skeleton mb-2 h-2.5 w-28" /><div className="skeleton h-10 !rounded-lg" />
            </div>)}
        </div></CardBody>
    </Card>;
}

export default function EmpresaPage() {
    const { exito } = useToast();
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [editando, setEditando] = useState(false);
    const [confirmada, setConfirmada] = useState(null);
    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
    const [errores, setErrores] = useState({});
    const envioEnCurso = useRef(false);

    const cargarEmpresa = async () => {
        try {
            setCargando(true);
            setError('');
            const datos = await obtenerEmpresa();
            if (!datos) throw new Error('No se pudieron consultar los datos de la empresa');
            const actual = datosFormulario(datos);
            setFormulario(actual);
            setConfirmada(actual);
            setEditando(false);
            setErrores({});
        } catch (err) {
            setError(err.response?.data?.mensaje || err.message || 'Error al cargar los datos de la empresa');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let vigente = true;
        queueMicrotask(() => { if (vigente) cargarEmpresa(); });
        return () => { vigente = false; };
    }, []);

    const manejarCambio = evento => {
        const { name, value } = evento.target;
        setFormulario(actual => ({ ...actual, [name]: value }));
        setErrores(actual => {
            const copia = { ...actual };
            delete copia[name];
            return copia;
        });
    };
    const cancelar = () => {
        if (envioEnCurso.current) return;
        setFormulario({ ...confirmada });
        setErrores({});
        setError('');
        setEditando(false);
    };
    const guardar = async evento => {
        evento.preventDefault();
        if (!editando || !confirmada || envioEnCurso.current) return;
        const validacion = validarFormulario(formulario, REGLAS);
        setErrores(validacion.errores);
        if (!validacion.valido) return;
        envioEnCurso.current = true;
        setGuardando(true);
        setError('');
        try {
            // Solo se envían campos visibles: PUT conserva la configuración
            // y los metadatos existentes que ya no se editan desde el panel.
            const enviado = { ...formulario };
            const respuesta = await actualizarEmpresa(enviado);
            const actual = datosFormulario(respuesta?.ruc !== undefined ? respuesta : enviado);
            setConfirmada(actual);
            setFormulario(actual);
            setEditando(false);
            exito('Datos de la empresa actualizados correctamente');
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al guardar los datos de la empresa');
        } finally {
            envioEnCurso.current = false;
            setGuardando(false);
        }
    };

    return <div className="space-y-4">
        <PageHeader titulo="Configuración · Datos de la empresa" descripcion="Información del emisor que aparece en boletas y facturas" icono={<FaBuilding />}
            acciones={<Button variante="secondary" onClick={cargarEmpresa} disabled={cargando || guardando || editando}><FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}</Button>} />
        {cargando && <SkeletonFormulario />}
        {!cargando && error && (editando ? <Alert tipo="error">{error}</Alert> : <ErrorCarga mensaje={error} onReintentar={cargarEmpresa} />)}
        {!cargando && confirmada && (!error || editando) && <Card>
            <CardHeader titulo="Datos de la empresa" subtitulo="El RUC aparece como emisor en los comprobantes de venta"
                acciones={!editando && <Button onClick={() => { setFormulario({ ...confirmada }); setErrores({}); setError(''); setEditando(true); }}><FaPenToSquare /> Editar datos</Button>} />
            <CardBody>
                {!editando ? <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {[['RUC', confirmada.ruc], ['Razón social', confirmada.razon_social], ['Nombre comercial', confirmada.nombre_comercial], ['Dirección', confirmada.direccion]].map(([etiqueta, valor]) =>
                        <div key={etiqueta} className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{etiqueta}</dt><dd className="mt-2 whitespace-pre-line break-words text-base font-semibold text-slate-800">{valor || 'No registrado'}</dd></div>)}
                </dl> : <form onSubmit={guardar} noValidate aria-label="Editar datos de la empresa">
                    <fieldset disabled={guardando} className="space-y-4">
                        <div className="form-grid">
                            <Input ancho={4} label="RUC" name="ruc" value={formulario.ruc} onChange={manejarCambio} error={errores.ruc} placeholder="11 dígitos del RUC" autoFocus maxLength="11" inputMode="numeric" required />
                            <Input ancho={8} label="Razón social" name="razon_social" value={formulario.razon_social} onChange={manejarCambio} error={errores.razon_social} required />
                            <Input ancho={12} label="Nombre comercial" name="nombre_comercial" value={formulario.nombre_comercial} onChange={manejarCambio} />
                            <Textarea ancho={12} label="Dirección" name="direccion" value={formulario.direccion} onChange={manejarCambio} rows="2" />
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-primary-200/70 pt-5">
                            <Button variante="secondary" onClick={cancelar} disabled={guardando}>Cancelar</Button>
                            <Button type="submit" cargando={guardando}><FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar cambios'}</Button>
                        </div>
                    </fieldset>
                </form>}
            </CardBody>
        </Card>}
    </div>;
}
