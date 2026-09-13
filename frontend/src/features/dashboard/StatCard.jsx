export function StatCard({ titulo, valor, icono }) {
    return (
        <article className="card card-hover flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                {icono}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-600">{titulo}</p>
                <p className="mt-1 text-lg font-bold leading-none text-slate-900">{valor}</p>
            </div>
        </article>
    );
}
