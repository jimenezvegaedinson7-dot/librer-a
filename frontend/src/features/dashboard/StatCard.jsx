const acentos = {
    primary: { tile: 'text-mahogany-600' },
    success: { tile: 'text-mahogany-600' },
    warning: { tile: 'text-warning' },
    danger: { tile: 'text-crimson-500' },
    info: { tile: 'text-mahogany-600' },
};

export function StatCard({ titulo, valor, icono, color = 'primary' }) {
    const acento = acentos[color] || acentos.primary;
    return (
        <article className="card dashboard-stat-card flex min-h-24 items-center gap-3 p-4">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center border-r border-primary-200 pr-3 text-sm ${acento.tile}`}>
                {icono}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-primary-400">{titulo}</p>
                <p className="mt-1 truncate text-xl font-semibold leading-none tracking-tight text-mahogany-700">{valor}</p>
            </div>
        </article>
    );
}
