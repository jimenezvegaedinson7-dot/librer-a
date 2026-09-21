import { useEffect, useState } from 'react';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { formatearMoneda } from '../../lib/utils/format';
import { emailValido } from '../../lib/utils/validaciones';

import { useToast } from '../../components/providers/ToastProvider';

import { emitirComprobante } from '../comprobantes/comprobantesService';
import { obtenerEmpresa } from '../configuracion/empresaService';

const TIPOS_DOCUMENTO = ['RUC', 'DNI', 'CE'];

export default function EmitirComprobanteModal({ venta, tipoInicial = 'boleta', abierto, onCerrar, onEmitido }) {
    const { exito, error: mostrarError } = useToast();

    const [tipo, setTipo] = useState(tipoInicial);
    const [tipoDocumento, setTipoDocumento] = useState('RUC');
    const [documento, setDocumento] = useState('');
    const [errorDocumento, setErrorDocumento] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [errorNombre, setErrorNombre] = useState('');
    const [clienteEmail, setClienteEmail] = useState('');
    const [errorEmail, setErrorEmail] = useState('');
    const [ejecutando, setEjecutando] = useState(false);

    const [empresa, setEmpresa] = useState(null);
    const [cargandoEmpresa, setCargandoEmpresa] = useState(false);

    useEffect(() => {
        if (!abierto) return undefined;

        setTipo(tipoInicial);
        setTipoDocumento('RUC');
        setDocumento('');
        setErrorDocumento('');
        setErrorNombre('');
        setErrorEmail('');
        setEjecutando(false);

        if (venta) {
            const nombreCompleto = [venta.nombre_usuario, venta.apellido_usuario].filter(Boolean).join(' ').trim();
            setClienteNombre(nombreCompleto);
            setClienteEmail(venta.correo_compra || venta.correo_usuario || '');
        } else {
            setClienteNombre('');
            setClienteEmail('');
        }

        setCargandoEmpresa(true);
        obtenerEmpresa()
            .then((emp) => setEmpresa(emp))
            .catch(() => setEmpresa(null))
            .finally(() => setCargandoEmpresa(false));

        return undefined;
    }, [abierto, tipoInicial, venta]);

    const detalle = venta?.detalles || venta?.detalle || [];
    const subtotalVenta = detalle.reduce((s, item) => s + Number(item.subtotal || 0), 0);
    const costoEnvio = Number(venta?.costo_envio || 0);
    const totalVenta = Number(venta?.total || 0);

    const enviar = async () => {
        setErrorDocumento('');
        setErrorNombre('');
        setErrorEmail('');

        if (tipo === 'factura') {
            const doc = documento.trim();
            if (!doc) {
                setErrorDocumento('Ingresa el RUC del cliente para emitir la factura');
                return;
            }
            if (doc.length < 8) {
                setErrorDocumento('El documento debe tener al menos 8 caracteres');
                return;
            }
            if (!clienteNombre.trim()) {
                setErrorNombre('Ingresa el nombre o razon social del cliente');
                return;
            }
        }

        const correo = clienteEmail.trim();
        if (correo) {
            const errorCorreoValido = emailValido(correo);
            if (errorCorreoValido) {
                setErrorEmail(errorCorreoValido);
                return;
            }
        }

        if (!venta?.id_venta) return;

        try {
            setEjecutando(true);
            setErrorDocumento('');
            setErrorNombre('');
            setErrorEmail('');
            const comprobante = await emitirComprobante(venta.id_venta, {
                tipo,
                cliente_tipo_documento: tipo === 'factura' ? tipoDocumento : undefined,
                cliente_dni_ruc: tipo === 'factura' ? documento.trim() : undefined,
                cliente_nombre: clienteNombre.trim() || undefined,
                cliente_email: correo || undefined,
            });
            exito(`Comprobante ${tipo === 'factura' ? 'factura' : 'boleta'} emitido correctamente`);
            onEmitido?.(comprobante);
            onCerrar();
        } catch (err) {
            mostrarError(
                err.response?.data?.mensaje ||
                    (err.response?.status === 409
                        ? 'La venta ya tiene un comprobante emitido'
                        : 'Error al emitir el comprobante'),
            );
        } finally {
            setEjecutando(false);
        }
    };

    return (
        <Modal
            abierto={abierto}
            titulo="Emitir comprobante"
            subtitulo={venta ? `Venta #${venta.id_venta}` : 'Selecciona el tipo de comprobante'}
            onCerrar={onCerrar}
            grande
            footer={
                <>
                    <Button variante="secondary" onClick={onCerrar} disabled={ejecutando}>
                        Cancelar
                    </Button>
                    <Button onClick={enviar} cargando={ejecutando}>
                        Emitir comprobante
                    </Button>
                </>
            }
        >
            <div className="space-y-5">

                {/* TIPO DE COMPROBANTE */}
                <Select
                    label="Tipo de comprobante"
                    value={tipo}
                    onChange={(e) => {
                        setTipo(e.target.value);
                        setErrorDocumento('');
                        setErrorNombre('');
                    }}
                    required
                >
                    <option value="boleta">Boleta (sin documento)</option>
                    <option value="factura">Factura (requiere RUC del cliente)</option>
                </Select>

                {/* DATOS DEL EMISOR */}
                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary-400 mb-3">Datos del emisor (empresa)</p>
                    {cargandoEmpresa ? (
                        <p className="text-sm text-primary-400">Cargando datos de la empresa...</p>
                    ) : empresa ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-primary-400">RUC</p>
                                <p className="text-sm font-bold text-mahogany-700">{empresa.ruc || '—'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-primary-400">Razon social</p>
                                <p className="text-sm font-bold text-mahogany-700">{empresa.razon_social || '—'}</p>
                            </div>
                            {empresa.nombre_comercial && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary-400">Nombre comercial</p>
                                    <p className="text-sm text-mahogany-700">{empresa.nombre_comercial}</p>
                                </div>
                            )}
                            {empresa.direccion && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary-400">Direccion</p>
                                    <p className="text-sm text-mahogany-700">{empresa.direccion}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Alert tipo="warning">
                            No se encontraron datos de la empresa. Configuralos en Configuracion &gt; Datos de la empresa.
                        </Alert>
                    )}
                </div>

                {/* DATOS DEL COMPRADOR */}
                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary-400 mb-3">Datos del comprador</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {tipo === 'factura' && (
                            <>
                                <Select
                                    label="Tipo de documento"
                                    value={tipoDocumento}
                                    onChange={(e) => setTipoDocumento(e.target.value)}
                                    required
                                >
                                    {TIPOS_DOCUMENTO.map((opcion) => (
                                        <option key={opcion} value={opcion}>{opcion}</option>
                                    ))}
                                </Select>
                                <Input
                                    label="Nro. documento (RUC/DNI)"
                                    value={documento}
                                    onChange={(e) => { setDocumento(e.target.value); setErrorDocumento(''); }}
                                    error={errorDocumento}
                                    placeholder="Ej. 20123456789"
                                    maxLength="20"
                                    required
                                />
                            </>
                        )}
                        <Input
                            label="Nombre completo"
                            value={clienteNombre}
                            onChange={(e) => { setClienteNombre(e.target.value); setErrorNombre(''); }}
                            error={errorNombre}
                            placeholder="Nombre del comprador"
                            maxLength="150"
                            required
                        />
                        <Input
                            label="Correo electronico"
                            type="email"
                            value={clienteEmail}
                            onChange={(e) => { setClienteEmail(e.target.value); setErrorEmail(''); }}
                            error={errorEmail}
                            placeholder="correo@ejemplo.com"
                            maxLength="120"
                        />
                    </div>
                    {tipo === 'factura' && (
                        <Alert tipo="info" className="mt-3">
                            El RUC y nombre del cliente son obligatorios para factura.
                        </Alert>
                    )}
                </div>

                {/* DETALLE DE LA VENTA */}
                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary-400 mb-3">Detalle de la venta</p>
                    {detalle.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-primary-200">
                                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-primary-500">Libro</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-primary-500">Cant.</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-primary-500">P. Unit.</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-primary-500">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-primary-200">
                                        {detalle.map((item, i) => (
                                            <tr key={item.id_libro ?? i}>
                                                <td className="px-3 py-2 font-medium text-mahogany-700">{item.titulo || 'Sin titulo'}</td>
                                                <td className="px-3 py-2 text-center text-mahogany-700">{item.cantidad}</td>
                                                <td className="px-3 py-2 text-right text-mahogany-700">{formatearMoneda(item.precio_unitario)}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-mahogany-700">{formatearMoneda(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3 flex flex-col items-end gap-1 border-t border-primary-200 pt-3">
                                {costoEnvio > 0 && (
                                    <div className="flex w-full max-w-xs items-center justify-between text-sm">
                                        <span className="text-primary-500">Costo envio</span>
                                        <span className="font-semibold text-mahogany-700">{formatearMoneda(costoEnvio)}</span>
                                    </div>
                                )}
                                <div className="flex w-full max-w-xs items-center justify-between border-t-2 border-mahogany-700 pt-2">
                                    <span className="text-sm font-extrabold uppercase tracking-wide text-mahogany-700">Total</span>
                                    <span className="text-lg font-extrabold text-mahogany-700">{formatearMoneda(totalVenta)}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-primary-400">No hay detalle de productos para esta venta.</p>
                    )}
                </div>

            </div>
        </Modal>
    );
}
