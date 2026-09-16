export function PageHeader({ titulo, descripcion, acciones = null, icono = null }) {
    return (
        <div className="animate-suave flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                {icono && (
                    <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-base text-white shadow-md shadow-primary-600/25 sm:flex">
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