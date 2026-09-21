const colores = { 
    primary: { 
        bg: 'bg-gradient-to-br from-[#ffffff] via-[#faf8f5] to-[#f4eee7]', 
        accent: 'bg-mahogany-500', 
        iconBg: 'bg-mahogany-50 border border-mahogany-100', 
        iconText: 'text-mahogany-700', 
    }, 
    success: { 
        bg: 'bg-gradient-to-br from-[#ffffff] via-[#f6fbf8] to-[#eaf6ee]', 
        accent: 'bg-emerald-500', 
        iconBg: 'bg-emerald-50 border border-emerald-100', 
        iconText: 'text-emerald-600', 
    }, 
    warning: { 
        bg: 'bg-gradient-to-br from-[#ffffff] via-[#fdfaf3] to-[#f8efd9]', 
        accent: 'bg-amber-500', 
        iconBg: 'bg-amber-50 border border-amber-100', 
        iconText: 'text-amber-600', 
    }, 
    danger: { 
        bg: 'bg-gradient-to-br from-[#ffffff] via-[#fdf7f7] to-[#faeaea]', 
        accent: 'bg-red-500', 
        iconBg: 'bg-red-50 border border-red-100', 
        iconText: 'text-red-500', 
    }, 
    info: { 
        bg: 'bg-gradient-to-br from-[#ffffff] via-[#f5f9fc] to-[#e9f2f9]', 
        accent: 'bg-sky-500', 
        iconBg: 'bg-sky-50 border border-sky-100', 
        iconText: 'text-sky-600', 
    }, 
}; 
 
export function StatCard({ titulo, valor, icono, color = 'primary' }) { 
    const c = colores[color] || colores.primary; 
 
    return ( 
        <article
            className={`
                group relative overflow-hidden rounded-2xl border border-black/[0.05]
                p-5 shadow-[0_4px_18px_rgba(60,35,20,0.05)]
                transition-all duration-300 ease-out
                hover:-translate-y-1
                hover:shadow-[0_12px_32px_rgba(60,35,20,0.10)]
                ${c.bg}
            `}
        > 
 
            {/* acento superior */} 
            <div
                className={`
                    absolute left-0 top-0 h-[3px] w-full
                    ${c.accent}
                    opacity-80
                `}
            /> 
 
            <div className="relative flex items-start gap-4"> 
 
                <div
                    className={`
                        flex h-11 w-11 shrink-0 items-center justify-center
                        rounded-xl shadow-sm
                        ${c.iconBg}
                        transition-all duration-300
                        group-hover:scale-105
                        group-hover:shadow-md
                    `}
                > 
                    <span className={`text-lg ${c.iconText}`}>
                        {icono}
                    </span> 
                </div> 
 
                <div className="min-w-0 flex-1 pt-0.5"> 
                    <p className="
                        text-[10px] font-semibold uppercase
                        tracking-[0.16em]
                        text-[#8a7a70]
                    "> 
                        {titulo} 
                    </p> 

                    <p className="
                        mt-1.5 text-[26px] font-bold
                        leading-none tracking-tight
                        text-mahogany-900
                    "> 
                        {valor} 
                    </p> 
                </div> 
 
            </div>

            {/* detalle decorativo sutil */}
            <div className="
                pointer-events-none absolute -bottom-8 -right-8
                h-24 w-24 rounded-full
                bg-white/40 blur-2xl
                transition-transform duration-500
                group-hover:scale-125
            " />
        </article> 
    ); 
}