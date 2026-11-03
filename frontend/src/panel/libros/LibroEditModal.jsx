import { useEffect, useRef, useState } from 'react';

import { FaFloppyDisk, FaLock, FaRotateLeft } from 'react-icons/fa6';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Form';import { Alert } from '../ui/Alert';

import { listarAutores, listarCategorias, actualizarLibro } from './librosService';
import { urlPortadaLibro } from '../../compartido/lib/utils/portadasLibro';
import CamposLibro, { SelectorPortada } from './CamposLibro';
import DescuentoLibroModal, { BotonDescuentoLibro } from './DescuentoLibroModal';
import AutorForm from '../autores/AutorForm';
import { requerido, numeroNoNegativo, seleccionRequerida, validarFormulario } from '../lib/utils/validaciones';

// mysql2 devuelve las columnas DATE como Date en hora local, así que los
// getters locales conservan el día correcto. Con toISOString() se correría
// un día hacia atrás enropicativo de Lima (UTC-5) y la promoción vencería
// antes de tiempo.
function aFechaInput(valor) {
    if (!valor) return '';
    if (typeof valor === 'string') return valor.slice(0, 10);
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
        const mes = String(valor.getMonth() + 1).padStart(2, '0');
        const dia = String(valor.getDate()).padStart(2, '0');
        return `${valor.getFullYear()}-${mes}-${dia}`;
    }
    return '';
}

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
    // El formulario, la imagen y los avisos se inicializan desde el libro
    // editado y el padre da una `key` distinta por libro: al abrir otro
    // registro React remonta este componente y todo arranca en cero sin
    // necesidad de un efecto que copie props al estado.
    const [formulario, setFormulario] = useState(() => ({
        titulo: libro?.titulo || '',
        isbn: libro?.isbn || '',
        descripcion: libro?.descripcion || '',
        precio: libro?.precio ?? '',
        stock: libro?.stock ?? 0,
        id_autor: libro?.id_autor || '',
        id_categoria: libro?.id_categoria || '',
        descuento_porcentaje: libro?.descuento_porcentaje ?? '',
        precio_oferta: libro?.precio_oferta ?? '',
        descuento_hasta: aFechaInput(libro?.descuento_hasta),
        estado: libro?.estado !== undefined && libro?.estado !== null ? String(libro.estado) : '1',
    }));
    const [imagen, setImagen] = useState(null);
    const [preview, setPreview] = useState(null);
    // La portada guardada no se edita aquí, solo se muestra: se deriva del
    // libro recibido en lugar de guardarse en estado.
    const portadaActual = libro ? urlPortadaLibro(libro) : null;
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [errores, setErrores] = useState({});
    const inputArchivoRef = useRef(null);
    const formularioRef = useRef(null);
    const devolverFocoAutor = useRef(false);
    const [creandoAutor, setCreandoAutor] = useState(false);
    const [editandoDescuento, setEditandoDescuento] = useState(false);

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
        const autor = { ...datos, nombre: datos.nombre.trim(), apellido: datos.apellido.trim(), id_autor: respuesta.id_autor, estado: 1 };
        setAutores((anteriores) => [...anteriores.filter((a) => String(a.id_autor) !== String(autor.id_autor)), autor]);
        manejarCambio({ target: { name: 'id_autor', value: String(autor.id_autor) } });
        cerrarAltaAutor();
    };

    // Autores y categorías vienen del servidor: esto sí es sincronizar con
    // un sistema externo, por lo que corresponde a un efecto. El `activo`
    // evita fijar estado si el modal se cerró mientras cargaban.
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
            descuento_porcentaje: libro.descuento_porcentaje ?? '',
            precio_oferta: libro.precio_oferta ?? '',
            descuento_hasta: aFechaInput(libro.descuento_hasta),
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
            setError(err.mensajeUsuario || err.response?.data?.mensaje || 'Error al actualizar el libro');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <>
        <Modal abierto={abierto && !editandoDescuento}
            titulo={creandoAutor ? 'Agregar autor al libro' : 'Editar libro'}
            subtitulo={creandoAutor ? 'Guarda el autor y continúa editando el libro.' : 'Actualiza la información del libro seleccionado'}
            onCerrar={onCerrar} grande>
            {error && <div className="mb-4"><Alert tipo="error">{error}</Alert></div>}

            {creandoAutor && <AutorForm incrustado enfocarNombre onAutorCreado={autorCreado} onCancelar={cerrarAltaAutor} />}
            <form ref={formularioRef} onSubmit={actualizar} className={`space-y-3 ${creandoAutor ? 'hidden' : ''}`}>
                <CamposLibro formulario={formulario} autores={autores} categorias={categorias} manejarCambio={manejarCambio} errores={errores}
                    onAgregarAutor={() => setCreandoAutor(true)} guardando={guardando} />

                <div className="form-grid">
                    <div className="md:col-span-3">
                        <label className="field-label">Stock</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formulario.stock}
                                disabled
                                className="field cursor-not-allowed pr-10 font-semibold text-primary-500"
                            />
                            <FaLock className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500" />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">Se gestiona desde Inventario.</p>
                    </div>
                    <Select label="Estado" name="estado" value={formulario.estado} onChange={manejarCambio} ancho={3}>
                        <option value="1">Activo</option>
                        <option value="0">Inactivo</option>
                    </Select>
                </div>

                <SelectorPortada
                    imagen={imagen}
                    preview={preview}
                    portadaActual={portadaActual}
                    libro={libro}
                    onCambiar={manejarImagen}
                    onQuitar={cancelarNuevaImagen}
                    inputRef={inputArchivoRef}
                    cargando={guardando}
                />

                <BotonDescuentoLibro
                    formulario={formulario}
                    onAbrir={() => setEditandoDescuento(true)}
                    disabled={guardando}
                />

                <div className="flex flex-col-reverse gap-3 border-t border-primary-200 pt-5 sm:flex-row sm:justify-end">
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
        {editandoDescuento && <DescuentoLibroModal
            formulario={formulario}
            onCerrar={() => setEditandoDescuento(false)}
            onAplicar={(descuento) => {
                setFormulario((anterior) => ({ ...anterior, ...descuento }));
                setEditandoDescuento(false);
            }}
        />}
        </>
    );
}
