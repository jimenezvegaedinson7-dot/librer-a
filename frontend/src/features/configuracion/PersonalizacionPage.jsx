import { useTema, COLORES } from '../../components/providers/ThemeContext';

import { useNavigate } from 'react-router-dom';
import { RotateCcw, Check, Palette } from 'lucide-react';

import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';

const OPCIONES = [
    { id: 'default', nombre: 'Predeterminado', hex: '#2563eb' },
    { id: 'azul', nombre: 'Azul', hex: '#3b82f6' },
    { id: 'indigo', nombre: 'Indigo', hex: '#6366f1' },
    { id: 'violeta', nombre: 'Violeta', hex: '#8b5cf6' },
    { id: 'esmeralda', nombre: 'Esmeralda', hex: '#10b981' },
    { id: 'turquesa', nombre: 'Turquesa', hex: '#06b6d4' },
    { id: 'rosa', nombre: 'Rosa', hex: '#ec4899' },
    { id: 'naranja', nombre: 'Naranja', hex: '#f97316' },
    { id: 'rojo', nombre: 'Rojo', hex: '#ef4444' },
];

export default function PersonalizacionPage() {
    const navigate = useNavigate();
    const { colorAcento, cambiarColor, colores } = useTema();

    const colorInfo = OPCIONES.find((c) => c.id === colorAcento) || OPCIONES[0];
    const accentVar = colores.primary;

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
                                <p className="mt-1 text-sm text-slate-500">Selecciona el color principal que deseas utilizar en el panel.</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
                                {OPCIONES.map((color) => {
                                    const activa = colorAcento === color.id;
                                    return (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => cambiarColor(color.id)}
                                            className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                                                activa
                                                    ? 'border-slate-900 bg-slate-50 shadow-sm'
                                                    : 'border-transparent bg-white hover:bg-slate-50 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="relative">
                                                <div
                                                    className="flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: `${color.hex}18` }}
                                                >
                                                    <div
                                                        className="h-6 w-6 rounded-full"
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
                        </CardBody>
                    </Card>
                </div>

                <div>
                    <Card>
                        <CardBody>
                            <h3 className="mb-4 text-sm font-semibold text-slate-900">Vista previa</h3>

                            <div className="space-y-4">
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Boton principal</p>
                                    <button
                                        type="button"
                                        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all"
                                        style={{ backgroundColor: accentVar }}
                                    >
                                        Guardar cambios
                                    </button>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Sidebar activo</p>
                                    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: colores.primarySoft }}>
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colores.primary }} />
                                        <span className="text-sm font-medium" style={{ color: colores.text }}>Dashboard</span>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Input enfocado</p>
                                    <div className="rounded-lg border-2 bg-white px-3 py-2 text-sm text-slate-700" style={{ borderColor: accentVar }}>
                                        Texto de ejemplo
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Badge</p>
                                    <span
                                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                                        style={{ backgroundColor: accentVar }}
                                    >
                                        Activo
                                    </span>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Link</p>
                                    <a
                                        href="#"
                                        className="text-sm font-medium underline underline-offset-2"
                                        style={{ color: accentVar }}
                                        onClick={(e) => e.preventDefault()}
                                    >
                                        Ver detalles
                                    </a>
                                </div>
                            </div>

                            <div className="mt-5 border-t border-slate-200 pt-4">
                                <button
                                    type="button"
                                    onClick={() => cambiarColor('default')}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Restablecer predeterminado
                                </button>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}
