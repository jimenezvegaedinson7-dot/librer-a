import { FaBoxesStacked } from 'react-icons/fa6';

import { FormularioAlta } from '../../components/ui/FormularioAlta';
import { Input, Select } from '../../components/ui/Form';

import useLibros from './useLibros';
import { crearInventario } from './inventarioService';
import { seleccionRequerida, numeroNoNegativo } from '../../lib/utils/validaciones';

const FORMULARIO_VACIO = {
    id_libro: '',
    stock: '0',
    stock_minimo: '5',
    ubicacion: '',
};

const REGLAS = {
    id_libro: [(v) => seleccionRequerida(v, 'Debes seleccionar un libro')],
    stock: [(v) => numeroNoNegativo(v, 'El stock')],
    stock_minimo: [(v) => numeroNoNegativo(v, 'El stock mínimo')],
};

export default function InventarioForm({ onInventarioCreado }) {
    const { libros, cargando: cargandoLibros, error: errorLibros } = useLibros();

    return (
        <FormularioAlta
            titulo="Registrar inventario"
            subtitulo="Complete la información del inventario del libro"
            etiquetaAlta="Nuevo registro"
            icono={<FaBoxesStacked />}
            botonGuardar="Guardar inventario"
            formularioVacio={FORMULARIO_VACIO}
            reglas={REGLAS}
            guardar={crearInventario}
            mensajeExito="Inventario registrado correctamente"
            mensajeError="Error al registrar el inventario"
            onRegistrado={onInventarioCreado}
            errorExterno={cargandoLibros ? null : errorLibros}
            deshabilitarEnvio={cargandoLibros}
            renderCampos={({ formulario, manejarCambio, errores }) => (
                <>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Select
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
                            label="Ubicación"
                            name="ubicacion"
                            value={formulario.ubicacion}
                            onChange={manejarCambio}
                            placeholder="Ej. Estante A - Nivel 2"
                            maxLength="100"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Input
                            label="Stock"
                            name="stock"
                            type="number"
                            min="0"
                            step="1"
                            value={formulario.stock}
                            onChange={manejarCambio}
                            error={errores?.stock}
                            placeholder="0"
                            required
                        />
                        <Input
                            label="Stock mínimo"
                            name="stock_minimo"
                            type="number"
                            min="0"
                            step="1"
                            value={formulario.stock_minimo}
                            onChange={manejarCambio}
                            error={errores?.stock_minimo}
                            placeholder="5"
                            required
                        />
                    </div>
                </>
            )}
        />
    );
}
