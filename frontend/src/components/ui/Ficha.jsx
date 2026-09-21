export function Ficha({ icono, etiqueta, children }) {
    return (
        <div className="detail-tile rounded-xl border border-primary-200 bg-parchment-200 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-400">
                {icono} {etiqueta}
            </div>
            <div className="mt-3 font-bold text-mahogany-700">{children}</div>
        </div>
    );
}
