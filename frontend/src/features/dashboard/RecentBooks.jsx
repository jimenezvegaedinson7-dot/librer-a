import {
    FaArrowRight,
    FaBookOpen
} from 'react-icons/fa6';

import { useNavigate } from 'react-router-dom';

function RecentBooks({
    libros = []
}) {
    const navigate = useNavigate();

    // ========================================
    // ESTADO DEL STOCK
    // ========================================
    const obtenerStock = (stock) => {
        const cantidad = Number(stock || 0);

        if (cantidad <= 0) {
            return {
                texto: 'Sin stock',
                clase: 'bg-red-100 text-red-700'
            };
        }

        if (cantidad <= 5) {
            return {
                texto: `${cantidad} disponibles`,
                clase: 'bg-amber-100 text-amber-700'
            };
        }

        return {
            texto: `${cantidad} disponibles`,
            clase: 'bg-emerald-100 text-emerald-700'
        };
    };

    // ========================================
    // ÚLTIMOS 5 LIBROS
    // ========================================
    const librosRecientes = libros.slice(0, 5);

    return (
        <section className="dashboard-panel overflow-hidden rounded-lg border border-slate-200 bg-white">

            {/* ========================================
                CABECERA
            ======================================== */}
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-2.5">

                    <div className="flex h-8 w-8 items-center justify-center text-sm text-primary-700">
                        <FaBookOpen />
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            Últimos libros agregados
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-600">
                            Libros registrados recientemente
                        </p>
                    </div>

                </div>

                <span className="w-fit text-xs text-slate-500">
                    {librosRecientes.length}{' '}
                    {librosRecientes.length === 1
                        ? 'libro'
                        : 'libros'}
                </span>

            </div>

            {/* ========================================
                CONTENIDO
            ======================================== */}
            <div className="p-3">

                {librosRecientes.length === 0 ? (

                    <div className="flex flex-col items-center justify-center py-7 text-center">

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-400">
                            <FaBookOpen />
                        </div>

                        <p className="mt-2 text-xs font-semibold text-slate-700">
                            No hay libros registrados
                        </p>

                        <p className="mt-1 text-[11px] text-slate-600">
                            Los últimos libros agregados aparecerán aquí.
                        </p>

                    </div>

                ) : (

                    <div className="overflow-x-auto">

                        <table className="min-w-full">

                            {/* ========================================
                                CABECERA TABLA
                            ======================================== */}
                            <thead>

                                <tr className="border-b border-slate-200 bg-slate-50">

                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                                        Título
                                    </th>

                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                                        Autor
                                    </th>

                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                                        Categoría
                                    </th>

                                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                                        Stock
                                    </th>

                                </tr>

                            </thead>

                            {/* ========================================
                                CUERPO TABLA
                            ======================================== */}
                            <tbody className="divide-y divide-slate-200">

                                {librosRecientes.map((libro) => {
                                    const stock =
                                        obtenerStock(libro.stock);

                                    return (
                                        <tr
                                            key={libro.id_libro}
                                            className="transition-colors hover:bg-slate-50"
                                        >

                                            {/* TÍTULO */}
                                            <td className="px-3 py-2.5">

                                                <p className="max-w-xs truncate text-xs font-semibold text-slate-800">
                                                    {libro.titulo ||
                                                        'Sin título'}
                                                </p>

                                            </td>

                                            {/* AUTOR */}
                                            <td className="px-3 py-2.5 text-xs font-medium text-slate-700">
                                                {libro.autor ||
                                                    'Sin autor'}
                                            </td>

                                            {/* CATEGORÍA */}
                                            <td className="px-3 py-2.5">

                                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                                    {libro.categoria ||
                                                        'Sin categoría'}
                                                </span>

                                            </td>

                                            {/* STOCK */}
                                            <td className="px-3 py-2.5 text-center">

                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${stock.clase}`}
                                                >
                                                    {stock.texto}
                                                </span>

                                            </td>

                                        </tr>
                                    );
                                })}

                            </tbody>

                        </table>

                    </div>

                )}

                {/* ========================================
                    BOTÓN VER TODOS
                ======================================== */}
                {librosRecientes.length > 0 && (

                    <div className="mt-3 flex justify-end">

                        <button
                            type="button"
                            onClick={() =>
                                navigate('/libros')
                            }
                            className="group inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-primary-700 hover:text-primary-700"
                        >
                            Ver todos

                            <FaArrowRight className="text-[10px] transition-transform duration-200 group-hover:translate-x-0.5" />
                        </button>

                    </div>

                )}

            </div>

        </section>
    );
}

export default RecentBooks;
