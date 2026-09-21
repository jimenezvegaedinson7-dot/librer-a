const variantes = {
    blue: {
        border: 'border-l-[#3b82f6]',
        bg: 'bg-[#eff6ff]',
        iconBg: 'bg-[#dbeafe]',
        iconText: 'text-[#2563eb]',
        label: 'text-[#2563eb]',
        value: 'text-[#1e3a5f]',
    },
    rose: {
        border: 'border-l-[#f43f5e]',
        bg: 'bg-[#fff1f2]',
        iconBg: 'bg-[#ffe4e6]',
        iconText: 'text-[#e11d48]',
        label: 'text-[#e11d48]',
        value: 'text-[#4c0519]',
    },
    emerald: {
        border: 'border-l-[#10b981]',
        bg: 'bg-[#ecfdf5]',
        iconBg: 'bg-[#d1fae5]',
        iconText: 'text-[#059669]',
        label: 'text-[#059669]',
        value: 'text-[#064e3b]',
    },
    amber: {
        border: 'border-l-[#f59e0b]',
        bg: 'bg-[#fffbeb]',
        iconBg: 'bg-[#fef3c7]',
        iconText: 'text-[#d97706]',
        label: 'text-[#d97706]',
        value: 'text-[#78350f]',
    },
    violet: {
        border: 'border-l-[#8b5cf6]',
        bg: 'bg-[#f5f3ff]',
        iconBg: 'bg-[#ede9fe]',
        iconText: 'text-[#7c3aed]',
        label: 'text-[#7c3aed]',
        value: 'text-[#2e1065]',
    },
    sky: {
        border: 'border-l-[#0ea5e9]',
        bg: 'bg-[#f0f9ff]',
        iconBg: 'bg-[#e0f2fe]',
        iconText: 'text-[#0284c7]',
        label: 'text-[#0284c7]',
        value: 'text-[#0c4a6e]',
    },
    slate: {
        border: 'border-l-[#64748b]',
        bg: 'bg-[#f8fafc]',
        iconBg: 'bg-[#f1f5f9]',
        iconText: 'text-[#475569]',
        label: 'text-[#475569]',
        value: 'text-[#1e293b]',
    },
};

export function Ficha({ icono, etiqueta, children, color = 'slate' }) {
    const v = variantes[color] || variantes.slate;
    return (
        <div className={`detail-tile relative overflow-hidden rounded-xl border border-[#e2e8f0] border-l-4 ${v.border} ${v.bg} p-4`}>
            <div className="flex items-center gap-2.5">
                {icono && (
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${v.iconBg} ${v.iconText} text-sm`}>
                        {icono}
                    </div>
                )}
                <span className={`text-xs font-semibold uppercase tracking-wide ${v.label}`}>
                    {etiqueta}
                </span>
            </div>
            <div className={`mt-3 text-lg font-bold ${v.value}`}>{children}</div>

            {/* Efecto burbuja decorativa */}
            <div className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 rounded-full bg-current opacity-[0.04]" />
            <div className="pointer-events-none absolute -bottom-1 -right-6 h-10 w-10 rounded-full bg-current opacity-[0.03]" />
        </div>
    );
}
