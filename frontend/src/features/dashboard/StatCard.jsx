const colores = {
    primary: {
        bg: 'bg-gradient-to-br from-[#2563eb] to-[#60a5fa]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#bfdbfe',
    },
    danger: {
        bg: 'bg-gradient-to-br from-[#f43f5e] to-[#fb7185]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#fecdd3',
    },
    success: {
        bg: 'bg-gradient-to-br from-[#059669] to-[#34d399]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#a7f3d0',
    },
    warning: {
        bg: 'bg-gradient-to-br from-[#f97316] to-[#fb923c]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#fed7aa',
    },
    info: {
        bg: 'bg-gradient-to-br from-[#0284c7] to-[#38bdf8]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#bae6fd',
    },
};

export function StatCard({ titulo, valor, icono, color = 'primary', descripcion }) {
    const c = colores[color] || colores.primary;

    return (
        <article
            className={`
                group relative min-h-[135px] overflow-hidden rounded-[8px]
                px-5 py-4 text-white
                shadow-[0_5px_15px_rgba(30,64,175,0.12)]
                transition-all duration-300
                hover:-translate-y-0.5
                hover:shadow-[0_10px_22px_rgba(30,64,175,0.18)]
                ${c.bg}
            `}
        >
            <div className="relative z-10">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-white/90">
                            {titulo}
                        </p>
                        <p className="mt-3 text-[27px] font-bold leading-none tracking-[-0.02em] text-white">
                            {valor}
                        </p>
                        {descripcion && (
                            <p className="mt-2 text-[11px] font-medium leading-relaxed text-white/85">
                                {descripcion}
                            </p>
                        )}
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${c.iconBg} backdrop-blur-sm`}>
                        <span className={`text-base ${c.iconText}`}>
                            {icono}
                        </span>
                    </div>
                </div>
            </div>

            {/* Mini gráfica decorativa estilo Valex */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[40px] opacity-70">
                <svg viewBox="0 0 400 55" preserveAspectRatio="none" className="h-full w-full">
                    <path
                        d="M0 42 L20 35 L45 43 L70 39 L92 45 L118 27 L140 20 L165 28 L190 38 L215 25 L240 32 L265 17 L285 30 L305 24 L330 37 L355 21 L380 30 L400 25"
                        fill="none" stroke={c.line} strokeWidth="2"
                    />
                    <path
                        d="M0 42 L20 35 L45 43 L70 39 L92 45 L118 27 L140 20 L165 28 L190 38 L215 25 L240 32 L265 17 L285 30 L305 24 L330 37 L355 21 L380 30 L400 25 L400 55 L0 55 Z"
                        fill="rgba(255,255,255,0.10)"
                    />
                </svg>
            </div>
        </article>
    );
}
