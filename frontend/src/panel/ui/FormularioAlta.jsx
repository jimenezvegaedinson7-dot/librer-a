import { useRef, useState } from 'react';
import { FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6';
import { Card, CardBody, CardHeader } from './Card';
import { Button } from './Button';
import { Alert } from './Alert';
import { useFormulario } from '../lib/hooks/useFormulario';

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
    incrustado = false,
    onCancelar,
    onGuardandoChange
}) {
    const { formulario, errores, manejarCambio, validarTodos, marcarErrores, restablecer } = useFormulario({ inicial: formularioVacio, reglas, sanitizar });

    const [guardando, setGuardando] = useState(false);
    const envioEnCurso = useRef(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const limpiar = () => {
        restablecer();
        setMensaje('');
        setError('');
    };

    const enviar = async (e) => {
        e.preventDefault();
        if (envioEnCurso.current) return;
        setMensaje('');
        setError('');

        const { valido } = validarTodos();
        if (!valido) {
            setError('Revisa los campos marcados en rojo antes de continuar.');
            return;
        }

        try {
            envioEnCurso.current = true;
            setGuardando(true);
            onGuardandoChange?.(true);
            const respuesta = await guardar(formulario);

            setGuardando(false);
            restablecer();
            setMensaje(respuesta?.mensaje || mensajeExito || 'Registro correcto');
            if (onRegistrado) await onRegistrado(respuesta, formulario);
        } catch (err) {
            const mensajeServidor = err.response?.data?.mensaje;
            setError(mensajeServidor || mensajeError || 'Error al registrar');

            marcarErrores(mensajeServidor && /(ya está registrado|ya se encuentra|duplicad|existe|registrado)/i.test(mensajeServidor) ? { servidor: mensajeServidor } : {});
        } finally {
            envioEnCurso.current = false;
            setGuardando(false);
            onGuardandoChange?.(false);
        }
    };

    const Contenedor = incrustado ? 'div' : Card;
    const Cuerpo = incrustado ? 'div' : CardBody;

    return (
        <Contenedor className={incrustado ? undefined : 'admin-form-card'}>
            {!incrustado && (
                <CardHeader
                    titulo={titulo}
                    subtitulo={subtitulo}
                    icono={icono}
                    acciones={etiquetaAlta ? <span className="text-xs font-medium text-slate-500">{etiquetaAlta}</span> : undefined}
                />
            )}
            <Cuerpo>
                {errorExterno && (
                    <div className="mb-5">
                        <Alert tipo="error" cerrar>
                            {errorExterno}
                        </Alert>
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
                        <Button variante="secondary" type="button" onClick={onCancelar || limpiar} disabled={guardando}>
                            {onCancelar ? (
                                'Cancelar'
                            ) : (
                                <>
                                    <FaRotateLeft /> Limpiar
                                </>
                            )}
                        </Button>
                        <Button type="submit" cargando={guardando} disabled={guardando || deshabilitarEnvio}>
                            <FaFloppyDisk /> {guardando ? 'Guardando...' : botonGuardar || 'Guardar'}
                        </Button>
                    </div>
                </form>
            </Cuerpo>
        </Contenedor>
    );
}
