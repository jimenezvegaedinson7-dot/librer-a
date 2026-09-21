import { FaRankingStar, FaBookOpen } from 'react-icons/fa6';

function TopBooks({ libros = [] }) {
    const lista = Array.isArray(libros) ? libros.slice(0, 5) : [];

    const medallas = [
        'bg-amber-400 text-white',
        'bg-primary-300 text-white',
        'bg-amber-600 text-white',
    ];

    return (
        <section className="h-full overflow-hidden rounded-2xl border border-primary-200/60 bg-white shadow-sm">

            {/* cabecera */}
            <div className="flex items-center justify-between border-b border-primary-100 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <FaRankingStar />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-mahogany-800">Libros más vendidos</h3>
                        <p className="text-[11px] text-primary-400">Ranking de ventas pagadas</p>
                    </div>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-[10px] font-medium text-primary-500">
                    Top {lista.length}
                </span>
            </div>

            {/* lista */}
            {lista.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-300">
                        <FaBookOpen />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-mahogany-700">No hay ventas pagadas</p>
                    <p className="mt-1 text-xs text-primary-400">Los libros más vendidos aparecerán aquí.</p>
                </div>
            ) : (
                <div className="divide-y divide-primary-100">
                    {lista.map((libro, index) => (
                        <div
                            key={libro.id_libro}
                            className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-parchment-200/50"
                        >
                            {/* ranking */}
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${medallas[index] || 'bg-primary-100 text-primary-500'}`}>
                                {index + 1}
                            </div>

                            {/* info */}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-mahogany-800 group-hover:text-mahogany-900">
                                    {libro.titulo}
                                </p>
                                <p className="mt-0.5 text-[11px] text-primary-400">
                                    {Number(libro.cantidad_vendida || 0)} unidades vendidas
                                </p>
                            </div>

                            {/* monto */}
                            <div className="text-right">
                                <p className="text-sm font-bold text-mahogany-700">
                                    S/ {Number(libro.total_generado || 0).toFixed(2)}
                                </p>
                                <p className="text-[10px] text-primary-300">generado</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default TopBooks;
