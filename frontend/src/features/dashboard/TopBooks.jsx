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
        <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-center justify-between border-b border-slate-300 bg-slate-50/50 px-4 py-3">

                <div className="flex items-center gap-2.5">

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-sm text-amber-700">
                        <FaRankingStar />
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-900">
                            Libros más vendidos
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-600">
                            Ranking de ventas pagadas
                        </p>
                    </div>

                </div>

                <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
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
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        index === 0
                                            ? 'bg-amber-100 text-amber-700'
                                            : index === 1
                                                ? 'bg-slate-200 text-slate-700'
                                                : index === 2
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-slate-100 text-slate-500'
                                    }`}
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

                                    <p className="text-xs font-bold text-emerald-700">
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