import { useEffect, useState } from 'react';

import { FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { actualizarAutor } from './autoresService';
import { requerido, validarFormulario } from '../../lib/utils/validaciones';

const REGLAS = {
    nombre: [(v) => requerido(v, 'El nombre')],
    apellido: [(v) => requerido(v, 'El apellido')],
};

function inicialFormulario(autor) {
    return {
        nombre: autor.nombre || '',
        apellido: autor.apellido || '',
        nacionalidad: autor.nacionalidad || '',
        biografia: autor.biografia || '',
        estado: autor.estado !== undefined && autor.estado !== null ? String(autor.estado) : '1',
    };
}

export default function AutorEditModal({ autor, abierto, onCerrar, onActualizado }) {
    const [formulario, setFormulario] = useState(inicialFormulario(autor || {}));
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!abierto || !autor) return;
        setFormulario(inicialFormulario(autor));
        setErrores({});
        setError('');
    }, [abierto, autor]);

    if (!abierto || !autor) return null;

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

    const restablecerFormulario = () => {
        setFormulario(inicialFormulario(autor));
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
            await actualizarAutor(autor.id_autor, formulario);
            if (onActualizado) await onActualizado();
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al actualizar el autor');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo="Editar autor" subtitulo="Actualiza la información del autor" onCerrar={onCerrar}>
            {error && <div className="mb-5"><Alert tipo="error">{error}</Alert></div>}

            <form onSubmit={actualizar} className="space-y-3">
                <div className="form-grid">
                    <Input ancho={6} label="Nombre" name="nombre" value={formulario.nombre} error={errores.nombre} onChange={manejarCambio} required />
                    <Input ancho={6} label="Apellido" name="apellido" value={formulario.apellido} error={errores.apellido} onChange={manejarCambio} required />
                    <Input ancho={8} label="Nacionalidad" name="nacionalidad" value={formulario.nacionalidad} onChange={manejarCambio} />
                    <Select ancho={4} label="Estado" name="estado" value={formulario.estado} onChange={manejarCambio}>
                        <option value="1">Activo</option>
                        <option value="0">Inactivo</option>
                    </Select>
                </div>

                <Textarea label="Biografía" name="biografia" value={formulario.biografia} onChange={manejarCambio} rows="4" />

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
    );
}
