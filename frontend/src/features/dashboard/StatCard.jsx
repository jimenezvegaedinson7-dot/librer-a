const colores = {
    primary: {
        bg: 'bg-gradient-to-br from-[#faf8f5] to-[#f3ede5]',
        accent: 'bg-mahogany-500',
        iconBg: 'bg-mahogany-100/80',
        iconText: 'text-mahogany-600',
    },
    success: {
        bg: 'bg-gradient-to-br from-[#f4faf7] to-[#e8f5ec]',
        accent: 'bg-emerald-500',
        iconBg: 'bg-emerald-100/80',
        iconText: 'text-emerald-600',
    },
    warning: {
        bg: 'bg-gradient-to-br from-[#fdfaf0] to-[#f8f0d8]',
        accent: 'bg-amber-500',
        iconBg: 'bg-amber-100/80',
        iconText: 'text-amber-600',
    },
    danger: {
        bg: 'bg-gradient-to-br from-[#fdf5f5] to-[#fbe8e8]',
        accent: 'bg-red-500',
        iconBg: 'bg-red-100/80',
        iconText: 'text-red-500',
    },
    info: {
        bg: 'bg-gradient-to-br from-[#f3f8fc] to-[#e6f0fa]',
        accent: 'bg-sky-500',
        iconBg: 'bg-sky-100/80',
        iconText: 'text-sky-600',
    },
};

export function StatCard({ titulo, valor, icono, color = 'primary' }) {
    const c = colores[color] || colores.primary;

    return (
        <article className={`group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${c.bg}`}>

            {/* acento superior */}
            <div className={`absolute top-0 left-0 h-[2px] w-full ${c.accent} opacity-60`} />

            <div className="relative flex items-start gap-4">

                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                    <span className={`text-base ${c.iconText}`}>{icono}</span>
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[11px] font-medium uppercase tracking-widest text-primary-400">
                        {titulo}
                    </p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-mahogany-800">
                        {valor}
                    </p>
                </div>

            </div>
        </article>
    );
}
