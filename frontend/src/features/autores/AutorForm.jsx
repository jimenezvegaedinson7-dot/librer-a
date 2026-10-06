import { Feather } from 'lucide-react';

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
            subtitulo="Introduce el nombre y apellido. Puedes añadir más información después."
            icono={<Feather size={20} aria-hidden="true" />}
            botonGuardar="Guardar autor"
            formularioVacio={FORMULARIO_VACIO}
            reglas={REGLAS}
            guardar={crearAutor}
            mensajeExito="Autor registrado correctamente"
            mensajeError="Error al registrar el autor"
            onRegistrado={onAutorCreado}
            renderCampos={({ formulario, manejarCambio, errores }) => (
                <div className="space-y-4">
                    <div className="form-grid">
                        <Input
                            ancho={6}
                            label="Nombre"
                            aria-label="Nombre"
                            name="nombre"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            error={errores?.nombre}
                            placeholder="Ej. Gabriel"
                            required
                            requerido
                        />
                        <Input
                            ancho={6}
                            label="Apellido"
                            aria-label="Apellido"
                            name="apellido"
                            value={formulario.apellido}
                            onChange={manejarCambio}
                            error={errores?.apellido}
                            placeholder="Ej. García Márquez"
                            required
                            requerido
                        />
                    </div>
                    <details className="rounded-lg border border-primary-200 bg-parchment-100 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
                            Información adicional <span className="font-normal text-slate-500">(opcional)</span>
                        </summary>
                        <div className="form-grid mt-4">
                            <Input
                                ancho={12}
                                label="Nacionalidad"
                                name="nacionalidad"
                                value={formulario.nacionalidad}
                                onChange={manejarCambio}
                                placeholder="Ej. Colombiana"
                            />
                            <Textarea
                                ancho={12}
                                label="Biografía"
                                name="biografia"
                                value={formulario.biografia}
                                onChange={manejarCambio}
                                placeholder="Una breve presentación del autor"
                                rows="3"
                            />
                        </div>
                    </details>
                </div>
            )}
        />
    );
}
