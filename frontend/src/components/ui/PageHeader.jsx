export function PageHeader({ titulo, descripcion, acciones = null, icono = null, color = 'slate' }) {
    const iconBg = {
        blue: 'bg-[#f6e6e4] text-[#8a2c36]',
        rose: 'bg-[#ffe4e6] text-[#e11d48]',
        emerald: 'bg-[#d1fae5] text-[#059669]',
        amber: 'bg-[#fef3c7] text-[#d97706]',
        violet: 'bg-[#ede9fe] text-[#7c3aed]',
        sky: 'bg-[#e0f2fe] text-[#0284c7]',
        slate: 'bg-[#f3efe9] text-[#5c544b]',
    }[color] || 'bg-[#f3efe9] text-[#5c544b]';

    return (
        <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-3.5">
                    {icono && <span className={`page-header-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[18px] ${iconBg}`}>{icono}</span>}
                    <div>
                        <h1 className="font-title text-[22px] font-semibold leading-tight tracking-[-0.015em] text-[#1c1814] sm:text-[27px]">{titulo}</h1>
                        {descripcion && <p className="mt-1 text-sm text-[#766d62]">{descripcion}</p>}
                    </div>
                </div>
            </div>
            {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
    );
}
