import { useEffect, useState } from 'react';

import { FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { actualizarCategoria } from './categoriasService';
import { requerido, validarFormulario } from '../../lib/utils/validaciones';

const REGLAS = {
    nombre: [(v) => requerido(v, 'El nombre de la categoría')],
};

function inicialFormulario(categoria) {
    return {
        nombre: categoria.nombre || '',
        descripcion: categoria.descripcion || '',
        estado: categoria.estado !== undefined && categoria.estado !== null ? String(categoria.estado) : '1',
    };
}

export default function CategoriaEditModal({ categoria, abierto, onCerrar, onActualizado }) {
    const [formulario, setFormulario] = useState(inicialFormulario(categoria || {}));
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!abierto || !categoria) return;
        setFormulario(inicialFormulario(categoria));
        setErrores({});
        setError('');
    }, [abierto, categoria]);

    if (!abierto || !categoria) return null;

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        setFormulario((anterior) => ({ ...anterior, [name]: value }));
        setError('');
        const mensaje = name === 'nombre' ? requerido(value, 'El nombre de la categoría') : '';
        setErrores((anterior) => {
            const copia = { ...anterior };
            if (mensaje) copia[name] = mensaje;
            else delete copia[name];
            return copia;
        });
    };

    const restablecerFormulario = () => {
        setFormulario(inicialFormulario(categoria));
        setErrores({});
        setError('');
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
            await actualizarCategoria(categoria.id_categoria, formulario);
            if (onActualizado) await onActualizado();
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al actualizar la categoría');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo="Editar categoría" subtitulo="Actualiza la información de la categoría" onCerrar={onCerrar}>
            {error && <div className="mb-5"><Alert tipo="error">{error}</Alert></div>}

            <form onSubmit={actualizar} className="space-y-3">
                <Input label="Nombre de la categoría" name="nombre" value={formulario.nombre} error={errores.nombre} onChange={manejarCambio} required />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Select label="Estado" name="estado" value={formulario.estado} onChange={manejarCambio}>
                        <option value="1">Activa</option>
                        <option value="0">Inactiva</option>
                    </Select>
                </div>

                <Textarea label="Descripción" name="descripcion" value={formulario.descripcion} onChange={manejarCambio} rows="4" />

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
