export function TableSkeleton({ filas = 6, columnas = 6, titulo = false }) {
    return (
        <div className="card overflow-hidden" role="status" aria-live="polite" aria-label="Cargando tabla">
            {titulo && (
                <div className="border-b border-slate-200 px-5 py-4">
                    <div className="skeleton h-4 w-44" />
                    <div className="skeleton mt-2 h-3 w-64 max-w-full" />
                </div>
            )}
            <div className="overflow-hidden">
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            {Array.from({ length: columnas }).map((_, i) => (
                                <th key={i} className="border-b border-slate-200 px-4 py-3">
                                    <div className="skeleton h-2.5 w-16" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {Array.from({ length: filas }).map((_, fila) => (
                            <tr key={fila}>
                                {Array.from({ length: columnas }).map((_, col) => (
                                    <td key={col} className="px-4 py-3.5">
                                        <div className="skeleton h-3" style={{ width: `${55 + ((fila * 7 + col * 13) % 40)}%` }} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <span className="sr-only">Cargando…</span>
        </div>
    );
}
