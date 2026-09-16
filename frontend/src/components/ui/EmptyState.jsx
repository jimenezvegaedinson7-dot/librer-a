export function EmptyState({ titulo, descripcion, acciones = null, icono = null }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50/60 px-6 py-12 text-center">
            {icono && (
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-xl text-slate-400">
                    {icono}
                </div>
            )}
            <h3 className="text-sm font-bold text-slate-700">{titulo}</h3>
            {descripcion && <p className="mt-1 max-w-sm text-xs text-slate-500">{descripcion}</p>}
            {acciones && <div className="mt-4 flex gap-2">{acciones}</div>}
        </div>
    );
}