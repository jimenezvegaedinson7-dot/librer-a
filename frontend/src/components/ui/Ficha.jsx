export function Ficha({ icono, etiqueta, children }) {
    return (
        <div className="detail-tile relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2.5">
                {icono && (
                    <div className="ficha-icono flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm" aria-hidden="true">
                        {icono}
                    </div>
                )}
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    {etiqueta}
                </span>
            </div>
            <div className="ficha-valor mt-2.5 text-[17px] font-semibold leading-snug text-slate-900">{children}</div>
        </div>
    );
}
