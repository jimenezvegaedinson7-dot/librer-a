import { useEffect, useMemo, useState } from 'react';

import {
    FaCartPlus,
    FaFloppyDisk,
    FaLocationDot,
    FaPlus,
    FaRotateLeft,
    FaShop,
    FaTrash,
} from 'react-icons/fa6';

import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select, Input, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { formatearMoneda } from '../../lib/utils/format';
import { emailValido } from '../../lib/utils/validaciones';

import { listarLibros, crearVenta } from './ventasService';
import { listarDistritosParaEnvio } from './ubicacionesService';
import SelectorCobro from './SelectorCobro';

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
];

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
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDni, setClienteDni] = useState('');
    const [metodoPago, setMetodoPago] = useState('');
    const [referenciaPago, setReferenciaPago] = useState('');
    const [distritos, setDistritos] = useState([]);
    const [idDistrito, setIdDistrito] = useState('');
    const [direccion, setDireccion] = useState('');
    const [referencia, setReferencia] = useState('');
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
                const distritosData = await listarDistritosParaEnvio();
                if (!activo) return;
                setDistritos(distritosData);
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

        const distrito = distritos.find((d) => Number(d.id_distrito) === Number(idDistrito));
        const tarifa = distrito ? Number(distrito.tarifa_envio || 0) : 0;
        return Number.isFinite(tarifa) ? tarifa : 0;
    }, [tipoEntrega, idDistrito, distritos]);

    const totalGeneral = subtotal + costoEnvio;

    const limpiar = () => {
        setIdLibro('');
        setCantidad(1);
        setDetalles([]);
        setTipoEntrega('tienda');
        setCorreoCompra('');
        setErrorCorreo('');
        setClienteNombre('');
        setClienteDni('');
        setMetodoPago('');
        setReferenciaPago('');
        setIdDistrito('');
        setDireccion('');
        setReferencia('');
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

        if (!metodoPago) {
            setError('Indica cómo pagó el cliente (efectivo, Yape, Plin, tarjeta o transferencia)');
            return;
        }

        const dni = clienteDni.trim();
        if (dni && !/^\d{8}$/.test(dni)) {
            setError('El DNI debe tener 8 dígitos');
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
                correo_compra: correo || undefined,
                cliente_nombre: clienteNombre.trim() || undefined,
                cliente_documento: dni || undefined,
                cliente_tipo_documento: dni ? 'DNI' : undefined,
                metodo_pago: metodoPago,
                referencia_pago: metodoPago !== 'efectivo' ? referenciaPago.trim() || undefined : undefined,
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

    const unidades = detalles.reduce((acc, d) => acc + Number(d.cantidad || 0), 0);

    return (
        <Card className="admin-form-card">
            <CardHeader
                titulo="Registrar venta"
                subtitulo="Venta de mostrador: se registra ya cobrada. Agrega los libros, el comprador, la entrega y cómo pagó."
                icono={<FaCartPlus />}
                acciones={<span>Nueva venta</span>}
            />
            <CardBody>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    {/* Pasos */}
                    <div className="min-w-0 space-y-6">
                        {/* 1. Libros */}
                        <section className="venta-paso" aria-labelledby="paso-libros">
                            <h3 id="paso-libros" className="venta-paso-titulo">
                                <span className="venta-paso-numero" aria-hidden="true">1</span>
                                Libros de la venta
                            </h3>
                            <div className="form-grid items-end">
                                <Select
                                    ancho={8}
                                    label="Libro"
                                    value={idLibro}
                                    onChange={(e) => setIdLibro(e.target.value)}
                                    disabled={cargandoLibros}
                                >
                                    <option value="">{cargandoLibros ? 'Cargando libros...' : 'Seleccione un libro'}</option>
                                    {libros.map((libro) => (
                                        <option key={libro.id_libro} value={libro.id_libro}>
                                            {libro.titulo} — {formatearMoneda(libro.precio)} ({Number(libro.stock || 0)} disp.)
                                        </option>
                                    ))}
                                </Select>
                                <Input
                                    ancho={2}
                                    label="Cantidad"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(e.target.value)}
                                    disabled={cargandoLibros}
                                    className="text-center tabular-nums"
                                />
                                <div className="md:col-span-2">
                                    <Button onClick={agregarLibro} disabled={cargandoLibros} className="h-11 w-full">
                                        <FaPlus /> Agregar
                                    </Button>
                                </div>
                            </div>

                            <div className="venta-detalle mt-4">
                                {detalles.length === 0 ? (
                                    <div className="px-5 py-8 text-center">
                                        <p className="text-sm font-medium text-slate-700">Todavía no has agregado libros.</p>
                                        <p className="mt-1 text-xs text-slate-500">Selecciona un libro, indica la cantidad y presiona Agregar.</p>
                                    </div>
                                ) : (
                                    <div className="tabla-reporte overflow-x-auto">
                                        <table className="min-w-full">
                                            <caption className="sr-only">Libros agregados a la venta</caption>
                                            <thead>
                                                <tr>
                                                    <th scope="col" className="text-left">Libro</th>
                                                    <th scope="col" className="text-right">Precio</th>
                                                    <th scope="col" className="text-center">Cant.</th>
                                                    <th scope="col" className="text-right">Subtotal</th>
                                                    <th scope="col" className="w-12 text-center"><span className="sr-only">Acción</span></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detalles.map((detalle) => (
                                                    <tr key={detalle.id_libro}>
                                                        <td>
                                                            <p className="font-semibold text-slate-800">{detalle.titulo}</p>
                                                            <p className="text-xs text-slate-500">{Number(detalle.stock || 0)} disponibles</p>
                                                        </td>
                                                        <td className="text-right">{formatearMoneda(detalle.precio)}</td>
                                                        <td className="text-center font-semibold">{detalle.cantidad}</td>
                                                        <td className="text-right font-semibold text-slate-800">
                                                            {formatearMoneda(Number(detalle.precio) * Number(detalle.cantidad))}
                                                        </td>
                                                        <td className="text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => eliminarDetalle(detalle.id_libro)}
                                                                disabled={guardando}
                                                                className="venta-quitar"
                                                                title="Quitar libro"
                                                                aria-label={`Quitar ${detalle.titulo}`}
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
                        </section>

                        {/* 2. Comprador */}
                        <section className="venta-paso" aria-labelledby="paso-comprador">
                            <h3 id="paso-comprador" className="venta-paso-titulo">
                                <span className="venta-paso-numero" aria-hidden="true">2</span>
                                Comprador <span className="font-normal text-slate-500">(opcional)</span>
                            </h3>
                            <div className="form-grid">
                                <Input
                                    ancho={7}
                                    label="Nombre del cliente"
                                    type="text"
                                    value={clienteNombre}
                                    onChange={(e) => setClienteNombre(e.target.value)}
                                    maxLength={255}
                                    placeholder="Ej. Juan Pérez"
                                    disabled={guardando}
                                />
                                <Input
                                    ancho={5}
                                    label="DNI"
                                    type="text"
                                    inputMode="numeric"
                                    value={clienteDni}
                                    onChange={(e) => setClienteDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="8 dígitos"
                                    disabled={guardando}
                                />
                                <Input
                                    ancho={7}
                                    label="Correo del comprador"
                                    type="email"
                                    value={correoCompra}
                                    onChange={(e) => {
                                        setCorreoCompra(e.target.value);
                                        setErrorCorreo('');
                                    }}
                                    placeholder="comprador@correo.com"
                                    error={errorCorreo}
                                    disabled={guardando}
                                />
                            </div>
                            {totalGeneral > 700 && (!clienteNombre.trim() || !clienteDni.trim()) && (
                                <p className="mt-2 text-xs text-amber-700">
                                    Para emitir una boleta de más de S/ 700 se necesitan el nombre y el DNI del cliente.
                                </p>
                            )}
                        </section>

                        {/* 3. Entrega */}
                        <section className="venta-paso" aria-labelledby="paso-entrega">
                            <h3 id="paso-entrega" className="venta-paso-titulo">
                                <span className="venta-paso-numero" aria-hidden="true">3</span>
                                Tipo de entrega
                            </h3>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de entrega">
                                {OPCIONES_ENTREGA.map((opcion) => {
                                    const activa = tipoEntrega === opcion.valor;
                                    return (
                                        <button
                                            key={opcion.valor}
                                            type="button"
                                            role="radio"
                                            aria-checked={activa}
                                            onClick={() => {
                                                setTipoEntrega(opcion.valor);
                                                setError('');
                                            }}
                                            className={`venta-opcion ${activa ? 'venta-opcion--activa' : ''}`}
                                            disabled={guardando}
                                        >
                                            <span className="venta-opcion-icono" aria-hidden="true">{opcion.icono}</span>
                                            <span className="text-sm font-semibold text-slate-800">{opcion.titulo}</span>
                                            <span className="text-xs text-slate-500">{opcion.descripcion}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {tipoEntrega === 'domicilio' && (
                                <div className="form-grid mt-4">
                                    <Select
                                        ancho={5}
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
                                        ancho={7}
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
                                    />
                                </div>
                            )}

                        </section>

                        {/* 4. Cobro */}
                        <section className="venta-paso" aria-labelledby="paso-cobro">
                            <h3 id="paso-cobro" className="venta-paso-titulo">
                                <span className="venta-paso-numero" aria-hidden="true">4</span>
                                Cobro
                            </h3>
                            <SelectorCobro
                                metodo={metodoPago}
                                onMetodo={(valor) => {
                                    setMetodoPago(valor);
                                    setError('');
                                }}
                                referencia={referenciaPago}
                                onReferencia={setReferenciaPago}
                                deshabilitado={guardando}
                            />
                        </section>

                        {errorEnvio && <Alert tipo="error">{errorEnvio}</Alert>}
                        {error && <Alert tipo="error">{error}</Alert>}
                    </div>

                    {/* Resumen */}
                    <aside className="venta-resumen" aria-label="Resumen de la venta">
                        <p className="kpi-label">Resumen</p>
                        <dl className="mt-4 space-y-2.5 text-sm">
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">Libros</dt>
                                <dd className="font-medium tabular-nums text-slate-800">
                                    {detalles.length} {detalles.length === 1 ? 'título' : 'títulos'} · {unidades} {unidades === 1 ? 'unidad' : 'unid.'}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">Subtotal</dt>
                                <dd className="font-medium tabular-nums text-slate-800">{formatearMoneda(subtotal)}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">Envío</dt>
                                <dd className="font-medium tabular-nums text-slate-800">
                                    {costoEnvio > 0 ? formatearMoneda(costoEnvio) : 'Gratis'}
                                </dd>
                            </div>
                        </dl>
                        <div className="venta-total">
                            <span className="text-sm font-semibold text-slate-700">Total</span>
                            <span className="venta-total-valor">{formatearMoneda(totalGeneral)}</span>
                        </div>

                        <div className="mt-5 flex flex-col gap-2.5">
                            <Button onClick={guardarVenta} disabled={guardando || detalles.length === 0} cargando={guardando} tamano="lg" className="w-full">
                                <FaFloppyDisk /> {guardando ? 'Registrando...' : 'Registrar venta cobrada'}
                            </Button>
                            <Button variante="secondary" onClick={limpiar} disabled={guardando} className="w-full">
                                <FaRotateLeft /> Limpiar
                            </Button>
                        </div>
                        {detalles.length === 0 && (
                            <p className="mt-3 text-center text-xs text-slate-500">Agrega al menos un libro para registrar la venta.</p>
                        )}
                    </aside>
                </div>
            </CardBody>
        </Card>
    );
}
