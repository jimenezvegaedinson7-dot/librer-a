const acentos = {
    primary: { tile: 'text-primary-700' },
    success: { tile: 'text-primary-700' },
    warning: { tile: 'text-amber-700' },
    danger: { tile: 'text-red-700' },
    info: { tile: 'text-primary-700' },
};

export function StatCard({ titulo, valor, icono, color = 'primary' }) {
    const acento = acentos[color] || acentos.primary;
    return (
        <article className="card dashboard-stat-card flex min-h-24 items-center gap-3 p-4">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center border-r border-slate-200 pr-3 text-sm ${acento.tile}`}>
                {icono}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-500">{titulo}</p>
                <p className="mt-1 truncate text-xl font-semibold leading-none tracking-tight text-slate-900">{valor}</p>
            </div>
        </article>
    );
}
