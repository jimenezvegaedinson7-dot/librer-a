import { useEffect, useState } from 'react';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { formatearMoneda } from '../../lib/utils/format';
import { emailValido } from '../../lib/utils/validaciones';

import { useToast } from '../../components/providers/ToastProvider';

import { emitirComprobante, enviarComprobanteEmail } from '../comprobantes/comprobantesService';
import { envioAutomaticoActivo } from '../comprobantes/envioAutomatico';
import { obtenerEmpresa } from '../configuracion/empresaService';

const TIPOS_DOCUMENTO_BOLETA = ['DNI', 'CE', 'PASAPORTE'];
const TIPOS_DOCUMENTO_FACTURA = ['RUC'];

export default function EmitirComprobanteModal({ venta, tipoInicial = 'boleta', abierto, onCerrar, onEmitido }) {
    const { exito, error: mostrarError } = useToast();

    const [tipo, setTipo] = useState(tipoInicial);
    const [tipoDocumento, setTipoDocumento] = useState('DNI');
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
        setErrorDocumento('');
        setErrorNombre('');
        setErrorEmail('');
        setEjecutando(false);

        if (venta) {
            const nombreCompleto = [venta.nombre_usuario, venta.apellido_usuario].filter(Boolean).join(' ').trim();
            setClienteNombre(nombreCompleto);
            setClienteEmail(venta.correo_compra || venta.correo_usuario || '');

            if (tipoInicial === 'factura') {
                setTipoDocumento('RUC');
                setDocumento(venta.cliente_documento || '');
            } else {
                setTipoDocumento(venta.cliente_tipo_documento || 'DNI');
                setDocumento(venta.cliente_documento || '');
            }
        } else {
            setClienteNombre('');
            setClienteEmail('');
            setDocumento('');
        }

        setCargandoEmpresa(true);
        obtenerEmpresa()
            .then((emp) => setEmpresa(emp))
            .catch(() => setEmpresa(null))
            .finally(() => setCargandoEmpresa(false));

        return undefined;
    }, [abierto, tipoInicial, venta]);

    const cambiarTipo = (nuevoTipo) => {
        setTipo(nuevoTipo);
        setErrorDocumento('');
        setErrorNombre('');
        if (nuevoTipo === 'factura') {
            setTipoDocumento('RUC');
            setDocumento(venta?.cliente_documento || '');
        } else {
            setTipoDocumento('DNI');
            setDocumento(venta?.cliente_documento || '');
        }
    };

    const detalle = venta?.detalles || venta?.detalle || [];
    const costoEnvio = Number(venta?.costo_envio || 0);
    const totalVenta = Number(venta?.total || 0);

    const enviar = async () => {
        setErrorDocumento('');
        setErrorNombre('');
        setErrorEmail('');

        if (tipo === 'factura') {
            const doc = documento.trim();
            if (!doc) {
                setErrorDocumento('El RUC del cliente es obligatorio para factura');
                return;
            }
            if (doc.length < 11) {
                setErrorDocumento('El RUC debe tener 11 digitos');
                return;
            }
            if (!/^\d{11}$/.test(doc)) {
                setErrorDocumento('El RUC debe contener solo numeros');
                return;
            }
            if (!clienteNombre.trim()) {
                setErrorNombre('La razon social del cliente es obligatoria para factura');
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
                cliente_tipo_documento: tipoDocumento,
                cliente_dni_ruc: documento.trim() || undefined,
                cliente_nombre: clienteNombre.trim() || undefined,
                cliente_email: correo || undefined,
            });
            exito(`${tipo === 'factura' ? 'Factura' : 'Boleta'} emitida correctamente`);
            onEmitido?.(comprobante);
            onCerrar();
            // Modo automático: se envía por correo sin bloquear la ventana.
            if (envioAutomaticoActivo() && comprobante?.id_comprobante) {
                enviarComprobanteEmail(comprobante.id_comprobante)
                    .then((r) => exito(r?.mensaje || 'Comprobante enviado por correo'))
                    .catch((err) => mostrarError(err.response?.data?.mensaje || 'Se emitió, pero no se pudo enviar por correo'));
            }
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
            titulo={tipo === 'factura' ? 'Emitir factura' : 'Emitir boleta'}
            subtitulo={venta ? `Venta #${venta.id_venta}` : 'Selecciona el tipo de comprobante'}
            onCerrar={onCerrar}
            grande
            footer={
                <>
                    <Button variante="secondary" onClick={onCerrar} disabled={ejecutando}>
                        Cancelar
                    </Button>
                    <Button onClick={enviar} cargando={ejecutando}>
                        {tipo === 'factura' ? 'Emitir factura' : 'Emitir boleta'}
                    </Button>
                </>
            }
        >
            <div className="space-y-5">

                {/* TIPO DE COMPROBANTE */}
                <Select
                    label="Tipo de comprobante"
                    value={tipo}
                    onChange={(e) => cambiarTipo(e.target.value)}
                    required
                >
                    <option value="boleta">Boleta</option>
                    <option value="factura">Factura (requiere RUC del cliente)</option>
                </Select>

                {/* DATOS DEL EMISOR */}
                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Datos del emisor (empresa)</p>
                    {cargandoEmpresa ? (
                        <p className="text-sm text-slate-500">Cargando datos de la empresa...</p>
                    ) : empresa ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Input label="RUC" value={empresa.ruc || ''} readOnly />
                            <Input label="Razon social" value={empresa.razon_social || ''} readOnly />
                            {empresa.nombre_comercial && (
                                <Input label="Nombre comercial" value={empresa.nombre_comercial} readOnly />
                            )}
                            {empresa.direccion && (
                                <Input label="Direccion" value={empresa.direccion} readOnly />
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
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Datos del comprador</p>

                    {tipo === 'factura' && (
                        <Alert tipo="info" className="mb-3">
                            Para emitir factura se requiere el RUC del cliente (11 digitos) y razon social.
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Select
                            label="Tipo de documento"
                            value={tipoDocumento}
                            onChange={(e) => setTipoDocumento(e.target.value)}
                            required
                        >
                            {(tipo === 'factura' ? TIPOS_DOCUMENTO_FACTURA : TIPOS_DOCUMENTO_BOLETA).map((opcion) => (
                                <option key={opcion} value={opcion}>{opcion}</option>
                            ))}
                        </Select>

                        <Input
                            label={tipo === 'factura' ? 'RUC del cliente' : 'Numero de documento (opcional)'}
                            value={documento}
                            onChange={(e) => { setDocumento(e.target.value); setErrorDocumento(''); }}
                            error={errorDocumento}
                            placeholder={tipo === 'factura' ? 'Ej. 20123456789' : 'Ej. 12345678'}
                            maxLength="20"
                            required={tipo === 'factura'}
                        />

                        <Input
                            label={tipo === 'factura' ? 'Razon social del cliente' : 'Nombre completo'}
                            value={clienteNombre}
                            onChange={(e) => { setClienteNombre(e.target.value); setErrorNombre(''); }}
                            error={errorNombre}
                            placeholder={tipo === 'factura' ? 'Razon social del cliente' : 'Nombre del comprador'}
                            maxLength="150"
                            required={tipo === 'factura'}
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
                        {envioAutomaticoActivo() && (
                            <p className="envio-auto-nota sm:col-span-2">
                                Envío automático activado: el comprobante se enviará por correo al emitirlo.
                            </p>
                        )}
                    </div>
                </div>

                {/* DETALLE DE LA VENTA */}
                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Detalle de la venta</p>
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
                                                <td className="px-3 py-2 font-medium text-slate-700">{item.titulo || 'Sin titulo'}</td>
                                                <td className="px-3 py-2 text-center text-slate-700">{item.cantidad}</td>
                                                <td className="px-3 py-2 text-right text-slate-700">{formatearMoneda(item.precio_unitario)}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-slate-700">{formatearMoneda(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3 flex flex-col items-end gap-1 border-t border-primary-200 pt-3">
                                {costoEnvio > 0 && (
                                    <div className="flex w-full max-w-xs items-center justify-between text-sm">
                                        <span className="text-primary-500">Costo envio</span>
                                        <span className="font-semibold text-slate-700">{formatearMoneda(costoEnvio)}</span>
                                    </div>
                                )}
                                <div className="flex w-full max-w-xs items-center justify-between border-t-2 border-mahogany-700 pt-2">
                                    <span className="text-sm font-extrabold uppercase tracking-wide text-slate-700">Total</span>
                                    <span className="text-lg font-extrabold text-slate-700">{formatearMoneda(totalVenta)}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">No hay detalle de productos para esta venta.</p>
                    )}
                </div>

            </div>
        </Modal>
    );
}
