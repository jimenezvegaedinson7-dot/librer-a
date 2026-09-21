import { useEffect, useMemo, useState } from 'react';

import {
    FaCartPlus,
    FaFloppyDisk,
    FaLocationDot,
    FaPlus,
    FaRotateLeft,
    FaShop,
    FaTrash,
    FaTruckFast,
} from 'react-icons/fa6';

import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select, Input, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { formatearMoneda } from '../../lib/utils/format';
import { emailValido } from '../../lib/utils/validaciones';

import { listarLibros, crearVenta } from './ventasService';
import { listarDistritosParaEnvio } from './ubicacionesService';
import { listarAgenciasActivas } from '../agencias/agenciasService';

const OPCIONES_ENTREGA = [
    {
        valor: 'tienda',
        titulo: 'Recoger en tienda',
        descripcion: 'El cliente retira en el local',
        icono: <FaShop />,
    },
    {
        valor: 'domicilio',
        titulo: 'A domicilio',
        descripcion: 'Entrega en la dirección del cliente',
        icono: <FaLocationDot />,
    },
    {
        valor: 'agencia',
        titulo: 'Agencia courier',
        descripcion: 'Envío por agencia de transporte',
        icono: <FaTruckFast />,
    },
];

const clasesOpcion = (activa) =>
    [
        'flex flex-col items-start gap-1 rounded-xl border-2 px-4 py-3 text-left transition',
        activa
            ? 'border-primary-600 bg-primary-50 shadow-sm'
            : 'border-primary-200 bg-white hover:border-primary-300 hover:bg-parchment-200',
    ].join(' ');

export default function VentaForm({ onVentaCreada }) {
    const [libros, setLibros] = useState([]);
    const [idLibro, setIdLibro] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [detalles, setDetalles] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [cargandoLibros, setCargandoLibros] = useState(true);
    const [error, setError] = useState('');

    const [tipoEntrega, setTipoEntrega] = useState('tienda');
    const [correoCompra, setCorreoCompra] = useState('');
    const [errorCorreo, setErrorCorreo] = useState('');
    const [distritos, setDistritos] = useState([]);
    const [agencias, setAgencias] = useState([]);
    const [idDistrito, setIdDistrito] = useState('');
    const [direccion, setDireccion] = useState('');
    const [referencia, setReferencia] = useState('');
    const [idAgencia, setIdAgencia] = useState('');
    const [cargandoEnvio, setCargandoEnvio] = useState(true);
    const [errorEnvio, setErrorEnvio] = useState('');

    const cargarLibros = async () => {
        try {
            setCargandoLibros(true);
            setError('');
            const datos = await listarLibros();
            setLibros(datos.filter((libro) => Number(libro.estado) === 1));
        } catch {
            setError('No se pudieron cargar los libros');
        } finally {
            setCargandoLibros(false);
        }
    };

    useEffect(() => {
        cargarLibros();
    }, []);

    useEffect(() => {
        let activo = true;

        const cargarEnvio = async () => {
            try {
                setCargandoEnvio(true);
                setErrorEnvio('');
                const [distritosData, agenciasData] = await Promise.all([
                    listarDistritosParaEnvio(),
                    listarAgenciasActivas(),
                ]);
                if (!activo) return;
                setDistritos(distritosData);
                setAgencias(agenciasData);
            } catch {
                if (activo) setErrorEnvio('No se pudieron cargar los datos de envío');
            } finally {
                if (activo) setCargandoEnvio(false);
            }
        };

        cargarEnvio();

        return () => {
            activo = false;
        };
    }, []);

    const agregarLibro = () => {
        setError('');

        if (!idLibro) {
            setError('Seleccione un libro');
            return;
        }

        if (isNaN(Number(cantidad)) || !Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
            setError('La cantidad debe ser un número entero mayor a 0');
            return;
        }

        const libro = libros.find((item) => Number(item.id_libro) === Number(idLibro));

        if (!libro) {
            setError('Libro no encontrado');
            return;
        }

        const stockDisponible = Number(libro.stock || 0);
        const enDetalle = detalles.find((item) => Number(item.id_libro) === Number(idLibro));
        const yaAgregado = enDetalle ? Number(enDetalle.cantidad) : 0;
        const cantidadTotal = yaAgregado + Number(cantidad);

        if (cantidadTotal > stockDisponible) {
            const sobrante = stockDisponible - yaAgregado;
            if (sobrante <= 0) {
                setError(`Sin stock disponible para "${libro.titulo}". Ya agregaste ${yaAgregado} al detalle.`);
            } else {
                setError(
                    `Stock insuficiente para "${libro.titulo}". Disponible: ${stockDisponible}, ya agregaste ${yaAgregado}. Máximo adicional: ${sobrante}.`,
                );
            }
            return;
        }

        const precio = Number(libro.precio);

        if (!Number.isFinite(precio) || precio < 0) {
            setError('El precio del libro no es válido');
            return;
        }

        const existente = detalles.find((item) => Number(item.id_libro) === Number(idLibro));

        if (existente) {
            setDetalles(
                detalles.map((item) =>
                    Number(item.id_libro) === Number(idLibro)
                        ? { ...item, cantidad: Number(item.cantidad) + Number(cantidad) }
                        : item,
                ),
            );
        } else {
            setDetalles([
                ...detalles,
                {
                    id_libro: libro.id_libro,
                    titulo: libro.titulo,
                    precio,
                    stock: stockDisponible,
                    cantidad: Number(cantidad),
                },
            ]);
        }

        setIdLibro('');
        setCantidad(1);
    };

    const eliminarDetalle = (id_libro) => {
        setDetalles(detalles.filter((item) => Number(item.id_libro) !== Number(id_libro)));
    };

    const subtotal = useMemo(
        () => detalles.reduce((acumulado, detalle) => acumulado + Number(detalle.precio) * Number(detalle.cantidad), 0),
        [detalles],
    );

    const costoEnvio = useMemo(() => {
        if (tipoEntrega === 'tienda') return 0;

        if (tipoEntrega === 'domicilio') {
            const distrito = distritos.find((d) => Number(d.id_distrito) === Number(idDistrito));
            const tarifa = distrito ? Number(distrito.tarifa_envio || 0) : 0;
            return Number.isFinite(tarifa) ? tarifa : 0;
        }

        const agencia = agencias.find((a) => Number(a.id_agencia) === Number(idAgencia));
        const tarifa = agencia ? Number(agencia.tarifa_base || 0) : 0;
        return Number.isFinite(tarifa) ? tarifa : 0;
    }, [tipoEntrega, idDistrito, idAgencia, distritos, agencias]);

    const totalGeneral = subtotal + costoEnvio;

    const limpiar = () => {
        setIdLibro('');
        setCantidad(1);
        setDetalles([]);
        setTipoEntrega('tienda');
        setCorreoCompra('');
        setErrorCorreo('');
        setIdDistrito('');
        setDireccion('');
        setReferencia('');
        setIdAgencia('');
        setError('');
    };

    const guardarVenta = async () => {
        if (detalles.length === 0) {
            setError('Agregue al menos un libro a la venta');
            return;
        }

        if (tipoEntrega === 'domicilio' && !idDistrito) {
            setError('Seleccione el distrito de entrega');
            return;
        }

        if (tipoEntrega === 'domicilio' && !direccion.trim()) {
            setError('Indique la dirección de entrega');
            return;
        }

        if (tipoEntrega === 'agencia' && !idAgencia) {
            setError('Seleccione la agencia de envío');
            return;
        }

        const correo = correoCompra.trim();
        if (correo) {
            const errorCorreoValido = emailValido(correo);
            if (errorCorreoValido) {
                setErrorCorreo(errorCorreoValido);
                return;
            }
        }

        try {
            setGuardando(true);
            setError('');
            const respuesta = await crearVenta({
                detalles,
                tipo_entrega: tipoEntrega,
                id_distrito: tipoEntrega === 'tienda' ? undefined : idDistrito,
                direccion: tipoEntrega === 'domicilio' ? direccion : undefined,
                referencia: tipoEntrega === 'domicilio' ? referencia : undefined,
                id_agencia: tipoEntrega === 'agencia' ? idAgencia : undefined,
                correo_compra: correo || undefined,
            });
            limpiar();
            await cargarLibros();
            if (onVentaCreada) await onVentaCreada(respuesta);
        } catch (err) {
            setError(err.response?.data?.mensaje || err.response?.data?.error || 'Error al registrar la venta');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Card>
            <CardHeader
                titulo="Registrar venta"
                subtitulo="Agrega los libros que formarán parte de la venta."
                acciones={<span className="text-xs font-medium text-primary-400">Nueva venta</span>}
            />
            <CardBody>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center text-mahogany-600">
                        <FaCartPlus />
                    </div>
                </div>

                <div className="mt-5 rounded-xl border-2 border-primary-200 bg-parchment-200 p-5">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px_auto]">
                        <Select label="Libro" value={idLibro} onChange={(e) => setIdLibro(e.target.value)} disabled={cargandoLibros}>
                            <option value="">{cargandoLibros ? 'Cargando libros...' : 'Seleccione un libro'}</option>
                            {libros.map((libro) => (
                                <option key={libro.id_libro} value={libro.id_libro}>
                                    {libro.titulo} — {formatearMoneda(libro.precio)} ({Number(libro.stock || 0)} disp.)
                                </option>
                            ))}
                        </Select>

                        <Input
                            label="Cantidad"
                            type="number"
                            min="1"
                            step="1"
                            value={cantidad}
                            onChange={(e) => setCantidad(e.target.value)}
                            disabled={cargandoLibros}
                        />

                        <div className="flex items-end">
                            <Button onClick={agregarLibro} disabled={cargandoLibros} className="w-full lg:w-auto">
                                <FaPlus /> Agregar
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-5 rounded-xl border-2 border-primary-200 bg-parchment-200 p-4">
                    <p className="mb-2 text-sm font-bold text-mahogany-700">Datos del comprador (opcional)</p>
                    <Input
                        label="Correo del comprador"
                        type="email"
                        value={correoCompra}
                        onChange={(e) => {
                            setCorreoCompra(e.target.value);
                            setErrorCorreo('');
                        }}
                        placeholder="Ej. comprador@correo.com"
                        error={errorCorreo}
                        disabled={guardando}
                    />
                </div>

                <div className="mt-5">
                    <p className="mb-2 text-sm font-bold text-mahogany-700">Tipo de entrega</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {OPCIONES_ENTREGA.map((opcion) => (
                            <button
                                key={opcion.valor}
                                type="button"
                                onClick={() => {
                                    setTipoEntrega(opcion.valor);
                                    setError('');
                                }}
                                className={clasesOpcion(tipoEntrega === opcion.valor)}
                                disabled={guardando}
                            >
                                <span className={`text-lg ${tipoEntrega === opcion.valor ? 'text-mahogany-600' : 'text-primary-400'}`}>
                                    {opcion.icono}
                                </span>
                                <span className={`text-sm font-bold ${tipoEntrega === opcion.valor ? 'text-mahogany-700' : 'text-mahogany-700'}`}>
                                    {opcion.titulo}
                                </span>
                                <span className="text-xs text-primary-400">{opcion.descripcion}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {tipoEntrega === 'domicilio' && (
                    <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl border-2 border-primary-200 bg-parchment-200 p-4 lg:grid-cols-2">
                        <Select
                            label="Distrito de entrega"
                            value={idDistrito}
                            onChange={(e) => setIdDistrito(e.target.value)}
                            disabled={cargandoEnvio || guardando}
                            requerido
                        >
                            <option value="">
                                {cargandoEnvio ? 'Cargando distritos...' : 'Seleccione el distrito'}
                            </option>
                            {distritos.map((distrito) => (
                                <option key={distrito.id_distrito} value={distrito.id_distrito}>
                                    {distrito.nombre} — {formatearMoneda(distrito.tarifa_envio)}
                                </option>
                            ))}
                        </Select>

                        <Input
                            label="Dirección de entrega"
                            type="text"
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                            placeholder="Ej. Av. Lima 123, Urb. El Sol"
                            disabled={guardando}
                            requerido
                        />

                        <Textarea
                            label="Referencias (opcional)"
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            placeholder="Ej. Casa de rejas verdes, segunda cuadra..."
                            rows="2"
                            disabled={guardando}
                            className="lg:col-span-2"
                        />

                        {costoEnvio > 0 && (
                            <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 lg:col-span-2">
                                Costo de envío estimado: {formatearMoneda(costoEnvio)}
                            </p>
                        )}
                    </div>
                )}

                {tipoEntrega === 'agencia' && (
                    <div className="mt-5 rounded-xl border-2 border-primary-200 bg-parchment-200 p-4">
                        <Select
                            label="Agencia de envío"
                            value={idAgencia}
                            onChange={(e) => setIdAgencia(e.target.value)}
                            disabled={cargandoEnvio || guardando}
                            requerido
                        >
                            <option value="">{cargandoEnvio ? 'Cargando agencias...' : 'Seleccione la agencia'}</option>
                            {agencias.map((agencia) => (
                                <option key={agencia.id_agencia} value={agencia.id_agencia}>
                                    {agencia.nombre} — {formatearMoneda(agencia.tarifa_base)}
                                </option>
                            ))}
                        </Select>

                        {costoEnvio > 0 && (
                            <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
                                Costo de envío estimado: {formatearMoneda(costoEnvio)}
                            </p>
                        )}
                    </div>
                )}

                {errorEnvio && (
                    <div className="mt-4">
                        <Alert tipo="error">{errorEnvio}</Alert>
                    </div>
                )}

                {error && (
                    <div className="mt-4">
                        <Alert tipo="error">{error}</Alert>
                    </div>
                )}

                <div className="mt-6 overflow-hidden rounded-xl border-2 border-primary-200">
                    <div className="border-b-2 border-primary-200 bg-parchment-300 px-5 py-4">
                        <h3 className="font-bold text-mahogany-700">Detalle de venta</h3>
                    </div>

                    {detalles.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm font-medium text-primary-500">Todavía no has agregado libros.</p>
                            <p className="mt-1 text-xs text-primary-400">Selecciona un libro y presiona Agregar.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-parchment-200">
                                    <tr className="border-b-2 border-primary-300">
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-mahogany-700">Libro</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-mahogany-700">Precio</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-mahogany-700">Stock disp.</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-mahogany-700">Cantidad</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-mahogany-700">Subtotal</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-mahogany-700">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary-200">
                                    {detalles.map((detalle) => (
                                        <tr key={detalle.id_libro} className="transition hover:bg-parchment-200">
                                            <td className="px-4 py-4 text-sm font-semibold text-mahogany-700">{detalle.titulo}</td>
                                            <td className="px-4 py-4 text-center text-sm text-mahogany-700">{formatearMoneda(detalle.precio)}</td>
                                            <td className="px-4 py-4 text-center text-sm text-primary-500">{Number(detalle.stock || 0)}</td>
                                            <td className="px-4 py-4 text-center text-sm font-semibold text-mahogany-700">{detalle.cantidad}</td>
                                            <td className="px-4 py-4 text-center text-sm font-bold text-mahogany-700">
                                                {formatearMoneda(Number(detalle.precio) * Number(detalle.cantidad))}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarDetalle(detalle.id_libro)}
                                                    disabled={guardando}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-crimson-300 bg-crimson-50 text-crimson-500 transition hover:bg-crimson-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    title="Eliminar libro"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="mt-5 flex justify-end">
                    <div className="min-w-72 rounded-xl border-2 border-primary-200 bg-parchment-200 px-5 py-4">
                        <div className="flex items-center justify-between border-b border-primary-200 pb-2 text-sm">
                            <span className="text-primary-500">Subtotal</span>
                            <span className="font-semibold text-mahogany-700">{formatearMoneda(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 text-sm">
                            <span className="text-primary-500">Envío</span>
                            <span className="font-semibold text-mahogany-700">
                                {costoEnvio > 0 ? formatearMoneda(costoEnvio) : 'Gratis'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-primary-200 pt-2">
                            <span className="text-sm font-semibold text-mahogany-700">Total</span>
                            <span className="text-xl font-semibold text-mahogany-700">{formatearMoneda(totalGeneral)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-primary-200 pt-5 sm:flex-row sm:justify-end">
                    <Button variante="secondary" onClick={limpiar} disabled={guardando}>
                        <FaRotateLeft /> Limpiar
                    </Button>
                    <Button onClick={guardarVenta} disabled={guardando || detalles.length === 0} cargando={guardando}>
                        <FaFloppyDisk /> {guardando ? 'Registrando...' : 'Registrar venta'}
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}
