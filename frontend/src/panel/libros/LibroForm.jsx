import { useEffect, useRef, useState } from 'react';

import { FaBook, FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6';

import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { formatearMoneda } from '../../compartido/lib/utils/format';

import useCatalogo from './useCatalogo';
import { crearLibro } from './librosService';
import CamposLibro, { SelectorPortada } from './CamposLibro';
import DescuentoLibroModal, { BotonDescuentoLibro } from './DescuentoLibroModal';
import AutorForm from '../autores/AutorForm';
import { requerido, numeroNoNegativo, seleccionRequerida } from '../lib/utils/validaciones';

const FORMULARIO_VACIO = {
    titulo: '',
    isbn: '',
    descripcion: '',
    precio: '',
    id_autor: '',
    id_categoria: '',
    descuento_porcentaje: '',
    precio_oferta: '',
    descuento_hasta: '',
};

const REGLAS = {
    titulo: [(v) => requerido(v, 'El título')],
    precio: [(v) => numeroNoNegativo(v, 'El precio')],
    id_autor: [(v) => seleccionRequerida(v, 'Debes seleccionar un autor')],
    id_categoria: [(v) => seleccionRequerida(v, 'Debes seleccionar una categoría')],
};

function validarImagen(archivo) {
    const tipos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tipos.includes(archivo.type)) return 'La portada debe ser JPG, PNG o WEBP';
    if (archivo.size > 5 * 1024 * 1024) return 'La imagen no puede superar los 5 MB';
    return '';
}

export default function LibroForm({ onLibroCreado, incrustado = false, onCancelar, onGuardandoChange }) {
    const { autores, categorias, cargando: cargandoCatalogo, error: errorCatalogo, agregarAutor } = useCatalogo();
    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
    const [errores, setErrores] = useState({});
    const [imagen, setImagen] = useState(null);
    const [preview, setPreview] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const inputArchivoRef = useRef(null);
    const envioEnCurso = useRef(false);
    const formularioRef = useRef(null);
    const devolverFocoAutor = useRef(false);
    const [creandoAutor, setCreandoAutor] = useState(false);
    const [editandoDescuento, setEditandoDescuento] = useState(false);
    const [ofrecerDescuento, setOfrecerDescuento] = useState(false);
    const [sinDescuentoConfirmado, setSinDescuentoConfirmado] = useState(false);
    const [avisoPortada, setAvisoPortada] = useState(false);
    const [sinPortadaConfirmado, setSinPortadaConfirmado] = useState(false);

    const cerrarAltaAutor = () => {
        devolverFocoAutor.current = true;
        setCreandoAutor(false);
    };

    useEffect(() => {
        if (creandoAutor || !devolverFocoAutor.current) return;
        devolverFocoAutor.current = false;
        formularioRef.current?.querySelector('[name="id_autor"]')?.focus();
    }, [creandoAutor]);

    const autorCreado = (respuesta, datos) => {
        agregarAutor({ ...datos, nombre: datos.nombre.trim(), apellido: datos.apellido.trim(), id_autor: respuesta.id_autor, estado: 1 });
        manejarCambio({ target: { name: 'id_autor', value: String(respuesta.id_autor) } });
        setMensaje('Autor registrado y seleccionado. Continúa con los datos del libro.');
        cerrarAltaAutor();
    };

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const validarCampo = (nombre, valor) => {
        for (const validador of REGLAS[nombre] || []) {
            const mensaje = validador(valor, formulario);
            if (mensaje) return mensaje;
        }
        return '';
    };

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        setFormulario((anterior) => ({ ...anterior, [name]: value }));
        setError('');
        const mensaje = validarCampo(name, value);
        setErrores((anterior) => {
            const copia = { ...anterior };
            if (mensaje) copia[name] = mensaje;
            else delete copia[name];
            return copia;
        });
    };

    const manejarImagen = (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
        const motivo = validarImagen(archivo);
        if (motivo) {
            setError(motivo);
            e.target.value = '';
            return;
        }
        if (preview) URL.revokeObjectURL(preview);
        setImagen(archivo);
        setSinPortadaConfirmado(false);
        setPreview(URL.createObjectURL(archivo));
        setError('');
    };

    const quitarImagen = () => {
        if (preview) URL.revokeObjectURL(preview);
        setImagen(null);
        setSinPortadaConfirmado(false);
        setPreview(null);
        if (inputArchivoRef.current) inputArchivoRef.current.value = '';
    };

    const limpiarFormulario = () => {
        setFormulario(FORMULARIO_VACIO);
        setErrores({});
        quitarImagen();
        setMensaje('');
        setError('');
        setSinDescuentoConfirmado(false);
        setOfrecerDescuento(false);
        setAvisoPortada(false);
    };

    const guardarLibro = async (e, { sinDescuento = false, sinPortada = false } = {}) => {
        e?.preventDefault();
        if (envioEnCurso.current) return;
        setMensaje('');
        setError('');

        const nuevosErrores = {};
        let valido = true;
        for (const nombre of Object.keys(REGLAS)) {
            const mensaje = validarCampo(nombre, formulario[nombre]);
            if (mensaje) {
                nuevosErrores[nombre] = mensaje;
                valido = false;
            }
        }
        setErrores(nuevosErrores);
        if (!valido) {
            setError('Revisa los campos marcados en rojo antes de continuar.');
            return;
        }

        if (!imagen && !sinPortadaConfirmado && !sinPortada) {
            setAvisoPortada(true);
            return;
        }

        if (!formulario.descuento_porcentaje && !formulario.precio_oferta && !sinDescuentoConfirmado && !sinDescuento) {
            setOfrecerDescuento(true);
            return;
        }

        try {
            envioEnCurso.current = true;
            setGuardando(true);
            onGuardandoChange?.(true);
            const respuesta = await crearLibro(formulario, imagen);
            setFormulario(FORMULARIO_VACIO);
            setSinDescuentoConfirmado(false);
            setErrores({});
            quitarImagen();
            setMensaje(respuesta?.mensaje || 'Libro registrado correctamente');
            if (onLibroCreado) await onLibroCreado();
        } catch (err) {
            setError(err.mensajeUsuario || err.response?.data?.mensaje || 'Error al registrar el libro');
        } finally {
            envioEnCurso.current = false;
            setGuardando(false);
            onGuardandoChange?.(false);
        }
    };

    const Contenedor = incrustado ? 'div' : Card;
    const Cuerpo = incrustado ? 'div' : CardBody;

    return (
        <>
        <Contenedor className="libros-form">
            {!incrustado && <CardHeader
                titulo={creandoAutor ? 'Agregar autor al libro' : 'Registrar libro'}
                subtitulo={creandoAutor ? 'Guarda el autor y continúa con los datos del libro.' : 'Complete la información del nuevo libro'}
                icono={<FaBook />}
                acciones={
                    <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {creandoAutor ? 'Nuevo autor' : 'Nuevo libro'}
                    </span>
                }
            />}
            {incrustado && creandoAutor && <p className="mb-4 text-sm text-slate-600">Agrega el autor y continúa con los datos del libro.</p>}
            <Cuerpo>
                {errorCatalogo && (
                    <div className="mb-4">
                        <Alert tipo="error" cerrar>{errorCatalogo}</Alert>
                    </div>
                )}
                {mensaje && (
                    <div className="mb-4">
                        <Alert tipo="success" cerrar autoCerrarMs={4000} onCerrar={() => setMensaje('')}>
                            {mensaje}
                        </Alert>
                    </div>
                )}
                {error && (
                    <div className="mb-4">
                        <Alert tipo="error" cerrar onCerrar={() => setError('')}>
                            {error}
                        </Alert>
                    </div>
                )}

                {creandoAutor && <AutorForm incrustado enfocarNombre onAutorCreado={autorCreado} onCancelar={cerrarAltaAutor} onGuardandoChange={onGuardandoChange} />}
                <form ref={formularioRef} onSubmit={guardarLibro} className={`space-y-4 ${creandoAutor ? 'hidden' : ''}`} noValidate>
                    {cargandoCatalogo ? (
                        <p className="text-sm text-primary-500">Cargando autores y categorías...</p>
                    ) : (
                        <>
                            <CamposLibro
                                formulario={formulario}
                                autores={autores}
                                categorias={categorias}
                                manejarCambio={manejarCambio}
                                errores={errores}
                                onAgregarAutor={() => setCreandoAutor(true)}
                                guardando={guardando}
                                enfocarTitulo={incrustado}
                            />

                            <BotonDescuentoLibro
                                formulario={formulario}
                                onAbrir={() => setEditandoDescuento(true)}
                                disabled={guardando}
                            />

                            <SelectorPortada
                                imagen={imagen}
                                preview={preview}
                                portadaActual={null}
                                onCambiar={manejarImagen}
                                onQuitar={quitarImagen}
                                inputRef={inputArchivoRef}
                                cargando={guardando}
                            />
                        </>
                    )}

                    <div className="flex items-center justify-end gap-3 border-t border-primary-200/70 pt-4">
                        <Button variante="secondary" type="button" onClick={onCancelar || limpiarFormulario} disabled={guardando}>
                            {onCancelar ? 'Cancelar' : <><FaRotateLeft /> Limpiar</>}
                        </Button>
                        <Button type="submit" cargando={guardando} disabled={cargandoCatalogo}>
                            <FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar libro'}
                        </Button>
                    </div>
                </form>
            </Cuerpo>
        </Contenedor>
        {editandoDescuento && <DescuentoLibroModal
            formulario={formulario}
            onCerrar={() => setEditandoDescuento(false)}
            onAplicar={(descuento) => {
                setFormulario((anterior) => ({ ...anterior, ...descuento }));
                setSinDescuentoConfirmado(!descuento.descuento_porcentaje && !descuento.precio_oferta);
                setEditandoDescuento(false);
            }}
        />}
        {ofrecerDescuento && <Modal abierto titulo="¿Deseas agregar un descuento?" onCerrar={() => setOfrecerDescuento(false)}>
            <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-700">Puedes agregar una oferta antes de guardar el libro o registrarlo con su precio normal.</p>
                <p className="text-sm text-slate-600">Precio normal: <strong className="text-slate-900">{formatearMoneda(formulario.precio)}</strong></p>
                <div className="flex flex-col gap-3 border-t border-primary-200 pt-4 sm:flex-row sm:justify-end">
                    <Button variante="secondary" onClick={() => { setOfrecerDescuento(false); setEditandoDescuento(true); }}>Agregar descuento</Button>
                    <Button onClick={() => {
                        setSinDescuentoConfirmado(true);
                        setOfrecerDescuento(false);
                        guardarLibro(null, { sinDescuento: true });
                    }}>Registrar sin descuento</Button>
                </div>
                <Button variante="ghost" onClick={() => setOfrecerDescuento(false)}>Volver al formulario</Button>
            </div>
        </Modal>}
        {avisoPortada && <Modal abierto titulo="Falta la imagen de portada" onCerrar={() => setAvisoPortada(false)}>
            <div className="space-y-4">
                <Alert tipo="warning">Todavía no seleccionaste una imagen de portada para este libro.</Alert>
                <p className="text-sm leading-6 text-slate-700">Puedes subirla ahora o continuar con el registro sin subir una imagen.</p>
                <div className="flex flex-col gap-3 border-t border-primary-200 pt-4 sm:flex-row sm:justify-end">
                    <Button variante="secondary" onClick={() => {
                        setSinPortadaConfirmado(true);
                        setAvisoPortada(false);
                        guardarLibro(null, { sinPortada: true });
                    }}>Continuar sin imagen</Button>
                    <Button onClick={() => {
                        setAvisoPortada(false);
                        inputArchivoRef.current?.click();
                    }}>Seleccionar portada</Button>
                </div>
            </div>
        </Modal>}
        </>
    );
}
