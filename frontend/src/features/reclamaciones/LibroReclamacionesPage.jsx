import { useEffect, useState } from 'react';

import { FaBookOpen, FaCircleCheck, FaPaperPlane } from 'react-icons/fa6';

import { Input, Select, Textarea } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

import { obtenerEmpresaPublica, registrarReclamacion } from './reclamacionesService';

// ============================================================
// LIBRO DE RECLAMACIONES VIRTUAL (página pública, sin sesión)
// Código de Protección y Defensa del Consumidor (Ley 29571),
// D.S. 011-2011-PCM y D.S. 101-2022-PCM.
// ============================================================

const INICIAL = {
    tipo: 'reclamo',
    consumidor_nombre: '',
    consumidor_tipo_documento: 'DNI',
    consumidor_documento: '',
    consumidor_domicilio: '',
    consumidor_telefono: '',
    consumidor_email: '',
    es_menor: false,
    apoderado_nombre: '',
    bien_tipo: 'producto',
    bien_descripcion: '',
    monto_reclamado: '',
    id_venta: '',
    detalle: '',
    pedido: '',
};

function Seccion({ numero, titulo, children }) {
    return (
        <section className="space-y-4 border-t border-slate-200 pt-6">
            <h2 className="flex items-center gap-3 font-title text-lg font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7a2530] text-sm font-bold text-white">{numero}</span>
                {titulo}
            </h2>
            {children}
        </section>
    );
}

export default function LibroReclamacionesPage() {
    const [empresa, setEmpresa] = useState(null);
    const [hoja, setHoja] = useState(INICIAL);
    const [acepta, setAcepta] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const [registrada, setRegistrada] = useState(null);

    useEffect(() => {
        let activo = true;
        obtenerEmpresaPublica()
            .then((datos) => activo && setEmpresa(datos))
            .catch(() => activo && setEmpresa({}));
        return () => {
            activo = false;
        };
    }, []);

    const cambiar = (e) => {
        const { name, value, type, checked } = e.target;
        setHoja((actual) => ({ ...actual, [name]: type === 'checkbox' ? checked : value }));
    };

    const enviar = async (e) => {
        e.preventDefault();
        if (!acepta) {
            setError('Confirma que los datos son verdaderos para registrar la hoja');
            return;
        }
        try {
            setEnviando(true);
            setError('');
            const respuesta = await registrarReclamacion({
                ...hoja,
                monto_reclamado: hoja.monto_reclamado === '' ? undefined : hoja.monto_reclamado,
                id_venta: hoja.id_venta === '' ? undefined : hoja.id_venta,
            });
            setRegistrada(respuesta?.data ? { ...respuesta.data, mensaje: respuesta.mensaje } : { mensaje: respuesta?.mensaje });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo registrar la hoja. Inténtalo de nuevo.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f6f1e9] px-4 py-8 sm:py-12">
            <main className="mx-auto w-full max-w-3xl rounded-2xl border border-[#e7dfd3] bg-white p-5 shadow-sm sm:p-8">
                <header className="flex flex-col gap-4 border-b-2 border-[#7a2530] pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7a2530] text-2xl text-white" aria-hidden="true">
                            <FaBookOpen />
                        </span>
                        <div>
                            <h1 className="font-title text-2xl font-semibold text-slate-900">Libro de Reclamaciones</h1>
                            <p className="text-sm text-slate-600">Hoja de reclamación virtual</p>
                        </div>
                    </div>
                    <div className="text-sm text-slate-700 sm:text-right">
                        <p className="font-semibold">{empresa?.razon_social || 'Librería del Saber'}</p>
                        {empresa?.nombre_comercial && <p>{empresa.nombre_comercial}</p>}
                        {empresa?.ruc && <p>RUC {empresa.ruc}</p>}
                        {empresa?.direccion && <p className="text-xs text-slate-500">{empresa.direccion}</p>}
                    </div>
                </header>

                {registrada ? (
                    <div className="space-y-4 py-8 text-center">
                        <FaCircleCheck className="mx-auto text-5xl text-emerald-600" aria-hidden="true" />
                        <h2 className="font-title text-2xl font-semibold text-slate-900">Hoja N.° {registrada.numero}</h2>
                        <p className="text-slate-700">{registrada.mensaje}</p>
                        {registrada.fecha_limite && (
                            <p className="text-sm text-slate-600">
                                Te responderemos en un plazo no mayor a 15 días hábiles (a más tardar el{' '}
                                {new Date(`${registrada.fecha_limite}T12:00:00`).toLocaleDateString('es-PE')}).
                            </p>
                        )}
                        <Button
                            variante="secondary"
                            onClick={() => {
                                setRegistrada(null);
                                setHoja(INICIAL);
                                setAcepta(false);
                            }}
                        >
                            Registrar otra hoja
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={enviar} className="mt-6 space-y-6" noValidate>
                        <Seccion numero="1" titulo="Identificación del consumidor">
                            <div className="form-grid">
                                <Input ancho={12} label="Nombre completo" name="consumidor_nombre" value={hoja.consumidor_nombre} onChange={cambiar} requerido maxLength={160} />
                                <Select ancho={4} label="Documento" name="consumidor_tipo_documento" value={hoja.consumidor_tipo_documento} onChange={cambiar}>
                                    <option value="DNI">DNI</option>
                                    <option value="CE">Carné de extranjería</option>
                                    <option value="PASAPORTE">Pasaporte</option>
                                    <option value="RUC">RUC</option>
                                </Select>
                                <Input ancho={8} label="Número de documento" name="consumidor_documento" value={hoja.consumidor_documento} onChange={cambiar} requerido maxLength={20} />
                                <Input ancho={12} label="Domicilio" name="consumidor_domicilio" value={hoja.consumidor_domicilio} onChange={cambiar} requerido maxLength={255} />
                                <Input ancho={6} label="Teléfono" name="consumidor_telefono" value={hoja.consumidor_telefono} onChange={cambiar} maxLength={20} inputMode="tel" />
                                <Input ancho={6} label="Correo electrónico" type="email" name="consumidor_email" value={hoja.consumidor_email} onChange={cambiar} requerido maxLength={255} />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input type="checkbox" name="es_menor" checked={hoja.es_menor} onChange={cambiar} className="h-4 w-4" />
                                Soy menor de edad
                            </label>
                            {hoja.es_menor && (
                                <Input label="Nombre del padre, madre o apoderado" name="apoderado_nombre" value={hoja.apoderado_nombre} onChange={cambiar} requerido maxLength={160} />
                            )}
                        </Seccion>

                        <Seccion numero="2" titulo="Identificación del bien contratado">
                            <div className="form-grid">
                                <Select ancho={4} label="Tipo" name="bien_tipo" value={hoja.bien_tipo} onChange={cambiar}>
                                    <option value="producto">Producto</option>
                                    <option value="servicio">Servicio</option>
                                </Select>
                                <Input ancho={8} label="Descripción" name="bien_descripcion" value={hoja.bien_descripcion} onChange={cambiar} requerido maxLength={255} placeholder="Ej. Libro «Cien años de soledad»" />
                                <Input ancho={6} label="Monto reclamado (S/)" type="number" min="0" step="0.01" name="monto_reclamado" value={hoja.monto_reclamado} onChange={cambiar} />
                                <Input ancho={6} label="N.° de pedido (si lo tienes)" name="id_venta" value={hoja.id_venta} onChange={cambiar} inputMode="numeric" />
                            </div>
                        </Seccion>

                        <Seccion numero="3" titulo="Detalle de la reclamación">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de hoja">
                                {[
                                    { valor: 'reclamo', titulo: 'Reclamo', texto: 'Disconformidad con los productos o servicios.' },
                                    { valor: 'queja', titulo: 'Queja', texto: 'Malestar o descontento con la atención al público.' },
                                ].map((op) => (
                                    <button
                                        key={op.valor}
                                        type="button"
                                        role="radio"
                                        aria-checked={hoja.tipo === op.valor}
                                        onClick={() => setHoja((a) => ({ ...a, tipo: op.valor }))}
                                        className={`venta-opcion ${hoja.tipo === op.valor ? 'venta-opcion--activa' : ''}`}
                                    >
                                        <span className="text-sm font-semibold text-slate-800">{op.titulo}</span>
                                        <span className="text-xs text-slate-500">{op.texto}</span>
                                    </button>
                                ))}
                            </div>
                            <Textarea label="Detalle" name="detalle" value={hoja.detalle} onChange={cambiar} rows="5" requerido maxLength={3000} />
                            <Textarea label="Pedido (¿qué solicitas?)" name="pedido" value={hoja.pedido} onChange={cambiar} rows="3" requerido maxLength={2000} />
                        </Seccion>

                        <div className="space-y-3 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-600">
                            <p>
                                La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo
                                para interponer una denuncia ante el INDECOPI.
                            </p>
                            <p>
                                El proveedor deberá dar respuesta al reclamo en un plazo no mayor a quince (15) días hábiles. Recibirás una
                                copia de esta hoja y la respuesta en tu correo electrónico.
                            </p>
                            <label className="flex items-start gap-2 text-sm text-slate-700">
                                <input type="checkbox" checked={acepta} onChange={(e) => { setAcepta(e.target.checked); setError(''); }} className="mt-0.5 h-4 w-4" />
                                Declaro que los datos consignados son verdaderos y acepto que se usen para atender esta hoja.
                            </label>
                        </div>

                        {error && <Alert tipo="error">{error}</Alert>}

                        <div className="flex justify-end">
                            <Button type="submit" cargando={enviando} tamano="lg">
                                <FaPaperPlane /> {enviando ? 'Enviando...' : 'Registrar hoja'}
                            </Button>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
}
