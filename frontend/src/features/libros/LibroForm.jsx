import { useEffect, useRef, useState } from 'react';

import { FaBookOpen, FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6';

import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

import useCatalogo from './useCatalogo';
import { crearLibro } from './librosService';
import CamposLibro, { SelectorPortada } from './CamposLibro';
import { requerido, numeroNoNegativo, seleccionRequerida } from '../../lib/utils/validaciones';

const FORMULARIO_VACIO = {
    titulo: '',
    isbn: '',
    descripcion: '',
    precio: '',
    id_autor: '',
    id_categoria: '',
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

export default function LibroForm({ onLibroCreado }) {
    const { autores, categorias, cargando: cargandoCatalogo, error: errorCatalogo } = useCatalogo();
    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
    const [errores, setErrores] = useState({});
    const [imagen, setImagen] = useState(null);
    const [preview, setPreview] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const inputArchivoRef = useRef(null);

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
        setPreview(URL.createObjectURL(archivo));
        setError('');
    };

    const quitarImagen = () => {
        if (preview) URL.revokeObjectURL(preview);
        setImagen(null);
        setPreview(null);
        if (inputArchivoRef.current) inputArchivoRef.current.value = '';
    };

    const limpiarFormulario = () => {
        setFormulario(FORMULARIO_VACIO);
        setErrores({});
        quitarImagen();
        setMensaje('');
        setError('');
    };

    const guardarLibro = async (e) => {
        e.preventDefault();
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

        try {
            setGuardando(true);
            const respuesta = await crearLibro(formulario, imagen);
            setFormulario(FORMULARIO_VACIO);
            setErrores({});
            quitarImagen();
            setMensaje(respuesta?.mensaje || 'Libro registrado correctamente');
            if (onLibroCreado) await onLibroCreado();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al registrar el libro');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Card>
            <CardHeader
                titulo="Registrar libro"
                subtitulo="Complete la información del nuevo libro"
                icono={<FaBookOpen />}
                acciones={
                    <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                        Nuevo registro
                    </span>
                }
            />
            <CardBody>
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

                <form onSubmit={guardarLibro} className="space-y-4" noValidate>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                            <FaBookOpen />
                        </div>
                    </div>

                    {cargandoCatalogo ? (
                        <p className="text-sm text-slate-600">Cargando autores y categorías...</p>
                    ) : (
                        <>
                            <CamposLibro
                                formulario={formulario}
                                autores={autores}
                                categorias={categorias}
                                manejarCambio={manejarCambio}
                                errores={errores}
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

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200/70 pt-4">
                        <Button variante="secondary" type="button" onClick={limpiarFormulario} disabled={guardando}>
                            <FaRotateLeft /> Limpiar
                        </Button>
                        <Button type="submit" cargando={guardando} disabled={cargandoCatalogo}>
                            <FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar libro'}
                        </Button>
                    </div>
                </form>
            </CardBody>
        </Card>
    );
}
