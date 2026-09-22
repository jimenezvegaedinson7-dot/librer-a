import { FaImage, FaXmark } from 'react-icons/fa6';

import { Input, Select, Textarea } from '../../components/ui/Form';
import { Spinner } from '../../components/ui/Spinner';

export function SelectorPortada({ imagen, preview, portadaActual, onCambiar, onQuitar, inputRef, cargando = false }) {
    return (
        <div>
            <label className="field-label">Portada</label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[150px_1fr]">
                <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-xl border border-primary-200 bg-parchment-200">
                    {preview || portadaActual ? (
                        <img
                            src={preview || portadaActual}
                            alt="Portada del libro"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center text-slate-500">
                            <FaImage size={32} />
                            <span className="mt-2 text-xs">Sin portada</span>
                        </div>
                    )}
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
