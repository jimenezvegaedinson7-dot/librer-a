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
            subtitulo="Solo necesitas un nombre. La descripción es opcional."
            icono={<FaTags />}
            botonGuardar="Guardar categoría"
            formularioVacio={FORMULARIO_VACIO}
            reglas={REGLAS}
            guardar={crearCategoria}
            mensajeExito="Categoría registrada correctamente"
            mensajeError="Error al registrar la categoría"
            onRegistrado={onCategoriaCreada}
            renderCampos={({ formulario, manejarCambio, errores }) => (
                <div className="space-y-4">
                    <Input
                        label="Nombre de la categoría"
                        aria-label="Nombre de la categoría"
                        name="nombre"
                        value={formulario.nombre}
                        onChange={manejarCambio}
                        error={errores?.nombre}
                        placeholder="Ej. Literatura"
                        required
                        requerido
                    />
                    <details className="rounded-lg border border-primary-200 bg-parchment-100 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
                            Añadir descripción <span className="font-normal text-slate-500">(opcional)</span>
                        </summary>
                        <div className="mt-4">
                            <Textarea
                                label="Descripción"
                                name="descripcion"
                                value={formulario.descripcion}
                                onChange={manejarCambio}
                                placeholder="Ej. Novelas, cuentos y poesía"
                                rows="3"
                            />
                        </div>
                    </details>
                </div>
            )}
        />
    );
}
