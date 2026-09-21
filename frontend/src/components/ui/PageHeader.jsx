export function PageHeader({ titulo, descripcion, acciones = null, icono = null, color = 'slate' }) {
    const iconBg = {
        blue: 'bg-[#dbeafe] text-[#2563eb]',
        rose: 'bg-[#ffe4e6] text-[#e11d48]',
        emerald: 'bg-[#d1fae5] text-[#059669]',
        amber: 'bg-[#fef3c7] text-[#d97706]',
        violet: 'bg-[#ede9fe] text-[#7c3aed]',
        sky: 'bg-[#e0f2fe] text-[#0284c7]',
        slate: 'bg-[#f1f5f9] text-[#475569]',
    }[color] || 'bg-[#f1f5f9] text-[#475569]';

    return (
        <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    {icono && <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>{icono}</span>}
                    <div>
                        <h1 className="font-title text-xl font-semibold tracking-tight text-[#0f172a] sm:text-2xl">{titulo}</h1>
                        {descripcion && <p className="mt-0.5 text-sm text-[#64748b]">{descripcion}</p>}
                    </div>
                </div>
            </div>
            {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
    );
}
