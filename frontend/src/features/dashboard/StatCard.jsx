const acentos = {
    primary: { tile: 'bg-primary-50 text-primary-700' },
    success: { tile: 'bg-emerald-50 text-emerald-700' },
    warning: { tile: 'bg-amber-50 text-amber-700' },
    danger: { tile: 'bg-red-50 text-red-700' },
    info: { tile: 'bg-sky-50 text-sky-700' },
};

export function StatCard({ titulo, valor, icono, color = 'primary' }) {
    const acento = acentos[color] || acentos.primary;
    return (
        <article className="card card-hover flex items-center gap-4 p-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm ${acento.tile}`}>
                {icono}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
                <p className="mt-1.5 truncate text-2xl font-bold leading-none tracking-tight text-slate-900">{valor}</p>
            </div>
        </article>
    );
}