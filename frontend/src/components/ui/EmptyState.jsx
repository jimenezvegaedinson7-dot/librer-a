export function EmptyState({ titulo, descripcion, acciones = null, icono = null }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-primary-300 bg-parchment-50 px-6 py-12 text-center">
            {icono && (
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-parchment-300 text-lg text-primary-400">
                    {icono}
                </div>
            )}
            <h3 className="text-sm font-bold text-mahogany-700">{titulo}</h3>
            {descripcion && <p className="mt-1 max-w-sm text-xs text-primary-400">{descripcion}</p>}
            {acciones && <div className="mt-4 flex gap-2">{acciones}</div>}
        </div>
    );
}