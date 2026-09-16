const acentos = {
    primary: {
        icono: 'from-primary-500 to-primary-700',
        sombra: 'shadow-primary-600/25',
        linea: 'bg-primary-500',
    },
    success: {
        icono: 'from-emerald-500 to-emerald-700',
        sombra: 'shadow-emerald-600/25',
        linea: 'bg-emerald-500',
    },
    warning: {
        icono: 'from-amber-500 to-amber-600',
        sombra: 'shadow-amber-600/25',
        linea: 'bg-amber-500',
    },
    danger: {
        icono: 'from-red-500 to-red-600',
        sombra: 'shadow-red-600/25',
        linea: 'bg-red-500',
    },
    info: {
        icono: 'from-sky-500 to-sky-700',
        sombra: 'shadow-sky-600/25',
        linea: 'bg-sky-500',
    },
};

export function StatCard({ titulo, valor, icono, color = 'primary' }) {
    const acento = acentos[color] || acentos.primary;
    return (
        <article className="card card-hover relative overflow-hidden">
            <span className={`absolute inset-x-0 top-0 h-1 ${acento.linea}`} />
            <div className="flex items-center gap-4 p-5">
                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-base text-white shadow-md ${acento.sombra} ${acento.icono}`}
                >
                    {icono}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
                    <p className="mt-1.5 truncate text-2xl font-extrabold leading-none tracking-tight text-slate-900">{valor}</p>
                </div>
            </div>
        </article>
    );
}