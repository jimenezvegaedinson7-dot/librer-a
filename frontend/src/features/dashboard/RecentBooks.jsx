import { FaArrowRight, FaBookOpen } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

function RecentBooks({ libros = [] }) {
    const navigate = useNavigate();

    const obtenerStock = (stock) => {
        const cantidad = Number(stock || 0);

        if (cantidad <= 0) {
            return { texto: 'Sin stock', clase: 'bg-red-50 text-red-500 ring-1 ring-red-200/50' };
        }

        if (cantidad <= 5) {
            return { texto: `${cantidad} disp.`, clase: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/50' };
        }

        return { texto: `${cantidad} disp.`, clase: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50' };
    };

    const librosRecientes = libros.slice(0, 5);

    return (
        <section className="overflow-hidden rounded-2xl border border-primary-200/60 bg-white shadow-sm">

            {/* cabecera */}
            <div className="flex items-center justify-between border-b border-primary-100 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mahogany-50 text-mahogany-600">
                        <FaBookOpen />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-mahogany-800">Últimos libros agregados</h3>
                        <p className="text-[11px] text-primary-400">Libros registrados recientemente</p>
                    </div>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-[10px] font-medium text-primary-500">
                    {librosRecientes.length} {librosRecientes.length === 1 ? 'libro' : 'libros'}
                </span>
            </div>

            {/* contenido */}
            <div className="p-2">
                {librosRecientes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-300">
                            <FaBookOpen />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-mahogany-700">No hay libros registrados</p>
                        <p className="mt-1 text-xs text-primary-400">Los últimos libros agregados aparecerán aquí.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-primary-100">
                                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                                        Título
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                                        Autor
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                                        Categoría
                                    </th>
                                    <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                                        Stock
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-primary-100/60">
                                {librosRecientes.map((libro) => {
                                    const stock = obtenerStock(libro.stock);

                                    return (
                                        <tr
                                            key={libro.id_libro}
                                            className="transition-colors hover:bg-parchment-200/40"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="max-w-[200px] truncate text-sm font-semibold text-mahogany-800">
                                                    {libro.titulo || 'Sin título'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-primary-500">
                                                {libro.autor || 'Sin autor'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex rounded-full bg-parchment-300/60 px-2.5 py-1 text-[10px] font-semibold text-mahogany-600">
                                                    {libro.categoria || 'Sin categoría'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${stock.clase}`}>
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

                {librosRecientes.length > 0 && (
                    <div className="flex justify-end border-t border-primary-100 px-4 py-3">
                        <button
                            type="button"
                            onClick={() => navigate('/libros')}
                            className="group inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-mahogany-700 transition-all hover:border-mahogany-300 hover:bg-mahogany-50 hover:text-mahogany-800"
                        >
                            Ver todos
                            <FaArrowRight className="text-[10px] transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}

export default RecentBooks;
