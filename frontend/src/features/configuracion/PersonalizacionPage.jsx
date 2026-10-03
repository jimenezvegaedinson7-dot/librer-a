import { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { RotateCcw, Check, Palette, Loader2 } from 'lucide-react';

import { useTema, COLORES, ZONAS_IDS, ZONAS_DEFAULT, getSidebarColors, colorSobre } from '../../components/providers/tema';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';

const OPCIONES = [
    { id: 'default', nombre: 'Azul marino · web' },
    { id: 'azul', nombre: 'Azul' },
    { id: 'indigo', nombre: 'Índigo' },
    { id: 'violeta', nombre: 'Violeta' },
    { id: 'tinto', nombre: 'Tinto' },
    { id: 'cian', nombre: 'Cian' },
    { id: 'esmeralda', nombre: 'Esmeralda' },
    { id: 'lima', nombre: 'Lima' },
    { id: 'turquesa', nombre: 'Turquesa' },
    { id: 'ciclum', nombre: 'Ciclum' },
    { id: 'rosa', nombre: 'Rosa' },
    { id: 'coral', nombre: 'Coral' },
    { id: 'naranja', nombre: 'Naranja' },
    { id: 'amarillo', nombre: 'Amarillo' },
    { id: 'dorado', nombre: 'Dorado' },
    { id: 'rojo', nombre: 'Rojo' },
].map(opcion => ({ ...opcion, hex: COLORES[opcion.id].primary }));

const ZONA_LABELS = {
    sidebar: 'Barra lateral',
    topbar: 'Barra superior',
    buttons: 'Botones principales',
    inputs: 'Formularios e inputs',
    tables: 'Tablas',
    modals: 'Modales',
    badges: 'Insignias',
    icons: 'Iconos activos',
    links: 'Enlaces',
    charts: 'Gráficos',
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

function CasillaZona({ marcada, onCambiar, children, destacada = false }) {
    return (
        <label className={`zona-casilla ${destacada ? 'zona-casilla--todas' : ''} ${marcada ? 'zona-casilla--marcada' : ''}`}>
            <input type="checkbox" checked={marcada} onChange={onCambiar} className="zona-check" />
            <span className="text-sm">{children}</span>
        </label>
    );
}

function ModalAplicar({ colorId, abierto, onCerrar, onAplicar }) {
    const [zonas, setZonas] = useState([...ZONAS_DEFAULT]);
    const [aplicando, setAplicando] = useState(false);
    const [aplicado, setAplicado] = useState(false);

    // Al abrir se marcan todas las zonas. Se ajusta durante el render para
    // que el modal ya salga con la selección completa, sin un efecto que lo
    // repintara después y borrara lo que el usuario acababa de desmarcar.
    const [abiertoAnterior, setAbiertoAnterior] = useState(abierto);

    if (abierto !== abiertoAnterior) {
        setAbiertoAnterior(abierto);
        if (abierto) {
            setZonas([...ZONAS_DEFAULT]);
            setAplicando(false);
            setAplicado(false);
        }
    }

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
        <Modal abierto={abierto} titulo="Aplicar personalización" subtitulo={`${colorInfo.nombre} seleccionado`} onCerrar={onCerrar}>
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="h-8 w-8 shrink-0 rounded-full ring-4" style={{ backgroundColor: colorInfo.hex, '--tw-ring-color': softColor(colorInfo.hex, 0.18) }} aria-hidden="true" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{colorInfo.nombre}</p>
                    <p className="font-mono text-xs uppercase text-slate-500">{colorInfo.hex}</p>
                </div>
            </div>

            <fieldset>
                <legend className="mb-2.5 text-sm font-semibold text-slate-700">¿Dónde deseas aplicarlo?</legend>
                <CasillaZona destacada marcada={todasMarcadas} onCambiar={() => setZonas(todasMarcadas ? [] : [...ZONAS_IDS])}>
                    <span className="font-semibold">Seleccionar todo</span>
                </CasillaZona>
                <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {ZONAS_IDS.map((z) => (
                        <CasillaZona
                            key={z}
                            marcada={zonas.includes(z)}
                            onCambiar={() => setZonas((p) => p.includes(z) ? p.filter((x) => x !== z) : [...p, z])}
                        >
                            {ZONA_LABELS[z]}
                        </CasillaZona>
                    ))}
                </div>
            </fieldset>

            <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button variante="secondary" onClick={onCerrar} disabled={aplicando}>Cancelar</Button>
                <button
                    type="button"
                    onClick={aplicar}
                    disabled={aplicando || zonas.length === 0 || aplicado}
                    aria-live="polite"
                    className="inline-flex h-10 min-w-[150px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: colorInfo.hex, color: colorSobre(colorInfo.hex) }}
                >
                    {aplicando ? <><Loader2 className="h-4 w-4 animate-spin" />Aplicando...</> : aplicado ? <><Check className="h-4 w-4" />Aplicado</> : 'Aplicar cambios'}
                </button>
            </div>
        </Modal>
    );
}

function ModalRestablecer({ abierto, onCerrar, onRestablecer, onRestablecerTodo }) {
    const [zonas, setZonas] = useState([]);

    // Igual que en ModalAplicar: la selección arranca vacía en cada apertura,
    // ajustada en el render para no depender de un efecto en cascada.
    const [abiertoAnterior, setAbiertoAnterior] = useState(abierto);

    if (abierto !== abiertoAnterior) {
        setAbiertoAnterior(abierto);
        if (abierto) setZonas([]);
    }

    if (!abierto) return null;

    return (
        <Modal abierto={abierto} titulo="Restablecer colores" subtitulo="Selecciona qué áreas quieres devolver al color de la marca" onCerrar={onCerrar}>
            <fieldset>
                <legend className="sr-only">Áreas a restablecer</legend>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {ZONAS_IDS.map((z) => (
                        <CasillaZona
                            key={z}
                            marcada={zonas.includes(z)}
                            onCambiar={() => setZonas((p) => p.includes(z) ? p.filter((x) => x !== z) : [...p, z])}
                        >
                            {ZONA_LABELS[z]}
                        </CasillaZona>
                    ))}
                </div>
            </fieldset>

            <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button variante="secondary" onClick={onCerrar}>Cancelar</Button>
                <Button
                    variante="danger-outline"
                    onClick={() => { if (zonas.length > 0) onRestablecer(zonas); onCerrar(); }}
                    disabled={zonas.length === 0}
                >
                    <RotateCcw className="h-3.5 w-3.5" />Restablecer selección
                </Button>
                <Button variante="danger" onClick={() => { onRestablecerTodo(); onCerrar(); }}>
                    Restablecer todo
                </Button>
            </div>
        </Modal>
    );
}

function Muestra({ titulo, children }) {
    return (
        <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">{titulo}</p>
            {children}
        </div>
    );
}

export default function PersonalizacionPage() {
    const navigate = useNavigate();
    const { config, tema, aplicarColor, restaurarZonas, restaurarTodo } = useTema();
    const [seleccion, setSeleccion] = useState('default');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalRestablecer, setModalRestablecer] = useState(false);

    const colorInfo = OPCIONES.find((c) => c.id === seleccion) || OPCIONES[0];
    const hex = colorInfo.hex;
    const soft = hex;
    const soft2 = hex;
    const border = COLORES[seleccion].primaryHover;
    const sobreColor = colorSobre(hex);
    const esMarca = seleccion === 'default';

    const sidebar = getSidebarColors(seleccion, tema);
    const sidebarPrevia = { fondo: sidebar.sidebarBg, borde: sidebar.sidebarBorder,
        acento: sidebar.primary, activo: sidebar.sidebarHover, texto: sidebar.sidebarText, titulo: sidebar.brandTitle };

    const zonasPersonalizadas = ZONAS_IDS.filter((z) => config.zonas[z]).length;

    const moverSeleccion = (e, indice) => {
        const columnas = window.innerWidth >= 1024 ? 8 : window.innerWidth >= 640 ? 5 : 4;
        const pasos = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columnas, ArrowUp: -columnas };
        if (!(e.key in pasos)) return;
        e.preventDefault();
        const siguiente = Math.min(OPCIONES.length - 1, Math.max(0, indice + pasos[e.key]));
        setSeleccion(OPCIONES[siguiente].id);
        e.currentTarget.parentElement?.children[siguiente]?.focus();
    };

    return (
        <div className="personalizacion-intensa space-y-5" style={{ '--muestra-acento': hex, '--muestra-sobre': sobreColor }}>
            <PageHeader
                icono={<Palette />}
                titulo="Personalización"
                descripcion="Personaliza los colores del panel administrativo"
                acciones={<Button variante="secondary" onClick={() => navigate(-1)}>Volver</Button>}
            />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
                <div className="space-y-5">
                    <Card>
                        <CardHeader
                            titulo="Apariencia del sistema"
                            subtitulo="Selecciona un color y presiona Aplicar para elegir dónde usarlo."
                        />
                        <CardBody>
                            <div role="radiogroup" aria-label="Color de acento" className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 lg:grid-cols-8">
                                {OPCIONES.map((color, indice) => {
                                    const activa = seleccion === color.id;
                                    return (
                                        <button
                                            key={color.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={activa}
                                            tabIndex={activa ? 0 : -1}
                                            onClick={() => setSeleccion(color.id)}
                                            onKeyDown={(e) => moverSeleccion(e, indice)}
                                            className={`muestra-color group relative flex flex-col items-center gap-2 rounded-xl px-1.5 py-3 outline-none transition-colors ${activa ? 'muestra-color--activa' : ''}`}
                                        >
                                            {activa && <span className="muestra-color-marco absolute inset-0 rounded-xl" aria-hidden="true" />}
                                            <span className="relative">
                                                <span
                                                    className="flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
                                                    style={{ backgroundColor: color.hex }}
                                                >
                                                    <span className="h-6 w-6 rounded-full" style={{ backgroundColor: color.hex }} />
                                                </span>
                                                {activa && (
                                                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200" aria-hidden="true">
                                                        <Check className="h-2.5 w-2.5 text-slate-900" strokeWidth={3} />
                                                    </span>
                                                )}
                                            </span>
                                            <span className={`relative text-[11px] font-medium ${activa ? 'text-slate-900' : 'text-slate-500'}`}>{color.nombre}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {esMarca && (
                                <p className="mt-4 rounded-lg border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-[13px] text-gold-800">
                                    <span className="font-semibold">Azul marino</span> usa tonos sólidos y contrastados. La barra lateral lleva iconos blancos, sin amarillo.
                                </p>
                            )}

                            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
                                <button
                                    type="button"
                                    onClick={() => setModalAbierto(true)}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
                                    style={{ backgroundColor: hex, color: sobreColor }}
                                >
                                    <Check className="h-4 w-4" /> Aplicar
                                </button>
                                <Button variante="secondary" onClick={() => setModalRestablecer(true)}>
                                    <RotateCcw className="h-3.5 w-3.5" />Restablecer
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            titulo="Zonas activas"
                            subtitulo="Áreas del panel con un color personalizado"
                            acciones={<span>{zonasPersonalizadas} de {ZONAS_IDS.length}</span>}
                        />
                        <CardBody>
                            <ul className="flex flex-wrap gap-2">
                                {ZONAS_IDS.map((z) => {
                                    const colorId = config.zonas[z];
                                    const c = colorId ? (COLORES[colorId] || COLORES.default) : null;
                                    return (
                                        <li
                                            key={z}
                                            className={`zona-chip flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${c ? '' : 'zona-chip--vacia'}`}
                                            style={c ? { borderColor: c.primaryHover,
                                                backgroundColor: z === 'sidebar' ? getSidebarColors(colorId, tema).sidebarBg : c.primary,
                                                color: z === 'sidebar' ? getSidebarColors(colorId, tema).sidebarText : colorSobre(c.primary) } : undefined}
                                        >
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c ? 'currentColor' : undefined }} aria-hidden="true" />
                                            {ZONA_LABELS[z]}
                                            <span className="sr-only">{c ? `: ${c.primary}` : ': color de la marca'}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </CardBody>
                    </Card>
                </div>

                <div>
                    <Card className="xl:sticky xl:top-20">
                        <CardHeader titulo="Vista previa" subtitulo={`Así se verá con ${colorInfo.nombre.toLowerCase()}`} />
                        <CardBody>
                            <div className="pointer-events-none select-none space-y-5" aria-hidden="true">

                                <Muestra titulo="Barra lateral">
                                    <div className="overflow-hidden rounded-xl border" style={{ backgroundColor: sidebarPrevia.fondo, borderColor: sidebarPrevia.borde }}>
                                        <div className="px-4 pb-1 pt-3">
                                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: sidebarPrevia.texto }}>General</p>
                                        </div>
                                        <div className="space-y-0.5 px-2 pb-2">
                                            <div className="relative flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: sidebarPrevia.activo }}>
                                                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full" style={{ backgroundColor: sidebarPrevia.acento }} />
                                                <div className="h-3 w-3 rounded" style={{ backgroundColor: sidebarPrevia.acento }} />
                                                <span className="text-xs font-semibold" style={{ color: sidebarPrevia.titulo }}>Resumen</span>
                                            </div>
                                            {['Libros', 'Ventas', 'Clientes'].map((item) => (
                                                <div key={item} className="flex items-center gap-2 rounded-lg px-3 py-2">
                                                     <div className="h-3 w-3 rounded" style={{ backgroundColor: sidebarPrevia.texto }} />
                                                    <span className="text-xs" style={{ color: sidebarPrevia.texto }}>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Muestra>

                                <Muestra titulo="Encabezado y botones">
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: soft }}>
                                                <div className="h-4 w-4 rounded" style={{ backgroundColor: sobreColor }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-title text-sm font-semibold text-slate-900">Libros</p>
                                                <p className="text-[11px] text-slate-500">Gestión del catálogo</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600">Cancelar</div>
                                             <div className="rounded-lg px-3 py-1.5 text-[11px] font-semibold" style={{ backgroundColor: hex, color: sobreColor }}>Guardar</div>
                                        </div>
                                    </div>
                                </Muestra>

                                <Muestra titulo="Campo enfocado">
                                    <div className="rounded-lg border bg-white px-3 py-2 text-xs text-slate-500" style={{ borderColor: hex, boxShadow: `0 0 0 3px ${softColor(hex, 0.15)}` }}>Cien años de soledad</div>
                                </Muestra>

                                <Muestra titulo="Tabla">
                                    <div className="overflow-hidden rounded-lg border border-slate-200">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr style={{ backgroundColor: soft }}>
                                                     <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: sobreColor }}>Libro</th>
                                                     <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: sobreColor }}>Autor</th>
                                                     <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: sobreColor }}>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t border-slate-100">
                                                    <td className="px-3 py-2 font-medium text-slate-700">Cien años</td>
                                                    <td className="px-3 py-2 text-slate-500">García Márquez</td>
                                                     <td className="px-3 py-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: hex, color: sobreColor }}>Activo</span></td>
                                                </tr>
                                                <tr className="border-t border-slate-100">
                                                    <td className="px-3 py-2 font-medium text-slate-700">Don Quijote</td>
                                                    <td className="px-3 py-2 text-slate-500">Cervantes</td>
                                                    <td className="px-3 py-2"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Pendiente</span></td>
                                                </tr>
                                                <tr className="border-t border-slate-100">
                                                    <td className="px-3 py-2 font-medium text-slate-700">Ficciones</td>
                                                    <td className="px-3 py-2 text-slate-500">Borges</td>
                                                    <td className="px-3 py-2"><span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Pagado</span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </Muestra>

                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <Muestra titulo="Insignias">
                                        <div className="flex flex-wrap gap-1.5">
                                             <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: hex, color: sobreColor }}>Activo</span>
                                             <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: soft2, color: sobreColor }}>Nuevo</span>
                                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-semibold text-red-700">Cancelado</span>
                                        </div>
                                    </Muestra>

                                    <Muestra titulo="Paginación">
                                        <div className="flex items-center gap-1">
                                            {['‹', '1', '2', '3', '›'].map((p) => (
                                                <div
                                                    key={p}
                                                    className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] ${p === '1' ? 'font-semibold text-white' : 'text-slate-600'}`}
                                                    style={p === '1' ? { backgroundColor: hex, color: sobreColor } : undefined}
                                                >
                                                    {p}
                                                </div>
                                            ))}
                                        </div>
                                    </Muestra>
                                </div>

                                <Muestra titulo="Modal">
                                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
                                        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
                                            <p className="font-title text-[13px] font-semibold text-slate-900">Confirmar acción</p>
                                            <p className="text-[10.5px] text-slate-500">Esta acción no se puede deshacer</p>
                                        </div>
                                        <div className="flex justify-end gap-2 bg-slate-50 px-4 py-2.5">
                                            <div className="rounded-md border border-slate-200 bg-white px-3 py-1 text-[10.5px] text-slate-600">Cancelar</div>
                                             <div className="rounded-md px-3 py-1 text-[10.5px] font-semibold" style={{ backgroundColor: hex, color: sobreColor }}>Confirmar</div>
                                        </div>
                                    </div>
                                </Muestra>

                                <Muestra titulo="Aviso">
                                    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: border, backgroundColor: soft }}>
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: hex }}>
                                            <Check className="h-3 w-3" style={{ color: sobreColor }} strokeWidth={3} />
                                        </div>
                                        <div>
                                             <p className="text-xs font-semibold" style={{ color: sobreColor }}>Guardado correctamente</p>
                                             <p className="text-[10.5px]" style={{ color: sobreColor }}>Los cambios se han aplicado</p>
                                        </div>
                                    </div>
                                </Muestra>
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
