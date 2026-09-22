import { FaTags } from 'react-icons/fa6';

import { FormularioAlta } from '../../components/ui/FormularioAlta';
import { Input, Textarea } from '../../components/ui/Form';

import { crearCategoria } from './categoriasService';
import { requerido } from '../../lib/utils/validaciones';

const FORMULARIO_VACIO = { nombre: '', descripcion: '' };

const REGLAS = {
    nombre: [(v) => requerido(v, 'El nombre de la categoría')],
};

export default function CategoriaForm({ onCategoriaCreada }) {
    return (
        <FormularioAlta
            titulo="Registrar categoría"
            subtitulo="Complete la información de la nueva categoría"
            etiquetaAlta="Nuevo registro"
            icono={<FaTags />}
            botonGuardar="Guardar categoría"
            formularioVacio={FORMULARIO_VACIO}
            reglas={REGLAS}
            guardar={crearCategoria}
            mensajeExito="Categoría registrada correctamente"
            mensajeError="Error al registrar la categoría"
            onRegistrado={onCategoriaCreada}
            renderCampos={({ formulario, manejarCambio, errores }) => (
                <div className="form-grid">
                    <Input
                        ancho={6}
                        label="Nombre de la categoría"
                        name="nombre"
                        value={formulario.nombre}
                        onChange={manejarCambio}
                        error={errores?.nombre}
                        placeholder="Ej. Literatura"
                        required
                    />
                    <Textarea
                        label="Descripción"
                        name="descripcion"
                        value={formulario.descripcion}
                        onChange={manejarCambio}
                        placeholder="Escriba una descripción de la categoría"
                        rows="4"
                    />
                </div>
            )}
        />
    );
}
