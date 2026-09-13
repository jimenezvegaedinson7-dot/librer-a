import { useEffect, useRef, useState } from 'react';

import { FaFloppyDisk, FaLock, FaRotateLeft } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Form';import { Alert } from '../../components/ui/Alert';

import { listarAutores, listarCategorias, actualizarLibro } from './librosService';
import { construirUrlArchivo } from '../../lib/utils/url';
import CamposLibro, { SelectorPortada } from './CamposLibro';
import { requerido, numeroNoNegativo, seleccionRequerida, validarFormulario } from '../../lib/utils/validaciones';

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

export default function LibroEditModal({ libro, abierto, onCerrar, onActualizado }) {
    const [autores, setAutores] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [formulario, setFormulario] = useState({
        titulo: '',
        isbn: '',
        descripcion: '',
        precio: '',
        stock: 0,
        id_autor: '',
        id_categoria: '',
        estado: '1',
    });
    const [imagen, setImagen] = useState(null);
    const [preview, setPreview] = useState(null);
    const [portadaActual, setPortadaActual] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [errores, setErrores] = useState({});
    const inputArchivoRef = useRef(null);

    useEffect(() => {
        if (!abierto || !libro) return;

        let activo = true;
        Promise.all([listarAutores(), listarCategorias()])
            .then(([a, c]) => {
                if (!activo) return;
                setAutores(a);
                setCategorias(c);
            })
            .catch(() => {
                if (activo) setError('Error al cargar autores o categorías');
            });

        setFormulario({
            titulo: libro.titulo || '',
            isbn: libro.isbn || '',
            descripcion: libro.descripcion || '',
            precio: libro.precio ?? '',
            stock: libro.stock ?? 0,
            id_autor: libro.id_autor || '',
            id_categoria: libro.id_categoria || '',
            estado: libro.estado !== undefined && libro.estado !== null ? String(libro.estado) : '1',
        });
        setPortadaActual(construirUrlArchivo(libro.portada));
        setImagen(null);
        setPreview(null);
        setError('');
        setErrores({});
        if (inputArchivoRef.current) inputArchivoRef.current.value = '';

        return () => {
            activo = false;
        };
    }, [abierto, libro]);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    if (!abierto || !libro) return null;

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        setFormulario((anterior) => ({ ...anterior, [name]: value }));
        setError('');
        const mensaje = (REGLAS[name] || []).reduce((acc, validador) => acc || validador(value, formulario), '');
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

    const cancelarNuevaImagen = () => {
        if (preview) URL.revokeObjectURL(preview);
        setImagen(null);
        setPreview(null);
        if (inputArchivoRef.current) inputArchivoRef.current.value = '';
    };

    const restablecerFormulario = () => {
        setFormulario({
            titulo: libro.titulo || '',
            isbn: libro.isbn || '',
            descripcion: libro.descripcion || '',
            precio: libro.precio ?? '',
            stock: libro.stock ?? 0,
            id_autor: libro.id_autor || '',
            id_categoria: libro.id_categoria || '',
            estado: libro.estado !== undefined && libro.estado !== null ? String(libro.estado) : '1',
        });
        cancelarNuevaImagen();
        setError('');
        setErrores({});
    };

    const actualizar = async (e) => {
        e.preventDefault();
        const { errores: nuevosErrores, valido } = validarFormulario(formulario, REGLAS);
        setErrores(nuevosErrores);
        setError('');
        if (!valido) {
            setError('Revisa los campos marcados en rojo antes de continuar.');
            return;
        }
        try {
            setGuardando(true);
            setError('');
            await actualizarLibro(libro.id_libro, formulario, imagen);
            if (onActualizado) await onActualizado();
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al actualizar el libro');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo="Editar libro" subtitulo="Actualiza la información del libro seleccionado" onCerrar={onCerrar} grande>
            {error && <div className="mb-4"><Alert tipo="error">{error}</Alert></div>}

            <form onSubmit={actualizar} className="space-y-3">
                <CamposLibro formulario={formulario} autores={autores} categorias={categorias} manejarCambio={manejarCambio} errores={errores} />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className="field-label">Stock</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formulario.stock}
                                disabled
                                className="field cursor-not-allowed pr-10 font-semibold text-slate-600"
                            />
                            <FaLock className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">Se gestiona desde Inventario.</p>
                    </div>
                    <Select label="Estado" name="estado" value={formulario.estado} onChange={manejarCambio}>
                        <option value="1">Activo</option>
                        <option value="0">Inactivo</option>
                    </Select>
                </div>

                <SelectorPortada
                    imagen={imagen}
                    preview={preview}
                    portadaActual={portadaActual}
                    onCambiar={manejarImagen}
                    onQuitar={cancelarNuevaImagen}
                    inputRef={inputArchivoRef}
                />

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <Button variante="secondary" type="button" onClick={restablecerFormulario} disabled={guardando}>
                        <FaRotateLeft /> Restablecer
                    </Button>
                    <Button variante="secondary" type="button" onClick={onCerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" cargando={guardando}>
                        <FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
