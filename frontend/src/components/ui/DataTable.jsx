import { cn } from '@/lib/utils';

export function DataTable({
    columns,
    data,
    loading,
    error,
    noResultsText = 'No hay datos',
    ...props
}) {
    if (loading) {
        return (
            <div className="min-h-[200px] grid place-items-center text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                Cargando...
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[200px] flex items-center justify-center text-error">
                Error al cargar los datos
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="min-h-[200px] text-center text-muted-foreground py-8">
                <EmptyState>
                    <EmptyState.Icon />
                    <EmptyState.Title>{noResultsText}</EmptyState.Title>
                    <EmptyState.Description>
                        No hay registros para mostrar
                    </EmptyState.Description>
                </EmptyState>
            </div>
        );
    }

    return (
        <div {...props}>
            <div className="overflow-x-auto rounded-lg border-border bg-card shadow-sm">
                <table className="min-w-full table">
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <th key={column.id} className="border-border p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.id} className="hover:bg-surface-dark transition-colors">
                                {columns.map((column) => (
                                    <td
                                        key={column.id}
                                        className="border-border p-3 align-middle font-medium text-sm"
                                    >
                                        {column.accessor ? column.accessor(row) : row[column.id]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}