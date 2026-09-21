import { useEffect, useState } from 'react';

import { FaBuilding, FaFloppyDisk, FaRotate } from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { useToast } from '../../components/providers/ToastProvider';

import { obtenerEmpresa, actualizarEmpresa } from './empresaService';
import { requerido, validarFormulario } from '../../lib/utils/validaciones';

const FORMULARIO_VACIO = {
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    tipo_documento: 'DNI',
    documento_identidad: '',
    direccion: '',
    aplica_igv: false,
};

const REGLAS = {
    ruc: [
        (v) => {
            const limpio = String(v ?? '').trim();
            if (!limpio) return 'El RUC es obligatorio';
            if (!/^\d{11}$/.test(limpio)) return 'El RUC debe tener exactamente 11 dígitos';
            return '';
        },
    ],
    razon_social: [(v) => requerido(v, 'La razón social')],
    documento_identidad: [(v) => requerido(v, 'El documento de identidad')],
};

function SkeletonFormulario() {
    return (
        <Card>
            <CardHeader titulo="Datos de la empresa" subtitulo="Información del emisor de comprobantes" />
            <CardBody>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2" role="status" aria-label="Cargando datos de la empresa">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={i === 5 ? 'md:col-span-2' : ''}>
                            <div className="mb-1.5 h-2.5 w-28 animate-pulse rounded bg-parchment-400" />
                            <div className="h-10 animate-pulse rounded-lg bg-parchment-300" />
                        </div>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
}

function Interruptor({ activo, onChange, descripcion }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary-200 bg-parchment-200 px-4 py-3">
            <div>
                <p className="text-sm font-semibold text-mahogany-700">Aplicar IGV (18%)</p>
                {descripcion && <p className="mt-0.5 text-xs text-primary-500">{descripcion}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={activo}
                onClick={() => onChange(!activo)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                    activo ? 'bg-primary-600' : 'bg-parchment-400'
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        activo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
        </div>
    );
}

export default function EmpresaPage() {
    const { exito } = useToast();

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
    const [errores, setErrores] = useState({});

    const cargarEmpresa = async () => {
        try {
            setCargando(true);
            setError('');
            const datos = await obtenerEmpresa();
            if (datos) {
                setFormulario({
                    ruc: String(datos.ruc ?? ''),
                    razon_social: String(datos.razon_social ?? ''),
                    nombre_comercial: String(datos.nombre_comercial ?? ''),
                    tipo_documento: String(datos.tipo_documento ?? 'DNI'),
                    documento_identidad: String(datos.documento_identidad ?? ''),
                    direccion: String(datos.direccion ?? ''),
                    aplica_igv: Number(datos.aplica_igv) === 1,
                });
            }
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los datos de la empresa');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarEmpresa();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        setFormulario((actual) => ({ ...actual, [name]: value }));
        setErrores((actual) => {
            if (!actual[name]) return actual;
            const copia = { ...actual };
            delete copia[name];
            return copia;
        });
    };

    const guardar = async (e) => {
        e.preventDefault();
        const { errores: nuevos, valido } = validarFormulario(formulario, REGLAS);
        setErrores(nuevos);
        if (!valido) return;

        try {
            setGuardando(true);
            setError('');
            await actualizarEmpresa(formulario);
            exito('Datos de la empresa actualizados correctamente');
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al guardar los datos de la empresa');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Configuración · Datos de la empresa"
                descripcion="Información del emisor que aparece en boletas y facturas"
                icono={<FaBuilding />}
                acciones={
                    <Button variante="secondary" onClick={cargarEmpresa} disabled={cargando}>
                        <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                }
            />

            {cargando && <SkeletonFormulario />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && (
                <Card>
                    <CardHeader
                        titulo="Datos de la empresa"
                        subtitulo="El RUC se usa como emisor en los comprobantes electrónicos"
                    />
                    <CardBody>
                        <form onSubmit={guardar} noValidate className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Input
                                    label="RUC"
                                    name="ruc"
                                    value={formulario.ruc}
                                    onChange={manejarCambio}
                                    error={errores?.ruc}
                                    placeholder="10447545387"
                                    maxLength="11"
                                    inputMode="numeric"
                                    required
                                />

                                <Input
                                    label="Razón social"
                                    name="razon_social"
                                    value={formulario.razon_social}
                                    onChange={manejarCambio}
                                    error={errores?.razon_social}
                                    placeholder="Ej. Librería El Rincón del Lector S.A.C."
                                    required
                                />

                                <Input
                                    label="Nombre comercial"
                                    name="nombre_comercial"
                                    value={formulario.nombre_comercial}
                                    onChange={manejarCambio}
                                    placeholder="Ej. Librería El Rincón del Lector"
                                />

                                <Select
                                    label="Tipo de documento"
                                    name="tipo_documento"
                                    value={formulario.tipo_documento}
                                    onChange={manejarCambio}
                                >
                                    <option value="DNI">DNI</option>
                                    <option value="RUC">RUC</option>
                                    <option value="CE">Carné de extranjería</option>
                                </Select>

                                <Input
                                    label="Documento de identidad"
                                    name="documento_identidad"
                                    value={formulario.documento_identidad}
                                    onChange={manejarCambio}
                                    error={errores?.documento_identidad}
                                    placeholder="Documento de identidad del representante"
                                    required
                                />

                                <Textarea
                                    label="Dirección"
                                    name="direccion"
                                    value={formulario.direccion}
                                    onChange={manejarCambio}
                                    placeholder="Dirección fiscal de la empresa"
                                    rows="2"
                                />

                                <div className="md:col-span-2">
                                    <Interruptor
                                        activo={formulario.aplica_igv}
                                        onChange={(activo) => setFormulario((actual) => ({ ...actual, aplica_igv: activo }))}
                                        descripcion="Activar solo si la empresa es contribuyente del IGV. Las facturas calcularan IGV (18%) sobre el total. Las boletas nunca incluyen IGV."
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-primary-200/70 pt-5">
                                <Button type="submit" cargando={guardando} disabled={guardando}>
                                    <FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar cambios'}
                                </Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}