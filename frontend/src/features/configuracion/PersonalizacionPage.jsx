import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { RotateCcw, Check, Palette, Loader2 } from 'lucide-react';

import { useTema, COLORES } from '../../components/providers/ThemeContext';
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

function getColores(id) {
    return COLORES[id] || COLORES.default;
}

export default function PersonalizacionPage() {
    const navigate = useNavigate();
    const { colorAcento, cambiarColor, colores } = useTema();

    const [seleccion, setSeleccion] = useState(colorAcento);
    const [pendiente, setPendiente] = useState(false);
    const [aplicado, setAplicado] = useState(false);

    useEffect(() => {
        setSeleccion(colorAcento);
    }, [colorAcento]);

    const coloresPreview = getColores(seleccion);
    const accentVar = coloresPreview.primary;
    const tieneCambios = seleccion !== colorAcento;

    const aplicar = () => {
        if (!tieneCambios) return;
        setPendiente(true);
        setAplicado(false);
        setTimeout(() => {
            cambiarColor(seleccion);
            setPendiente(false);
            setAplicado(true);
            setTimeout(() => setAplicado(false), 2000);
        }, 600);
    };

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
                                <p className="mt-1 text-sm text-slate-500">Selecciona un color y presiona Aplicar para cambiar.</p>
                            </div>

                            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-8">
                                {OPCIONES.map((color) => {
                                    const activa = seleccion === color.id;
                                    return (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => { setSeleccion(color.id); setAplicado(false); }}
                                            className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                                                activa
                                                    ? 'border-slate-900 bg-slate-50 shadow-sm'
                                                    : 'border-transparent bg-white hover:bg-slate-50 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="relative">
                                                <div
                                                    className="flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: `${color.hex}22` }}
                                                >
                                                    <div
                                                        className="h-6 w-6 rounded-full shadow-inner"
                                                        style={{ backgroundColor: color.hex }}
                                                    />
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
                                    onClick={aplicar}
                                    disabled={pendiente || !tieneCambios}
                                    className="relative flex min-w-[120px] items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                                    style={{ backgroundColor: accentVar }}
                                >
                                    {pendiente ? (
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
                                        'Aplicar'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setSeleccion('default'); setAplicado(false); }}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Predeterminado
                                </button>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <div>
                    <Card>
                        <CardBody>
                            <h3 className="mb-4 text-sm font-semibold text-slate-900">Vista previa</h3>

                            <div className="space-y-4">
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Sidebar</p>
                                    <div className="rounded-xl p-4" style={{ backgroundColor: coloresPreview.sidebarBg, borderLeft: `4px solid ${coloresPreview.primary}` }}>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: coloresPreview.primarySoft }}>
                                                <div className="h-3 w-3 rounded" style={{ backgroundColor: coloresPreview.primary }} />
                                                <span className="text-xs font-semibold" style={{ color: coloresPreview.primary }}>Dashboard</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-2">
                                                <div className="h-3 w-3 rounded bg-slate-300" />
                                                <span className="text-xs" style={{ color: coloresPreview.sidebarText }}>Libros</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-2">
                                                <div className="h-3 w-3 rounded bg-slate-300" />
                                                <span className="text-xs" style={{ color: coloresPreview.sidebarText }}>Ventas</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tabla</p>
                                    <div className="overflow-hidden rounded-lg border border-slate-200">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr style={{ backgroundColor: coloresPreview.primarySoft }}>
                                                    <th className="px-3 py-2 text-left font-semibold" style={{ color: coloresPreview.primary }}>Libro</th>
                                                    <th className="px-3 py-2 text-left font-semibold" style={{ color: coloresPreview.primary }}>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t border-slate-100">
                                                    <td className="px-3 py-2 text-slate-700">Cien anios</td>
                                                    <td className="px-3 py-2">
                                                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: coloresPreview.primary }}>Activo</span>
                                                    </td>
                                                </tr>
                                                <tr className="border-t border-slate-100 bg-slate-50/50">
                                                    <td className="px-3 py-2 text-slate-700">Don Quijote</td>
                                                    <td className="px-3 py-2">
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Pendiente</span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Modal</p>
                                    <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                                        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: coloresPreview.primarySoft }}>
                                                <div className="h-4 w-4 rounded" style={{ backgroundColor: coloresPreview.primary }} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">Confirmar</p>
                                                <p className="text-[11px] text-slate-500">Accion requerida</p>
                                            </div>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-xs text-slate-600">¿Deseas guardar los cambios?</p>
                                        </div>
                                        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                                            <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">Cancelar</button>
                                            <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: coloresPreview.primary }}>Aceptar</button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Boton</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-md"
                                            style={{ backgroundColor: accentVar }}
                                        >
                                            Guardar
                                        </button>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: accentVar }}>
                                            Badge
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}
