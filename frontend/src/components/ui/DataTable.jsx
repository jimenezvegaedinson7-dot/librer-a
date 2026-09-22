import { FaInbox, FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6';

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

    const ariaSort = (col) => {
        if (!col.ordenable || !onOrdenar || orden?.campo !== col.campo) return undefined;
        return orden.direccion === 'asc' ? 'ascending' : 'descending';
    };

    const renderEncabezado = (col) => {
        if (!col.ordenable || !onOrdenar || !col.campo) return col.titulo;

        const activo = orden?.campo === col.campo;
        const Icono = activo ? (orden.direccion === 'asc' ? FaSortUp : FaSortDown) : FaSort;

        return (
            <button
                type="button"
                onClick={() => onOrdenar(col.campo)}
                title={`Ordenar por ${col.titulo}`}
                className={`tabla-orden ${activo ? 'tabla-orden--activo' : ''}`}
            >
                {col.titulo}
                <Icono className="text-[10px]" aria-hidden="true" />
            </button>
        );
    };

    const alinear = (col) => (col.alineacion === 'centro' ? 'text-center' : col.alineacion === 'derecha' ? 'text-right' : 'text-left');

    return (
        <div className="data-table-shell overflow-x-auto">
            <table className="min-w-full border-collapse">
                <thead>
                    <tr className="bg-parchment-100">
                        {columnas.map((col, i) => (
                            <th
                                key={i}
                                scope="col"
                                aria-sort={ariaSort(col)}
                                className={`whitespace-nowrap border-b border-primary-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-primary-400 ${alinear(col)}`}
                            >
                                {renderEncabezado(col)}
                            </th>
                        ))}
                        {acciones && (
                            <th scope="col" className="border-b border-primary-100 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-primary-400">
                                Acciones
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                    {filas.length === 0 ? (
                        <tr>
                            <td colSpan={columnas.length + (acciones ? 1 : 0)} className="px-4 py-14 text-center">
                                <div className="flex flex-col items-center gap-2.5 text-slate-500">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-base">
                                        <FaInbox aria-hidden="true" />
                                    </span>
                                    <span className="text-sm">{vacio}</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filas.map((fila, indice) => (
                            <tr
                                key={keyExtractor ? keyExtractor(fila) : fila?.id}
                                onClick={filaClickable ? () => onFilaClick(fila) : undefined}
                                onKeyDown={
                                    filaClickable
                                        ? (e) => {
                                              if (e.target !== e.currentTarget) return;
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                  e.preventDefault();
                                                  onFilaClick(fila);
                                              }
                                          }
                                        : undefined
                                }
                                tabIndex={filaClickable ? 0 : undefined}
                                style={{ '--fila-i': Math.min(indice, 12) }}
                                className={`tabla-fila transition last:border-0 ${
                                    filaClickable ? 'tabla-fila--clic cursor-pointer' : ''
                                }`}
                            >
                                {columnas.map((col, i) => (
                                    <td key={i} className={`px-4 py-3 text-sm ${alinear(col)}`}>
                                        {col.render ? col.render(fila) : String(fila?.[col.campo] ?? '')}
                                    </td>
                                ))}
                                {acciones && (
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                        <div className="tabla-acciones flex items-center justify-center gap-1.5">{acciones(fila)}</div>
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
