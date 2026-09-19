import {
    FaRankingStar,
    FaBookOpen
} from 'react-icons/fa6';

function TopBooks({
    libros = []
}) {
    const lista =
        Array.isArray(libros)
            ? libros.slice(0, 5)
            : [];

    return (
        <section className="dashboard-panel h-full overflow-hidden rounded-lg border border-slate-200 bg-white">

            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">

                <div className="flex items-center gap-2.5">

                    <div className="flex h-8 w-8 items-center justify-center text-sm text-primary-700">
                        <FaRankingStar />
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            Libros más vendidos
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-600">
                            Ranking de ventas pagadas
                        </p>
                    </div>

                </div>

                <span className="text-xs text-slate-500">
                    Top {lista.length}
                </span>

            </div>

            {lista.length === 0 ? (

                <div className="flex flex-col items-center justify-center py-8 text-center">

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-400">
                        <FaBookOpen />
                    </div>

                    <p className="mt-2 text-xs font-semibold text-slate-700">
                        No hay ventas pagadas
                    </p>

                    <p className="mt-1 text-[11px] text-slate-600">
                        Los libros más vendidos aparecerán aquí.
                    </p>

                </div>

            ) : (

                <div className="divide-y divide-slate-200">

                    {lista.map(
                        (
                            libro,
                            index
                        ) => (

                            <div
                                key={
                                    libro.id_libro
                                }
                                className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
                            >

                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center border-r border-slate-200 text-xs font-semibold text-slate-500"
                                >
                                    {index + 1}
                                </div>

                                <div className="min-w-0 flex-1">

                                    <p className="truncate text-xs font-semibold text-slate-800">
                                        {libro.titulo}
                                    </p>

                                    <p className="mt-0.5 text-[11px] text-slate-600">
                                        {Number(
                                            libro.cantidad_vendida || 0
                                        )}{' '}
                                        unidades vendidas
                                    </p>

                                </div>

                                <div className="text-right">

                                    <p className="text-xs font-semibold text-slate-800">
                                        S/ {Number(
                                            libro.total_generado || 0
                                        ).toFixed(2)}
                                    </p>

                                    <p className="mt-0.5 text-[10px] text-slate-500">
                                        generado
                                    </p>

                                </div>

                            </div>

                        )
                    )}

                </div>

            )}

        </section>
    );
}

export default TopBooks;
