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

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function softColor(hex, opacity) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${opacity})`;
}

function ModalAplicar({ colorId, abierto, onCerrar, onAplicar }) {
    const [zonas, setZonas] = useState([...ZONAS_DEFAULT]);
    const [aplicando, setAplicando] = useState(false);
    const [aplicado, setAplicado] = useState(false);

    useEffect(() => {
        if (abierto) { setZonas([...ZONAS_DEFAULT]); setAplicando(false); setAplicado(false); }
    }, [abierto]);

    if (!abierto) return null;

    const colorInfo = OPCIONES.find((c) => c.id === colorId) || OPCIONES[0];
    const todasMarcadas = zonas.length === ZONAS_IDS.length;

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
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: softColor(colorInfo.hex, 0.12) }}>
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
                        <input type="checkbox" checked={todasMarcadas} onChange={() => setZonas(todasMarcadas ? [] : [...ZONAS_IDS])} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
                        <span className="text-sm font-semibold text-slate-700">Seleccionar todo</span>
                    </label>
                    <div className="my-3 border-t border-slate-100" />
                    <div className="max-h-[320px] space-y-1 overflow-y-auto">
                        {ZONAS_IDS.map((z) => (
                            <label key={z} className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-slate-50">
                                <input type="checkbox" checked={zonas.includes(z)} onChange={() => setZonas((p) => p.includes(z) ? p.filter((x) => x !== z) : [...p, z])} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
                                <span className="text-sm text-slate-700">{ZONA_LABELS[z]}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-2xl">
                    <button onClick={onCerrar} disabled={aplicando} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                    <button onClick={aplicar} disabled={aplicando || zonas.length === 0 || aplicado} className="flex min-w-[130px] items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ backgroundColor: colorInfo.hex }}>
                        {aplicando ? <><Loader2 className="h-4 w-4 animate-spin" />Aplicando...</> : aplicado ? <><Check className="h-4 w-4" />Aplicado</> : 'Aplicar cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModalRestablecer({ abierto, onCerrar, onRestablecer, onRestablecerTodo }) {
    const [zonas, setZonas] = useState([]);
    useEffect(() => { if (abierto) setZonas([]); }, [abierto]);
    if (!abierto) return null;

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
                            <label key={z} className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-slate-50">
                                <input type="checkbox" checked={zonas.includes(z)} onChange={() => setZonas((p) => p.includes(z) ? p.filter((x) => x !== z) : [...p, z])} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
                                <span className="text-sm text-slate-700">{ZONA_LABELS[z]}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-2xl">
                    <button onClick={onCerrar} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Cancelar</button>
                    <button onClick={() => { if (zonas.length > 0) onRestablecer(zonas); onCerrar(); }} disabled={zonas.length === 0} className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                        <RotateCcw className="h-3.5 w-3.5" />Restablecer seleccion
                    </button>
                    <button onClick={() => { onRestablecerTodo(); onCerrar(); }} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700">
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
    const hex = colorInfo.hex;
    const soft = softColor(hex, 0.10);
    const soft2 = softColor(hex, 0.15);
    const border = softColor(hex, 0.40);

    return (
        <div className="space-y-6">
            <PageHeader
                icono={<Palette />}
                titulo="Personalizacion"
                descripcion="Personaliza los colores del panel administrativo"
                acciones={<Button variante="secondary" onClick={() => navigate(-1)}>Volver</Button>}
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
                                        <button key={color.id} type="button" onClick={() => setSeleccion(color.id)}
                                            className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${activa ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-transparent bg-white hover:bg-slate-50 hover:shadow-sm'}`}>
                                            <div className="relative">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110" style={{ backgroundColor: softColor(color.hex, 0.12) }}>
                                                    <div className="h-6 w-6 rounded-full shadow-inner" style={{ backgroundColor: color.hex }} />
                                                </div>
                                                {activa && (
                                                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                                                        <Check className="h-2.5 w-2.5 text-slate-900" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-medium ${activa ? 'text-slate-900' : 'text-slate-500'}`}>{color.nombre}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-5 flex items-center gap-3">
                                <button type="button" onClick={() => setModalAbierto(true)} className="flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg" style={{ backgroundColor: hex }}>Aplicar</button>
                                <button type="button" onClick={() => setModalRestablecer(true)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50">
                                    <RotateCcw className="h-3.5 w-3.5" />Restablecer
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
                                        <div key={z} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                                            style={{ borderColor: c ? c.primary + '40' : '#e2e8f0', backgroundColor: c ? c.primarySoft : '#f8fafc', color: c ? c.text : '#94a3b8' }}>
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c ? c.primary : '#cbd5e1' }} />
                                            {ZONA_LABELS[z]}
                                            {c && <span className="ml-1 text-[10px] opacity-60">({c.primary})</span>}
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
                            <div className="pointer-events-none space-y-5">

                                {/* SIDEBAR */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Sidebar</p>
                                    <div className="overflow-hidden rounded-xl border" style={{ backgroundColor: soft, borderColor: border, borderLeftWidth: '4px' }}>
                                        <div className="px-4 pt-3 pb-1">
                                            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: hex }}>General</p>
                                        </div>
                                        <div className="space-y-1 px-2 pb-2">
                                            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: soft2 }}>
                                                <div className="h-3 w-3 rounded" style={{ backgroundColor: hex }} />
                                                <span className="text-xs font-semibold" style={{ color: hex }}>Dashboard</span>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                                                <div className="h-3 w-3 rounded bg-slate-300" />
                                                <span className="text-xs text-slate-500">Libros</span>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                                                <div className="h-3 w-3 rounded bg-slate-300" />
                                                <span className="text-xs text-slate-500">Ventas</span>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                                                <div className="h-3 w-3 rounded bg-slate-300" />
                                                <span className="text-xs text-slate-500">Clientes</span>
                                            </div>
                                        </div>
                                        <div className="border-t px-4 py-2" style={{ borderColor: border }}>
                                            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: hex, opacity: 0.6 }}>Sistema</p>
                                        </div>
                                    </div>
                                </div>

                                {/* TOPBAR */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Topbar</p>
                                    <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-2.5 shadow-sm" style={{ borderColor: border }}>
                                        <div className="flex gap-1.5">
                                            <div className="h-1 w-4 rounded bg-slate-300" />
                                            <div className="h-1 w-4 rounded bg-slate-300" />
                                            <div className="h-1 w-4 rounded bg-slate-300" />
                                        </div>
                                        <div className="h-3 w-20 rounded bg-slate-100" />
                                        <div className="ml-auto flex items-center gap-2">
                                            <div className="h-5 w-5 rounded-full" style={{ backgroundColor: soft }} />
                                            <div className="h-5 w-5 rounded-full" style={{ backgroundColor: soft }} />
                                        </div>
                                    </div>
                                </div>

                                {/* BOTON */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Boton principal</p>
                                    <div className="flex gap-2">
                                        <div className="rounded-lg px-4 py-2 text-xs font-semibold text-white shadow" style={{ backgroundColor: hex }}>Guardar cambios</div>
                                        <div className="rounded-lg border bg-white px-4 py-2 text-xs font-medium text-slate-600" style={{ borderColor: border }}>Cancelar</div>
                                    </div>
                                </div>

                                {/* INPUT */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Input enfocado</p>
                                    <div className="rounded-lg border-2 bg-white px-3 py-2 text-xs text-slate-400" style={{ borderColor: hex }}>Campo de ejemplo</div>
                                </div>

                                {/* TABLA */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tabla</p>
                                    <div className="overflow-hidden rounded-lg border border-slate-200">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr style={{ backgroundColor: soft }}>
                                                    <th className="px-3 py-2 text-left font-semibold" style={{ color: hex }}>Libro</th>
                                                    <th className="px-3 py-2 text-left font-semibold" style={{ color: hex }}>Autor</th>
                                                    <th className="px-3 py-2 text-left font-semibold" style={{ color: hex }}>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t border-slate-100">
                                                    <td className="px-3 py-2 text-slate-700">Cien anios</td>
                                                    <td className="px-3 py-2 text-slate-500">Garcia Marquez</td>
                                                    <td className="px-3 py-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: hex }}>Activo</span></td>
                                                </tr>
                                                <tr className="border-t border-slate-100 bg-slate-50/50">
                                                    <td className="px-3 py-2 text-slate-700">Don Quijote</td>
                                                    <td className="px-3 py-2 text-slate-500">Cervantes</td>
                                                    <td className="px-3 py-2"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Pendiente</span></td>
                                                </tr>
                                                <tr className="border-t border-slate-100">
                                                    <td className="px-3 py-2 text-slate-700">La Sombra</td>
                                                    <td className="px-3 py-2 text-slate-500">Borges</td>
                                                    <td className="px-3 py-2"><span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Pagado</span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* BADGES */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Badges</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: hex }}>Activo</span>
                                        <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: softColor(hex, 0.7) }}>Pendiente</span>
                                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Neutral</span>
                                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-semibold text-red-700">Cancelado</span>
                                    </div>
                                </div>

                                {/* TABS */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tabs</p>
                                    <div className="flex gap-0 border-b-2" style={{ borderColor: '#e2e8f0' }}>
                                        <div className="border-b-2 px-3 py-1.5 text-xs font-semibold" style={{ borderColor: hex, color: hex }}>General</div>
                                        <div className="border-b-2 border-transparent px-3 py-1.5 text-xs text-slate-400">Detalle</div>
                                        <div className="border-b-2 border-transparent px-3 py-1.5 text-xs text-slate-400">Historial</div>
                                    </div>
                                </div>

                                {/* MODAL */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Modal</p>
                                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: soft }}>
                                                <div className="h-4 w-4 rounded" style={{ backgroundColor: hex }} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-900">Confirmar accion</p>
                                                <p className="text-[10px] text-slate-400">Esta accion no se puede deshacer</p>
                                            </div>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-[11px] text-slate-600">¿Deseas eliminar este registro permanentemente?</p>
                                        </div>
                                        <div className="flex justify-end gap-2 border-t bg-slate-50 px-4 py-2.5 rounded-b-xl" style={{ borderColor: '#f1f5f9' }}>
                                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-500">Cancelar</div>
                                            <div className="rounded-lg px-3 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: hex }}>Eliminar</div>
                                        </div>
                                    </div>
                                </div>

                                {/* LINKS */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Enlaces</p>
                                    <div className="flex gap-4 text-xs">
                                        <span className="underline underline-offset-2 font-medium" style={{ color: hex }}>Ver detalles</span>
                                        <span className="underline underline-offset-2 font-medium" style={{ color: hex }}>Editar</span>
                                        <span className="text-red-500 underline underline-offset-2 font-medium">Eliminar</span>
                                    </div>
                                </div>

                                {/* ENCADEZADO */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Encabezado de pagina</p>
                                    <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: border }}>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: soft }}>
                                                <div className="h-5 w-5 rounded-lg" style={{ backgroundColor: hex }} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Libros</p>
                                                <p className="text-[11px] text-slate-400">Gestion de inventario</p>
                                            </div>
                                        </div>
                                        <div className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: hex }}>+ Nuevo</div>
                                    </div>
                                </div>

                                {/* PAGINACION */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Paginacion</p>
                                    <div className="flex items-center gap-1">
                                        <div className="h-7 w-7 rounded border border-slate-200 bg-white text-[10px] text-slate-400 flex items-center justify-center">&lt;</div>
                                        <div className="h-7 w-7 rounded text-[10px] font-semibold text-white flex items-center justify-center" style={{ backgroundColor: hex }}>1</div>
                                        <div className="h-7 w-7 rounded border border-slate-200 bg-white text-[10px] text-slate-600 flex items-center justify-center">2</div>
                                        <div className="h-7 w-7 rounded border border-slate-200 bg-white text-[10px] text-slate-600 flex items-center justify-center">3</div>
                                        <div className="h-7 w-7 rounded border border-slate-200 bg-white text-[10px] text-slate-400 flex items-center justify-center">&gt;</div>
                                    </div>
                                </div>

                                {/* CHIPS / FILTROS */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Chips / Filtros</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: hex }}>
                                            Todos <span className="ml-0.5 opacity-70">x</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[10px] font-medium" style={{ borderColor: border, color: hex }}>
                                            Activos <span className="ml-0.5 opacity-50">x</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500">
                                            Pendientes <span className="ml-0.5 opacity-50">x</span>
                                        </span>
                                    </div>
                                </div>

                                {/* ALERTA / TOAST */}
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Alerta / Toast</p>
                                    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: border, backgroundColor: soft }}>
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: hex }}>
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold" style={{ color: hex }}>Guardado correctamente</p>
                                            <p className="text-[10px] text-slate-500">Los cambios se han aplicado</p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>

            <ModalAplicar colorId={seleccion} abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} onAplicar={aplicarColor} />
            <ModalRestablecer abierto={modalRestablecer} onCerrar={() => setModalRestablecer(false)} onRestablecer={restaurarZonas} onRestablecerTodo={restaurarTodo} />
        </div>
    );
}
