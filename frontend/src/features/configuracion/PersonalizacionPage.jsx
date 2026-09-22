import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { RotateCcw, Check, Palette, Loader2, X } from 'lucide-react';

import { useTema, COLORES, ZONAS_IDS, ZONAS_DEFAULT } from '../../components/providers/ThemeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';

const OPCIONES = [
    { id: 'default', nombre: 'Predeterminado', hex: '#2563eb' },
    { id: 'azul', nombre: 'Azul', hex: '#2563eb' },
    { id: 'indigo', nombre: 'Indigo', hex: '#4f46e5' },
    { id: 'violeta', nombre: 'Violeta', hex: '#7c3aed' },
    { id: 'tinto', nombre: 'Tinto', hex: '#9333ea' },
    { id: 'cian', nombre: 'Cian', hex: '#0891b2' },
    { id: 'esmeralda', nombre: 'Esmeralda', hex: '#059669' },
    { id: 'lima', nombre: 'Lima', hex: '#65a30d' },
    { id: 'turquesa', nombre: 'Turquesa', hex: '#06b6d4' },
    { id: 'ciclum', nombre: 'Ciclum', hex: '#0ea5e9' },
    { id: 'rosa', nombre: 'Rosa', hex: '#db2777' },
    { id: 'coral', nombre: 'Coral', hex: '#f43f5e' },
    { id: 'naranja', nombre: 'Naranja', hex: '#ea580c' },
    { id: 'amarillo', nombre: 'Amarillo', hex: '#d97706' },
    { id: 'dorado', nombre: 'Dorado', hex: '#ca8a04' },
    { id: 'rojo', nombre: 'Rojo', hex: '#dc2626' },
];

const ZONA_LABELS = {
    sidebar: 'Sidebar',
    topbar: 'Topbar / Navbar',
    buttons: 'Botones principales',
    inputs: 'Formularios e inputs',
    tables: 'Tablas',
    modals: 'Modales',
    badges: 'Badges',
    icons: 'Iconos activos',
    links: 'Enlaces',
    charts: 'Graficos',
};

function ModalAplicar({ colorId, abierto, onCerrar, onAplicar }) {
    const [zonas, setZonas] = useState([...ZONAS_DEFAULT]);
    const [aplicando, setAplicando] = useState(false);
    const [aplicado, setAplicado] = useState(false);

    useEffect(() => {
        if (abierto) {
            setZonas([...ZONAS_DEFAULT]);
            setAplicando(false);
            setAplicado(false);
        }
    }, [abierto]);

    if (!abierto) return null;

    const colorInfo = OPCIONES.find((c) => c.id === colorId) || OPCIONES[0];
    const todasMarcadas = zonas.length === ZONAS_IDS.length;

    const toggleTodo = () => {
        setZonas(todasMarcadas ? [] : [...ZONAS_IDS]);
    };

    const toggleZona = (z) => {
        setZonas((prev) => prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]);
    };

    const aplicar = () => {
        if (zonas.length === 0) return;
        setAplicando(true);
        setTimeout(() => {
            onAplicar(colorId, zonas);
            setAplicando(false);
            setAplicado(true);
            setTimeout(() => { setAplicado(false); onCerrar(); }, 1200);
        }, 600);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg"
                            style={{ backgroundColor: colorInfo.hex + '20' }}
                        >
                            <div className="h-5 w-5 rounded-full" style={{ backgroundColor: colorInfo.hex }} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Aplicar personalizacion</h3>
                            <p className="text-xs text-slate-500">{colorInfo.nombre} seleccionado</p>
                        </div>
                    </div>
                    <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-6 py-4">
                    <p className="mb-3 text-sm font-medium text-slate-700">Donde deseas aplicarlo?</p>

                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 transition-colors hover:bg-slate-100">
                        <input
                            type="checkbox"
                            checked={todasMarcadas}
                            onChange={toggleTodo}
                            className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                        />
                        <span className="text-sm font-semibold text-slate-700">Seleccionar todo</span>
                    </label>

                    <div className="my-3 border-t border-slate-100" />

                    <div className="max-h-[320px] space-y-1 overflow-y-auto">
                        {ZONAS_IDS.map((z) => (
                            <label
                                key={z}
                                className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={zonas.includes(z)}
                                    onChange={() => toggleZona(z)}
                                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                                />
                                <span className="text-sm text-slate-700">{ZONA_LABELS[z]}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-2xl">
                    <button
                        onClick={onCerrar}
                        disabled={aplicando}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={aplicar}
                        disabled={aplicando || zonas.length === 0 || aplicado}
                        className="flex min-w-[130px] items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                        style={{ backgroundColor: colorInfo.hex }}
                    >
                        {aplicando ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Aplicando...
                            </>
                        ) : aplicado ? (
                            <>
                                <Check className="h-4 w-4" />
                                Aplicado
                            </>
                        ) : (
                            'Aplicar cambios'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModalRestablecer({ abierto, onCerrar, onRestablecer, onRestablecerTodo }) {
    const [zonas, setZonas] = useState([]);

    useEffect(() => {
        if (abierto) setZonas([]);
    }, [abierto]);

    if (!abierto) return null;

    const toggleZona = (z) => {
        setZonas((prev) => prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Restablecer</h3>
                        <p className="text-xs text-slate-500">Selecciona que areas quieres restaurar</p>
                    </div>
                    <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-6 py-4">
                    <div className="max-h-[320px] space-y-1 overflow-y-auto">
                        {ZONAS_IDS.map((z) => (
                            <label
                                key={z}
                                className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={zonas.includes(z)}
                                    onChange={() => toggleZona(z)}
                                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                                />
                                <span className="text-sm text-slate-700">{ZONA_LABELS[z]}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-2xl">
                    <button
                        onClick={onCerrar}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => { if (zonas.length > 0) onRestablecer(zonas); onCerrar(); }}
                        disabled={zonas.length === 0}
                        className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restablecer seleccion
                    </button>
                    <button
                        onClick={() => { onRestablecerTodo(); onCerrar(); }}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                    >
                        Restablecer todo
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PersonalizacionPage() {
    const navigate = useNavigate();
    const { config, getColorZona, aplicarColor, restaurarZonas, restaurarTodo } = useTema();

    const [seleccion, setSeleccion] = useState('default');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalRestablecer, setModalRestablecer] = useState(false);

    const colorInfo = OPCIONES.find((c) => c.id === seleccion) || OPCIONES[0];

    return (
        <div className="space-y-6">
            <PageHeader
                icono={<Palette />}
                titulo="Personalizacion"
                descripcion="Personaliza los colores del panel administrativo"
                acciones={
                    <Button variante="secondary" onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <Card>
                        <CardBody>
                            <div className="mb-5">
                                <h2 className="text-base font-semibold text-slate-900">Apariencia del sistema</h2>
                                <p className="mt-1 text-sm text-slate-500">Selecciona un color y presiona Aplicar para elegir donde usarlo.</p>
                            </div>

                            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-8">
                                {OPCIONES.map((color) => {
                                    const activa = seleccion === color.id;
                                    return (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => setSeleccion(color.id)}
                                            className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                                                activa ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-transparent bg-white hover:bg-slate-50 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="relative">
                                                <div
                                                    className="flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: `${color.hex}22` }}
                                                >
                                                    <div className="h-6 w-6 rounded-full shadow-inner" style={{ backgroundColor: color.hex }} />
                                                </div>
                                                {activa && (
                                                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                                                        <Check className="h-2.5 w-2.5 text-slate-900" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-medium ${activa ? 'text-slate-900' : 'text-slate-500'}`}>
                                                {color.nombre}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalAbierto(true)}
                                    className="flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg"
                                    style={{ backgroundColor: colorInfo.hex }}
                                >
                                    Aplicar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModalRestablecer(true)}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Restablecer
                                </button>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody>
                            <h3 className="mb-3 text-sm font-semibold text-slate-900">Zonas activas</h3>
                            <div className="flex flex-wrap gap-2">
                                {ZONAS_IDS.map((z) => {
                                    const colorId = config.zonas[z];
                                    const c = colorId ? (COLORES[colorId] || COLORES.default) : null;
                                    return (
                                        <div
                                            key={z}
                                            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                                            style={{
                                                borderColor: c ? c.primary + '40' : '#e2e8f0',
                                                backgroundColor: c ? c.primarySoft : '#f8fafc',
                                                color: c ? c.text : '#94a3b8',
                                            }}
                                        >
                                            <div
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: c ? c.primary : '#cbd5e1' }}
                                            />
                                            {ZONA_LABELS[z]}
                                            {c && (
                                                <span className="ml-1 text-[10px] opacity-60">
                                                    ({(COLORES[colorId] || COLORES.default).primary})
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <div>
                    <Card>
                        <CardBody>
                            <h3 className="mb-4 text-sm font-semibold text-slate-900">Vista previa</h3>

                            <div className="pointer-events-none space-y-4">
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Sidebar</p>
                                    <div className="rounded-xl p-4" style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #cbd5e1' }}>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                                                <div className="h-3 w-3 rounded bg-blue-500" />
                                                <span className="text-xs font-semibold text-blue-700">Dashboard</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-2">
                                                <div className="h-3 w-3 rounded bg-slate-300" />
                                                <span className="text-xs text-slate-500">Libros</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-2">
                                                <div className="h-3 w-3 rounded bg-slate-300" />
                                                <span className="text-xs text-slate-500">Ventas</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Topbar</p>
                                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                                        <div className="h-3 w-8 rounded bg-slate-200" />
                                        <div className="h-3 w-24 rounded bg-slate-100" />
                                        <div className="ml-auto flex gap-2">
                                            <div className="h-5 w-5 rounded-full bg-slate-200" />
                                            <div className="h-5 w-5 rounded-full bg-slate-200" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Boton</p>
                                    <div className="rounded-lg bg-blue-500 px-4 py-2 text-center text-xs font-semibold text-white shadow">Guardar cambios</div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Input</p>
                                    <div className="rounded-lg border-2 border-blue-400 bg-white px-3 py-2 text-xs text-slate-400">Campo de ejemplo</div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tabla</p>
                                    <div className="overflow-hidden rounded-lg border border-slate-200">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-blue-50">
                                                    <th className="px-3 py-2 text-left font-semibold text-blue-700">Libro</th>
                                                    <th className="px-3 py-2 text-left font-semibold text-blue-700">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t border-slate-100">
                                                    <td className="px-3 py-2 text-slate-600">Cien anios</td>
                                                    <td className="px-3 py-2"><span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white">Activo</span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Badge</p>
                                    <div className="flex gap-2">
                                        <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-semibold text-white">Badge</span>
                                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Otro</span>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Modal</p>
                                    <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                                        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                                                <div className="h-4 w-4 rounded bg-blue-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-900">Titulo</p>
                                                <p className="text-[10px] text-slate-400">Descripcion</p>
                                            </div>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-[11px] text-slate-500">Contenido del modal</p>
                                        </div>
                                        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 rounded-b-xl">
                                            <div className="rounded border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-500">Cancelar</div>
                                            <div className="rounded bg-blue-500 px-3 py-1 text-[10px] font-semibold text-white">Aceptar</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>

            <ModalAplicar
                colorId={seleccion}
                abierto={modalAbierto}
                onCerrar={() => setModalAbierto(false)}
                onAplicar={aplicarColor}
            />

            <ModalRestablecer
                abierto={modalRestablecer}
                onCerrar={() => setModalRestablecer(false)}
                onRestablecer={restaurarZonas}
                onRestablecerTodo={restaurarTodo}
            />
        </div>
    );
}
