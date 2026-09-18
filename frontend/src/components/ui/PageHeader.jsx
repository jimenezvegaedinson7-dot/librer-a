export function PageHeader({ titulo, descripcion, acciones = null, icono = null }) {
    return (
        <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                    {icono && <span className="text-base text-primary-700">{icono}</span>}
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{titulo}</h1>
                </div>
                {descripcion && <p className="mt-1 text-sm text-slate-500">{descripcion}</p>}
            </div>
            {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
    );
}
