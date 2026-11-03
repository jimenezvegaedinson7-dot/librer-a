import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaPlus } from 'react-icons/fa6';
import { Button } from './Button';
import { Modal } from './Modal';
import './alta-flotante.css';

export function AltaFlotante({ etiqueta, titulo, subtitulo, grande = false, formulario: Formulario, eventoRegistro, onRegistrado, formularioProps = {} }) {
    const [abierto, setAbierto] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [contenedorModal, setContenedorModal] = useState(null);
    const envioEnCurso = useRef(false);
    const disparador = useRef(null);

    const cambiarGuardando = useCallback((valor) => {
        envioEnCurso.current = valor;
        setGuardando(valor);
    }, []);
    const cerrar = useCallback(() => {
        if (!envioEnCurso.current) setAbierto(false);
    }, []);
    const completar = useCallback(() => {
        envioEnCurso.current = false;
        setGuardando(false);
        setAbierto(false);
    }, []);
    const registroCompletado = async (...datos) => {
        completar();
        await onRegistrado?.(...datos);
    };

    return (
        <div className="alta-catalogo">
            <Button
                ref={disparador}
                className="alta-catalogo-boton"
                onClick={(evento) => {
                    setContenedorModal(evento.currentTarget.closest('.admin-shell') || document.body);
                    setAbierto(true);
                }}
                aria-haspopup="dialog"
                aria-expanded={abierto}
                disabled={abierto}>
                <FaPlus aria-hidden="true" /> {etiqueta}
            </Button>
            {contenedorModal &&
                createPortal(
                    <Modal abierto={abierto} titulo={titulo} subtitulo={subtitulo} grande={grande} onCerrar={cerrar} cerrarDeshabilitado={guardando} retornoFocoRef={disparador}>
                        {abierto && (
                            <Formulario {...formularioProps} incrustado onCancelar={cerrar} onGuardandoChange={cambiarGuardando} {...{ [eventoRegistro]: registroCompletado }} />
                        )}
                    </Modal>,
                    contenedorModal
                )}
        </div>
    );
}
