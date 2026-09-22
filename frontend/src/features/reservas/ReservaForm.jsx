import { useEffect, useState } from 'react';

import { FaBookmark } from 'react-icons/fa6';

import { FormularioAlta } from '../../components/ui/FormularioAlta';
import { Input, Select } from '../../components/ui/Form';

import { crearReserva, listarLibrosActivos } from './reservasService';
import { seleccionRequerida, cantidadPositiva } from '../../lib/utils/validaciones';

const FORMULARIO_VACIO = { id_libro: '', cantidad: '1', fecha_vencimiento: '' };

const REGLAS = {
    id_libro: [(v) => seleccionRequerida(v, 'Debes seleccionar un libro')],
    cantidad: [(v) => cantidadPositiva(v, 'La cantidad')],
};

export default function ReservaForm({ onReservaCreada }) {
    const [libros, setLibros] = useState([]);
    const [cargandoLibros, setCargandoLibros] = useState(true);
    const [errorLibros, setErrorLibros] = useState('');

    const cargarLibros = async () => {
        try {
            setErrorLibros('');
            setLibros(await listarLibrosActivos());
        } catch {
            setErrorLibros('No se pudieron cargar los libros');
        } finally {
            setCargandoLibros(false);
        }
    };

    useEffect(() => {
        cargarLibros();
    }, []);

    return (
        <FormularioAlta
            titulo="Registrar reserva"
            subtitulo="Complete la información de la nueva reserva"
            etiquetaAlta="Nueva reserva"
            icono={<FaBookmark />}
            botonGuardar="Guardar reserva"
            formularioVacio={FORMULARIO_VACIO}
            reglas={REGLAS}
            guardar={crearReserva}
            mensajeExito="Reserva registrada correctamente"
            mensajeError="Error al registrar la reserva"
            onRegistrado={onReservaCreada}
            errorExterno={errorLibros}
            deshabilitarEnvio={cargandoLibros}
            renderCampos={({ formulario, manejarCambio, errores }) => (
                <div className="form-grid">
                        <Select
                            ancho={6}
                            label="Libro"
                            name="id_libro"
                            value={formulario.id_libro}
                            onChange={manejarCambio}
                            error={errores?.id_libro}
                            disabled={cargandoLibros}
                            required
                        >
                            <option value="">
                                {cargandoLibros ? 'Cargando libros...' : 'Seleccione un libro'}
                            </option>
                            {libros.map((libro) => (
                                <option key={libro.id_libro} value={libro.id_libro}>
                                    {libro.titulo}
                                </option>
                            ))}
                        </Select>
                        <Input
                            ancho={2}
                            label="Cantidad"
                            type="number"
                            name="cantidad"
                            min="1"
                            step="1"
                            value={formulario.cantidad}
                            onChange={manejarCambio}
                            error={errores?.cantidad}
                            required
                        />
                    <div className="md:col-span-4">
                        <Input
                            label="Fecha de vencimiento"
                            type="date"
                            name="fecha_vencimiento"
                            value={formulario.fecha_vencimiento}
                            onChange={manejarCambio}
                        />
                        <p className="mt-2 text-xs text-primary-500">
                            Puedes dejar este campo vacío si todavía no se ha definido una fecha límite.
                        </p>
                    </div>
                </div>
            )}
        />
    );
}
