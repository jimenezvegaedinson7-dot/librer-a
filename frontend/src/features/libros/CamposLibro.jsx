import { FaImage, FaTag, FaXmark } from 'react-icons/fa6';

import { Input, Select, Textarea } from '../../components/ui/Form';
import { Spinner } from '../../components/ui/Spinner';
import PortadaCatalogo from '../../components/catalogo/PortadaCatalogo';

export function SelectorPortada({ imagen, preview, portadaActual, libro, onCambiar, onQuitar, inputRef, cargando = false }) {
    return (
        <div>
            <label className="field-label">Portada</label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[150px_1fr]">
                <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-xl border border-primary-200 bg-parchment-200">
                    <PortadaCatalogo libro={libro} {...(preview?{src:preview}:libro?{}:{src:portadaActual})}
                        alt="Portada del libro" className="h-full w-full object-contain" prioritaria/>
                    {cargando && imagen && (
                        <div className="upload-overlay absolute inset-0 flex flex-col items-center justify-center gap-2" role="status">
                            <Spinner className="text-amber-700" />
                            <span className="text-xs font-semibold text-slate-700">Subiendo portada...</span>
                        </div>
                    )}
                </div>

                <div>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-primary-300 bg-parchment-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700">
                        <FaImage />
                        {imagen ? 'Seleccionar otra imagen' : 'Seleccionar imagen'}
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={onCambiar}
                            disabled={cargando}
                            className="hidden"
                        />
                    </label>
                    <p className="mt-1.5 text-xs text-slate-500">JPG, PNG o WEBP. Máximo 5 MB.</p>

                    {imagen && (
                        <div className="mt-3 rounded-lg border border-primary-200 bg-parchment-200 p-3">
                            <p className="text-sm font-semibold text-slate-700">Nueva portada seleccionada</p>
                            <p className="mt-1 truncate text-xs text-primary-500">{imagen.name}</p>
                            <button
                                type="button"
                                onClick={onQuitar}
                                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-crimson-500 hover:text-crimson-500"
                            >
                                <FaXmark /> Cancelar cambio
                            </button>
                            {cargando && <div className="upload-progress mt-3" aria-hidden="true"><span /></div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// DESCUENTO
//
// Reglas (las mismas que valida el backend en utils/descuentos.js):
//   - Porcentaje (1 a 99) o precio de oferta, nunca los dos: al escribir
//     en uno, el otro se bloquea.
//   - El precio de oferta debe ser mayor que 0 y menor que el precio normal.
//   - La fecha "Hasta" solo se puede poner con un descuento, incluye ese
//     día completo (hora de Lima) y no puede ser anterior a hoy.
// El precio final se calcula aquí para que el administrador vea el
// resultado antes de guardar.
// ============================================================

// Hoy en Lima como AAAA-MM-DD (para el mínimo del calendario).
const hoyEnLima = () =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());

export function CamposDescuento({ formulario, manejarCambio, errores = {} }) {
    const precio = Number(formulario.precio);
    const precioValido = Number.isFinite(precio) && precio > 0;

    const textoPorcentaje = String(formulario.descuento_porcentaje ?? '').trim();
    const textoOferta = String(formulario.precio_oferta ?? '').trim();
    const porcentaje = Number(textoPorcentaje);
    const oferta = Number(textoOferta);

    const usaPorcentaje = textoPorcentaje !== '';
    const usaOferta = textoOferta !== '';

    // Avisos en vivo, antes de guardar.
    let aviso = '';
    if (usaPorcentaje && usaOferta) {
        aviso = 'Usa porcentaje o precio de oferta, no los dos. Borra uno de los dos campos.';
    } else if (usaPorcentaje && (!Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 99)) {
        aviso = 'El porcentaje debe ser un número entero entre 1 y 99.';
    } else if (usaOferta && (!Number.isFinite(oferta) || oferta <= 0)) {
        aviso = 'El precio de oferta debe ser mayor que 0.';
    } else if (usaOferta && precioValido && oferta >= precio) {
        aviso = `El precio de oferta debe ser menor que el precio normal (S/ ${precio.toFixed(2)}).`;
    } else if ((usaPorcentaje || usaOferta) && !precioValido) {
        aviso = 'Primero indica el precio normal del libro.';
    }

    const hayDescuento = (usaPorcentaje || usaOferta) && !aviso;

    const final = !hayDescuento
        ? precio
        : usaOferta
            ? oferta
            : Math.round(precio * (1 - porcentaje / 100) * 100) / 100;

    const porcentajeEfectivo = hayDescuento
        ? Math.round(((precio - final) / precio) * 100)
        : 0;

    const hoy = hoyEnLima();
    const fecha = formulario.descuento_hasta || '';
    const vencida = hayDescuento && fecha !== '' && fecha < hoy;

    return (
        <div className="space-y-3 rounded-xl border border-primary-200 bg-white p-4">
            <div className="flex items-center gap-2">
                <FaTag className="text-oferta" />
                <span className="text-sm font-semibold text-slate-800">Descuento (opcional)</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                    label="Porcentaje"
                    name="descuento_porcentaje"
                    type="number"
                    value={formulario.descuento_porcentaje}
                    onChange={manejarCambio}
                    placeholder={usaOferta ? 'Usa solo uno' : 'Ej. 30'}
                    min="1"
                    max="99"
                    step="1"
                    disabled={usaOferta && !usaPorcentaje}
                    error={errores.descuento_porcentaje}
                    ancho={4}
                    prefijo="-%"
                />

                <Input
                    label="Precio de oferta"
                    name="precio_oferta"
                    type="number"
                    value={formulario.precio_oferta}
                    onChange={manejarCambio}
                    placeholder={usaPorcentaje ? 'Usa solo uno' : 'Ej. 24.90'}
                    min="0.01"
                    max={precioValido ? (precio - 0.01).toFixed(2) : undefined}
                    step="0.01"
                    disabled={usaPorcentaje && !usaOferta}
                    error={errores.precio_oferta}
                    ancho={4}
                    prefijo="S/"
                />

                <Input
                    label="Hasta (incluido)"
                    name="descuento_hasta"
                    type="date"
                    value={formulario.descuento_hasta}
                    onChange={manejarCambio}
                    min={hoy}
                    disabled={!usaPorcentaje && !usaOferta}
                    error={errores.descuento_hasta}
                    ancho={4}
                />
            </div>

            <p className="text-xs text-slate-600">
                Elige un porcentaje o un precio de oferta (no los dos). La fecha es opcional: la promoción dura
                hasta ese día inclusive; si la dejas vacía, no vence. Este precio es el que se cobra en la app.
            </p>

            {aviso && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800" role="alert">
                    {aviso}
                </p>
            )}

            {vencida && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Esta promoción ya venció: el libro se vende a su precio normal. Cambia la fecha o quita el descuento.
                </p>
            )}

            {hayDescuento && !vencida && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm">
                    <span className="descuento-resaltado rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold">
                        -{porcentajeEfectivo}%
                    </span>
                    <span className="text-slate-500 line-through">S/ {precio.toFixed(2)}</span>
                    <span className="descuento-resaltado font-bold">S/ {final.toFixed(2)}</span>
                    {fecha && <span className="text-xs text-slate-500">hasta el {fecha.split('-').reverse().join('/')}</span>}
                </div>
            )}
        </div>
    );
}

export default function CamposLibro({
    formulario,
    autores,
    categorias,
    manejarCambio,
    editable = true,
    errores = {},
}) {
    return (
        <div className="form-grid">
            <Input
                label="Título"
                name="titulo"
                value={formulario.titulo}
                onChange={manejarCambio}
                placeholder="Ej. Cien años de soledad"
                error={errores.titulo}
                required
                ancho={8}
            />
            <Input
                label="ISBN"
                name="isbn"
                value={formulario.isbn}
                onChange={manejarCambio}
                placeholder="978-1234567890"
                error={errores.isbn}
                ancho={4}
                className="tabular-nums"
            />

            <Select
                label="Autor"
                name="id_autor"
                value={formulario.id_autor}
                onChange={manejarCambio}
                error={errores.id_autor}
                required
                ancho={editable ? 5 : 6}
            >
                <option value="">Seleccione un autor</option>
                {autores.map((autor) => (
                    <option key={autor.id_autor} value={autor.id_autor}>
                        {autor.nombre} {autor.apellido}
                    </option>
                ))}
            </Select>

            <Select
                label="Categoría"
                name="id_categoria"
                value={formulario.id_categoria}
                onChange={manejarCambio}
                error={errores.id_categoria}
                required
                ancho={editable ? 4 : 6}
            >
                <option value="">Seleccione una categoría</option>
                {categorias.map((categoria) => (
                    <option key={categoria.id_categoria} value={categoria.id_categoria}>
                        {categoria.nombre}
                    </option>
                ))}
            </Select>

            {editable && (
                <Input
                    label="Precio"
                    name="precio"
                    type="number"
                    value={formulario.precio}
                    onChange={manejarCambio}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    error={errores.precio}
                    required
                    ancho={3}
                    prefijo="S/"
                />
            )}

            <Textarea
                label="Descripción"
                name="descripcion"
                value={formulario.descripcion}
                onChange={manejarCambio}
                placeholder="Descripción breve del libro"
                rows="2"
            />
        </div>
    );
}
