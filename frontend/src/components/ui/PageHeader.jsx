export function PageHeader({ titulo, descripcion, acciones = null, icono = null }) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                {icono && (
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-primary-600 shadow-sm sm:flex">
                        {icono}
                    </span>
                )}
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{titulo}</h1>
                    {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
                </div>
            </div>
            {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
    );
}