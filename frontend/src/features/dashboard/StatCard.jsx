const colores = {
    primary: {
        bg: 'bg-gradient-to-br from-[#faf6f1] to-[#f5ede3]',
        iconBg: 'bg-mahogany-100',
        iconText: 'text-mahogany-600',
        ring: 'ring-mahogany-200/50',
    },
    success: {
        bg: 'bg-gradient-to-br from-[#f0fdf8] to-[#e6f9ef]',
        iconBg: 'bg-emerald-100',
        iconText: 'text-emerald-600',
        ring: 'ring-emerald-200/50',
    },
    warning: {
        bg: 'bg-gradient-to-br from-[#fefbeb] to-[#fdf3d7]',
        iconBg: 'bg-amber-100',
        iconText: 'text-amber-600',
        ring: 'ring-amber-200/50',
    },
    danger: {
        bg: 'bg-gradient-to-br from-[#fef2f2] to-[#fde8e8]',
        iconBg: 'bg-red-100',
        iconText: 'text-red-500',
        ring: 'ring-red-200/50',
    },
    info: {
        bg: 'bg-gradient-to-br from-[#f0f7ff] to-[#e0efff]',
        iconBg: 'bg-sky-100',
        iconText: 'text-sky-600',
        ring: 'ring-sky-200/50',
    },
};

export function StatCard({ titulo, valor, icono, color = 'primary', tendencia }) {
    const c = colores[color] || colores.primary;

    return (
        <article className={`group relative overflow-hidden rounded-2xl border border-white/60 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${c.bg}`}>

            {/* glow decorativo */}
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/30 blur-2xl transition-opacity duration-500 group-hover:opacity-60" />

            <div className="relative flex items-start gap-4">

                {/* icono */}
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.iconBg} ring-1 ${c.ring} transition-transform duration-300 group-hover:scale-110`}>
                    <span className={`text-lg ${c.iconText}`}>
                        {icono}
                    </span>
                </div>

                {/* contenido */}
                <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-primary-400">
                        {titulo}
                    </p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-mahogany-800">
                        {valor}
                    </p>
                </div>

            </div>

            {/* barra decorativa inferior */}
            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-10" />

        </article>
    );
}
