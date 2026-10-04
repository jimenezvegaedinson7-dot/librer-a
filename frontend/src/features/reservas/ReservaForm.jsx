import { useEffect, useState } from 'react';

import { FaBookmark } from 'react-icons/fa6';

import { FormularioAlta } from '../../components/ui/FormularioAlta';
import { Input, Select } from '../../components/ui/Form';

import { crearReserva, listarLibrosActivos } from './reservasService';
import { seleccionRequerida, cantidadPositiva } from '../../lib/utils/validaciones';
import { useAuth } from '../auth/AuthContext';
import { listarUsuarios } from '../usuarios/usuariosService';
import { esCuentaEliminada } from '../../lib/utils/cuentas';

const FORMULARIO_VACIO = { id_libro: '', cantidad: '1', fecha_vencimiento: '', id_usuario_cliente: '' };

const REGLAS = {
    id_libro: [(v) => seleccionRequerida(v, 'Debes seleccionar un libro')],
    cantidad: [(v) => cantidadPositiva(v, 'La cantidad')],
};

export default function ReservaForm({ onReservaCreada }) {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'administrador';
    const [clientes, setClientes] = useState([]);
    const [libros, setLibros] = useState([]);
    const [cargandoLibros, setCargandoLibros] = useState(true);
    const [errorLibros, setErrorLibros] = useState('');

    // Catálogo de libros: viene del servidor, así que se sincroniza con un
    // efecto. `cargandoLibros` ya nace en true, por lo que este efecto no
    // enciende el spinner, solo espera la respuesta. `vigente` evita fijar
    // estado si el formulario se desmonta antes de que responda.
    useEffect(() => {
        let vigente = true;

        (async () => {
            try {
                const [datos, cuentas] = await Promise.all([listarLibrosActivos(), esAdmin ? listarUsuarios(false) : Promise.resolve([])]);
                if (vigente) {
                    setLibros(datos);
                    setClientes(cuentas.filter(c => c.rol === 'cliente' && Number(c.estado) === 1 && c.email_verified_at && !esCuentaEliminada(c)));
                }
            } catch {
                if (vigente) setErrorLibros('No se pudieron cargar los libros o clientes. Actualiza la página para intentarlo de nuevo.');
            } finally {
                if (vigente) setCargandoLibros(false);
            }
        })();

        return () => {
            vigente = false;
        };
    }, [esAdmin]);

    return (
        <FormularioAlta
            titulo="Registrar reserva"
            subtitulo="Complete la información de la nueva reserva"
            etiquetaAlta="Nueva reserva"
            icono={<FaBookmark />}
            botonGuardar="Guardar reserva"
            formularioVacio={FORMULARIO_VACIO}
            reglas={esAdmin ? { ...REGLAS, id_usuario_cliente: [(v) => seleccionRequerida(v, 'Selecciona el cliente de la reserva')] } : REGLAS}
            guardar={(formulario) => crearReserva(formulario, esAdmin)}
            mensajeExito="Reserva registrada correctamente"
            mensajeError="Error al registrar la reserva"
            onRegistrado={onReservaCreada}
            errorExterno={errorLibros}
            deshabilitarEnvio={cargandoLibros || Boolean(errorLibros)}
            renderCampos={({ formulario, manejarCambio, errores }) => (
                <div className="form-grid">
                    {esAdmin && <Select ancho={12} label="Cliente de la reserva" name="id_usuario_cliente"
                        value={formulario.id_usuario_cliente} onChange={manejarCambio} error={errores?.id_usuario_cliente} required disabled={cargandoLibros}>
                        <option value="">Seleccione un cliente activo y verificado</option>
                        {clientes.map(c => <option key={c.id_usuario} value={c.id_usuario}>{c.nombre} {c.apellido} · {c.email}</option>)}
                    </Select>}
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
                            Si lo dejas vacío, la reserva vence en 14 días.
                        </p>
                    </div>
                </div>
            )}
        />
    );
}
