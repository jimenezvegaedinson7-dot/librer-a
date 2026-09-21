import { useEffect, useState } from 'react';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { formatearMoneda } from '../../lib/utils/format';
import { emailValido } from '../../lib/utils/validaciones';

import { useToast } from '../../components/providers/ToastProvider';

import { emitirComprobante } from '../comprobantes/comprobantesService';

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

    useEffect(() => {
        if (!abierto) return undefined;
        setTipo(tipoInicial);
        setTipoDocumento('RUC');
        setDocumento('');
        setErrorDocumento('');
        setClienteNombre('');
        setErrorNombre('');
        setClienteEmail('');
        setErrorEmail('');
        return undefined;
    }, [abierto, tipoInicial]);

    const enviar = async () => {
        setErrorDocumento('');
        setErrorNombre('');
        setErrorEmail('');

        if (tipo === 'factura') {
            const doc = documento.trim();
            if (!doc) {
                setErrorDocumento('Ingresa el número de documento del cliente para emitir la factura');
                return;
            }
            if (doc.length < 8) {
                setErrorDocumento('El número de documento debe tener al menos 8 caracteres');
                return;
            }
            if (!clienteNombre.trim()) {
                setErrorNombre('Ingresa el nombre o razón social del cliente');
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
            subtitulo={venta ? `Venta #${venta.id_venta} · ${formatearMoneda(venta.total)}` : 'Selecciona el tipo de comprobante'}
            onCerrar={onCerrar}
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
            <div className="space-y-4">
                <Select
                    label="Tipo de comprobante"
                    value={tipo}
                    onChange={(e) => {
                        setTipo(e.target.value);
                        setErrorDocumento('');
                    }}
                    required
                >
                    <option value="boleta">Boleta (sin documento)</option>
                    <option value="factura">Factura (requiere documento)</option>
                </Select>

                {tipo === 'factura' && (
                    <div className="space-y-4 rounded-xl border border-primary-200 bg-parchment-200 p-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Select
                                label="Tipo de documento"
                                value={tipoDocumento}
                                onChange={(e) => setTipoDocumento(e.target.value)}
                                required
                            >
                                {TIPOS_DOCUMENTO.map((opcion) => (
                                    <option key={opcion} value={opcion}>
                                        {opcion}
                                    </option>
                                ))}
                            </Select>
                            <Input
                                label="Nº de documento"
                                value={documento}
                                onChange={(e) => {
                                    setDocumento(e.target.value);
                                    setErrorDocumento('');
                                }}
                                error={errorDocumento}
                                placeholder="Ej. 20123456789"
                                maxLength="20"
                                required
                            />
                        </div>
                        <Alert tipo="info" titulo="Dato obligatorio para factura">
                            El documento del cliente (DNI, RUC o CE) debe tener al menos 8 caracteres.
                        </Alert>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input
                                label="Nombre / Razón social"
                                value={clienteNombre}
                                onChange={(e) => {
                                    setClienteNombre(e.target.value);
                                    setErrorNombre('');
                                }}
                                error={errorNombre}
                                placeholder="Ej. María Pérez o Librería El Sol SAC"
                                maxLength="150"
                                required
                            />
                            <Input
                                label="Correo del comprador"
                                type="email"
                                value={clienteEmail}
                                onChange={(e) => {
                                    setClienteEmail(e.target.value);
                                    setErrorEmail('');
                                }}
                                error={errorEmail}
                                placeholder="Ej. comprador@correo.com"
                                maxLength="120"
                            />
                        </div>
                        <Alert tipo="info">
                            El nombre o razón social es obligatorio. El correo es opcional.
                        </Alert>
                    </div>
                )}
            </div>
        </Modal>
    );
}
