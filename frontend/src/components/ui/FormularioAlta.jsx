import { useState } from 'react';

import { FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6';

import { Card, CardBody, CardHeader } from './Card';
import { Button } from './Button';
import { Alert } from './Alert';
import { useFormulario } from '../../lib/hooks/useFormulario';

// ============================================================
// FormularioAlta: formulario de creación genérico con
// validación por campo, mensajes pulidos y manejo de errores
// del servidor (incluidos registros duplicados).
// ============================================================
export function FormularioAlta({
    titulo,
    subtitulo,
    etiquetaAlta,
    icono,
    botonGuardar,
    formularioVacio,
    reglas = null,
    sanitizar = null,
    mensajeExito,
    mensajeError,
    guardar,
    onRegistrado,
    renderCampos,
    errorExterno,
    deshabilitarEnvio,
}) {
    const { formulario, errores, manejarCambio, validarTodos, marcarErrores, restablecer } = useFormulario({
        inicial: formularioVacio,
        reglas,
        sanitizar,
    });

    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const limpiar = () => {
        restablecer();
        setMensaje('');
        setError('');
    };

    const enviar = async (e) => {
        e.preventDefault();
        setMensaje('');
        setError('');

        const { valido } = validarTodos();
        if (!valido) {
            setError('Revisa los campos marcados en rojo antes de continuar.');
            return;
        }

        try {
            setGuardando(true);
            const respuesta = await guardar(formulario);
            // El botón deja de cargar apenas el servidor confirma el guardado;
            // el refresco de la lista ocurre en segundo plano (onRegistrado).
            setGuardando(false);
            restablecer();
            setMensaje(respuesta?.mensaje || mensajeExito || 'Registro correcto');
            if (onRegistrado) await onRegistrado();
        } catch (err) {
            const mensajeServidor = err.response?.data?.mensaje;
            setError(mensajeServidor || mensajeError || 'Error al registrar');
            // Si el backend reportó un duplicado/conflicto, mostrarlo destacado.
            marcarErrores(
                mensajeServidor && /(ya está registrado|ya se encuentra|duplicad|existe|registrado)/i.test(mensajeServidor)
                    ? { servidor: mensajeServidor }
                    : {},
            );
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Card className="admin-form-card">
            <CardHeader
                titulo={titulo}
                subtitulo={subtitulo}
                icono={icono}
                acciones={
                    <span className="text-xs font-medium text-slate-500">
                        {etiquetaAlta}
                    </span>
                }
            />
            <CardBody>
                {errorExterno && (
                    <div className="mb-5">
                        <Alert tipo="error" cerrar>{errorExterno}</Alert>
                    </div>
                )}
                {mensaje && (
                    <div className="mb-5">
                        <Alert tipo="success" cerrar autoCerrarMs={4000} onCerrar={() => setMensaje('')}>
                            {mensaje}
                        </Alert>
                    </div>
                )}
                {error && (
                    <div className="mb-5">
                        <Alert tipo="error" cerrar onCerrar={() => setError('')}>
                            {error}
                        </Alert>
                    </div>
                )}

                <form onSubmit={enviar} className="formal-form space-y-4" noValidate>
                    {renderCampos({ formulario, manejarCambio, errores })}

                    <div className="form-actions flex items-center justify-end gap-3 border-t border-primary-200 pt-5">
                        <Button variante="secondary" type="button" onClick={limpiar} disabled={guardando}>
                            <FaRotateLeft /> Limpiar
                        </Button>
                        <Button type="submit" cargando={guardando} disabled={guardando || deshabilitarEnvio}>
                            <FaFloppyDisk /> {guardando ? 'Guardando...' : botonGuardar || 'Guardar'}
                        </Button>
                    </div>
                </form>
            </CardBody>
        </Card>
    );
}
