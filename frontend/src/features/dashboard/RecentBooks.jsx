import { FaBookOpen } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

function RecentBooks({ libros = [] }) {
    const navigate = useNavigate();

    const obtenerStock = (stock) => {
        const cantidad = Number(stock || 0);

        if (cantidad <= 0) {
            return { texto: 'Sin stock', clase: 'bg-[#fef2f2] text-[#dc2626]' };
        }

        if (cantidad <= 5) {
            return { texto: `${cantidad} disp.`, clase: 'bg-[#fffbeb] text-[#d97706]' };
        }

        return { texto: `${cantidad} disp.`, clase: 'bg-[#ecfdf5] text-[#059669]' };
    };

    const librosRecientes = libros.slice(0, 5);

    return (
        <section
            className="
                overflow-hidden
                rounded-[7px]
                border
                border-[#e6ebf3]
                bg-white
                shadow-[0_2px_8px_rgba(30,64,175,0.05)]
            "
        >
            {/* cabecera */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <div
                        className="
                            flex h-8 w-8
                            items-center justify-center
                            rounded-[6px]
                            bg-[#edf5ff]
                            text-[#0877e8]
                        "
                    >
                        <FaBookOpen className="text-[14px]" />
                    </div>
                    <div>
                        <h3
                            className="
                                text-[14px]
                                font-semibold
                                leading-tight
                                text-[#071a3d]
                            "
                        >
                            Últimos libros agregados
                        </h3>
                        <p className="mt-0.5 text-[11px] text-[#8490aa]">
                            Libros registrados recientemente
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/libros')}
                    className="
                        text-[11px]
                        font-medium
                        text-[#0877e8]
                        transition
                        hover:text-[#075fc0]
                    "
                >
                    Ver todos
                </button>
            </div>

            {/* contenido */}
            {librosRecientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div
                        className="
                            mb-3
                            flex h-10 w-10
                            items-center justify-center
                            rounded-full
                            bg-[#edf5ff]
                            text-[#0877e8]
                        "
                    >
                        <FaBookOpen />
                    </div>
                    <p className="text-[14px] font-semibold text-[#071a3d]">
                        No hay libros registrados
                    </p>
                    <p className="mt-1 text-[12px] text-[#8490aa]">
                        Los últimos libros agregados aparecerán aquí.
                    </p>
                </div>
            ) : (
                <div className="px-3 pb-3">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#f1f5fb]">
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-[#64728d]">
                                        #
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-[#64728d]">
                                        Libro
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-[#64728d]">
                                        Autor
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-[#64728d]">
                                        Categoría
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-[#64728d]">
                                        Stock
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#edf0f5]">
                                {librosRecientes.map((libro, index) => {
                                    const stock = obtenerStock(libro.stock);

                                    return (
                                        <tr
                                            key={libro.id_libro}
                                            className="transition-colors hover:bg-[#f8fafd]"
                                        >
                                            <td className="px-3 py-2 text-[11px] text-[#8490aa] align-middle">
                                                {index + 1}
                                            </td>
                                            <td className="px-3 py-2 align-middle">
                                                <span className="truncate text-[11px] font-medium text-[#172b4d]">
                                                    {libro.titulo || 'Sin título'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-[11px] text-[#253858] align-middle">
                                                {libro.autor || 'Sin autor'}
                                            </td>
                                            <td className="px-3 py-2 text-[11px] text-[#253858] align-middle">
                                                {libro.categoria || 'Sin categoría'}
                                            </td>
                                            <td className="px-3 py-2 text-center align-middle">
                                                <span
                                                    className={`
                                                        inline-flex
                                                        rounded-full
                                                        px-2
                                                        py-0.5
                                                        text-[10px]
                                                        font-medium
                                                        ${stock.clase}
                                                    `}
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
                </div>
            )}
        </section>
    );
}

export default RecentBooks;
