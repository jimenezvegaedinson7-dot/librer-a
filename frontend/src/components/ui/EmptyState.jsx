export function EmptyState({ titulo, descripcion, acciones = null, icono = null }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            {icono && (
                <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg text-slate-400">
                    {icono}
                </div>
            )}
            <h3 className="text-sm font-medium text-slate-700">{titulo}</h3>
            {descripcion && <p className="mt-1 max-w-sm text-xs text-slate-600">{descripcion}</p>}
            {acciones && <div className="mt-3 flex gap-2">{acciones}</div>}
        </div>
    );
}
