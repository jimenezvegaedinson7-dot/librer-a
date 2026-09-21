export function PageHeader({ titulo, descripcion, acciones = null, icono = null }) {
    return (
        <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    {icono && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mahogany-50 text-mahogany-600">{icono}</span>}
                    <div>
                        <h1 className="font-serif text-xl font-semibold tracking-tight text-mahogany-700 sm:text-2xl">{titulo}</h1>
                        {descripcion && <p className="mt-0.5 text-sm text-primary-400">{descripcion}</p>}
                    </div>
                </div>
            </div>
            {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
    );
}
