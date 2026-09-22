import { FaUserPen } from 'react-icons/fa6';

import { FormularioAlta } from '../../components/ui/FormularioAlta';
import { Input, Textarea } from '../../components/ui/Form';

import { crearAutor } from './autoresService';
import { requerido } from '../../lib/utils/validaciones';

const FORMULARIO_VACIO = { nombre: '', apellido: '', nacionalidad: '', biografia: '' };

const REGLAS = {
    nombre: [(v) => requerido(v, 'El nombre')],
    apellido: [(v) => requerido(v, 'El apellido')],
};

export default function AutorForm({ onAutorCreado }) {
    return (
        <FormularioAlta
            titulo="Registrar autor"
            subtitulo="Complete la información del nuevo autor"
            etiquetaAlta="Nuevo registro"
            icono={<FaUserPen />}
            botonGuardar="Guardar autor"
            formularioVacio={FORMULARIO_VACIO}
            reglas={REGLAS}
            guardar={crearAutor}
            mensajeExito="Autor registrado correctamente"
            mensajeError="Error al registrar el autor"
            onRegistrado={onAutorCreado}
            renderCampos={({ formulario, manejarCambio, errores }) => (
                <div className="form-grid">
                        <Input
                            ancho={4}
                            label="Nombre"
                            name="nombre"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            error={errores?.nombre}
                            placeholder="Ej. Gabriel"
                            required
                        />
                        <Input
                            ancho={4}
                            label="Apellido"
                            name="apellido"
                            value={formulario.apellido}
                            onChange={manejarCambio}
                            error={errores?.apellido}
                            placeholder="Ej. García Márquez"
                            required
                        />
                    <Input
                        ancho={4}
                        label="Nacionalidad"
                        name="nacionalidad"
                        value={formulario.nacionalidad}
                        onChange={manejarCambio}
                        placeholder="Ej. Colombiana"
                    />
                    <Textarea
                        label="Biografía"
                        name="biografia"
                        value={formulario.biografia}
                        onChange={manejarCambio}
                        placeholder="Escriba una breve biografía del autor"
                        rows="4"
                    />
                </div>
            )}
        />
    );
}
