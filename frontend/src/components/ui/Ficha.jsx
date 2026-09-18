export function Ficha({ icono, etiqueta, children }) {
    return (
        <div className="detail-tile rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                {icono} {etiqueta}
            </div>
            <div className="mt-3 font-bold text-slate-800">{children}</div>
        </div>
    );
}
