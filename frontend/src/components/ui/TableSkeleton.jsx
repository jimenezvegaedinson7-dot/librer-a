export function TableSkeleton({ filas = 6, columnas = 6, titulo = false }) {
    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" role="status" aria-label="Cargando tabla">
            {titulo && (
                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                    <div className="h-3.5 w-44 animate-pulse rounded bg-slate-200/80" />
                </div>
            )}
            <table className="min-w-full border-collapse">
                <thead className="bg-slate-50/80">
                    <tr>
                        {Array.from({ length: columnas }).map((_, i) => (
                            <th key={i} className="px-4 py-2.5">
                                <div className="h-2.5 w-16 animate-pulse rounded bg-slate-200/80" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {Array.from({ length: filas }).map((_, fila) => (
                        <tr key={fila}>
                            {Array.from({ length: columnas }).map((_, col) => (
                                <td key={col} className="px-4 py-3">
                                    <div className="h-3 animate-pulse rounded bg-slate-100" />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}