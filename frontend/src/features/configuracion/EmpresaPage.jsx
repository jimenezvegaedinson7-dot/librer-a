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
    libros_exonerados: true,
    exoneracion_libros_hasta: '2026-10-17',
    tasa_igv: '18',
};

const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Misma regla que el backend (utils/impuestos): libros exonerados hasta la
// fecha indicada; el envío (servicio) siempre gravado si hay IGV.
function ejemploTributos({ aplica_igv, libros_exonerados, exoneracion_libros_hasta, tasa_igv }, libros, envio) {
    if (!aplica_igv) return { gravada: 0, exonerada: libros + envio, igv: 0 };
    const hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
    const exonerados = libros_exonerados && (!exoneracion_libros_hasta || hoy <= exoneracion_libros_hasta);
    const conIgv = envio + (exonerados ? 0 : libros);
    const gravada = redondear(conIgv / (1 + Number(tasa_igv || 18) / 100));
    return { gravada, exonerada: exonerados ? libros : 0, igv: redondear(conIgv - gravada) };
}

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
                            <div className="skeleton mb-2 h-2.5 w-28" />
                            <div className="skeleton h-10 !rounded-lg" />
                        </div>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
}

function Interruptor({ activo, onChange, titulo, descripcion }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary-200 bg-parchment-200 px-4 py-3">
            <div>
                <p className="text-sm font-semibold text-slate-700">{titulo}</p>
                {descripcion && <p className="mt-0.5 text-xs text-primary-500">{descripcion}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={activo}
                onClick={() => onChange(!activo)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b98d3e] focus-visible:ring-offset-2 ${
                    activo ? 'interruptor--activo' : 'interruptor--inactivo'
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
                    libros_exonerados: Number(datos.libros_exonerados ?? 1) === 1,
                    exoneracion_libros_hasta: String(datos.exoneracion_libros_hasta ?? '').slice(0, 10),
                    tasa_igv: String(Number(datos.tasa_igv ?? 18)),
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
                            <div className="form-grid">
                                <Input
                                    ancho={4}
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
                                    ancho={8}
                                    label="Razón social"
                                    name="razon_social"
                                    value={formulario.razon_social}
                                    onChange={manejarCambio}
                                    error={errores?.razon_social}
                                    placeholder="Ej. Librería El Rincón del Lector S.A.C."
                                    required
                                />

                                <Input
                                    ancho={6}
                                    label="Nombre comercial"
                                    name="nombre_comercial"
                                    value={formulario.nombre_comercial}
                                    onChange={manejarCambio}
                                    placeholder="Ej. Librería El Rincón del Lector"
                                />

                                <Select
                                    ancho={3}
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
                                    ancho={3}
                                    label="Número de documento"
                                    placeholder="DNI o CE"
                                    name="documento_identidad"
                                    value={formulario.documento_identidad}
                                    onChange={manejarCambio}
                                    error={errores?.documento_identidad}
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


                                <div className="space-y-3">
                                    <Interruptor
                                        titulo="Empresa afecta al IGV"
                                        activo={formulario.aplica_igv}
                                        onChange={(activo) => setFormulario((actual) => ({ ...actual, aplica_igv: activo }))}
                                        descripcion="Actívalo si el RUC está en el Régimen General, MYPE Tributario o RER (si el RUC emite facturas, no está en el Nuevo RUS). Los precios ya incluyen el IGV: el comprobante solo lo muestra desglosado."
                                    />
                                    {formulario.aplica_igv && (
                                        <>
                                            <Interruptor
                                                titulo="Libros exonerados del IGV (Ley 31053)"
                                                activo={formulario.libros_exonerados}
                                                onChange={(activo) => setFormulario((actual) => ({ ...actual, libros_exonerados: activo }))}
                                                descripcion="La venta de libros no paga IGV mientras rija la exoneración. El envío a domicilio es un servicio y sí paga IGV."
                                            />
                                            <div className="form-grid">
                                                {formulario.libros_exonerados && (
                                                    <Input
                                                        ancho={6}
                                                        label="Exonerados hasta"
                                                        type="date"
                                                        name="exoneracion_libros_hasta"
                                                        value={formulario.exoneracion_libros_hasta}
                                                        onChange={manejarCambio}
                                                    />
                                                )}
                                                <Input
                                                    ancho={6}
                                                    label="Tasa del IGV (%)"
                                                    type="number"
                                                    min="0"
                                                    max="30"
                                                    step="0.01"
                                                    name="tasa_igv"
                                                    value={formulario.tasa_igv}
                                                    onChange={manejarCambio}
                                                />
                                            </div>
                                            {formulario.libros_exonerados && (
                                                <p className="text-xs text-slate-500">
                                                    Si la exoneración se prorroga, cambia la fecha. Pasada esa fecha, los libros se
                                                    calcularán como gravados automáticamente.
                                                </p>
                                            )}
                                        </>
                                    )}
                                    {(() => {
                                        const t = ejemploTributos(formulario, 40, 10);
                                        return (
                                            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                                Ejemplo con la configuración actual — S/ 40.00 en libros + S/ 10.00 de envío:
                                                {' '}Op. exonerada <strong>S/ {t.exonerada.toFixed(2)}</strong>
                                                {' · '}Op. gravada <strong>S/ {t.gravada.toFixed(2)}</strong>
                                                {' · '}IGV <strong>S/ {t.igv.toFixed(2)}</strong>
                                                {' · '}Total <strong>S/ 50.00</strong>
                                            </p>
                                        );
                                    })()}
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