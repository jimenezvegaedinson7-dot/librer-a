export function Ficha({ icono, etiqueta, children }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-card transition hover:border-slate-300">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-xs text-primary-600">
                    {icono}
                </span>
                {etiqueta}
            </div>
            <div className="mt-3 font-semibold text-slate-800">{children}</div>
        </div>
    );
}