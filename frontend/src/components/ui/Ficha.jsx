export function Ficha({ icono, etiqueta, children }) {
    return (
        <div className="detail-tile relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2.5">
                {icono && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
                        {icono}
                    </div>
                )}
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {etiqueta}
                </span>
            </div>
            <div className="mt-2.5 text-lg font-bold text-slate-900">{children}</div>
        </div>
    );
}
