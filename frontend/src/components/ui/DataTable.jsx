import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6';

export function DataTable({
    columnas,
    filas = [],
    keyExtractor,
    acciones,
    vacio = 'Sin registros',
    orden = null,
    onOrdenar = null,
    onFilaClick = null,
}) {
    const filaClickable = typeof onFilaClick === 'function';
    const renderEncabezado = (col) => {
        if (!col.ordenable || !onOrdenar || !col.campo) return col.titulo;

        const activo = orden?.campo === col.campo;
        const Icono = activo ? (orden.direccion === 'asc' ? FaSortUp : FaSortDown) : FaSort;

        return (
            <button
                type="button"
                onClick={() => onOrdenar(col.campo)}
                title={`Ordenar por ${col.titulo}`}
                className={`inline-flex items-center gap-1.5 transition-colors ${
                    activo ? 'text-mahogany-600' : 'text-primary-400 hover:text-mahogany-600'
                }`}
            >
                {col.titulo}
                <Icono className={`text-xs ${activo ? '' : 'text-primary-300'}`} />
            </button>
        );
    };

    return (
        <div className="data-table-shell overflow-x-auto">
            <table className="min-w-full border-collapse">
                <thead>
                    <tr className="bg-parchment-100">
                        {columnas.map((col, i) => (
                            <th
                                key={i}
                                className={`border-b border-primary-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-primary-400 ${
                                    col.alineacion === 'centro' ? 'text-center' : 'text-left'
                                }`}
                            >
                                {renderEncabezado(col)}
                            </th>
                        ))}
                        {acciones && (
                            <th className="border-b border-primary-100 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-primary-400">
                                Acciones
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                    {filas.length === 0 ? (
                        <tr>
                            <td colSpan={columnas.length + (acciones ? 1 : 0)} className="px-4 py-12 text-center text-sm text-primary-400">
                                {vacio}
                            </td>
                        </tr>
                    ) : (
                        filas.map((fila) => (
                            <tr
                                key={keyExtractor ? keyExtractor(fila) : fila?.id}
                                onClick={filaClickable ? () => onFilaClick(fila) : undefined}
                                className={`transition last:border-0 ${
                                    filaClickable ? 'cursor-pointer' : ''
                                } hover:bg-parchment-100/60`}
                            >
                                {columnas.map((col, i) => (
                                    <td
                                        key={i}
                                        className={`px-4 py-3 text-sm ${
                                            col.alineacion === 'centro' ? 'text-center' : 'text-left'
                                        }`}
                                    >
                                        {col.render ? col.render(fila) : String(fila?.[col.campo] ?? '')}
                                    </td>
                                ))}
                                {acciones && (
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1.5">{acciones(fila)}</div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
