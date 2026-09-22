import { FaBookOpen, FaArrowRight } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

function RecentBooks({ libros = [] }) {
    const navigate = useNavigate();

    const obtenerStock = (stock) => {
        const cantidad = Number(stock || 0);

        if (cantidad <= 0) {
            return { texto: 'Sin stock', clase: 'estado--peligro' };
        }

        if (cantidad <= 5) {
            return { texto: `${cantidad} disp.`, clase: 'estado--aviso' };
        }

        return { texto: `${cantidad} disp.`, clase: 'estado--exito' };
    };

    const librosRecientes = libros.slice(0, 5);

    return (
        <section className="overflow-hidden rounded-2xl border border-[#e6e0d7] bg-white shadow-sm">

            {/* cabecera */}
            <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fbf5f4]">
                        <FaBookOpen className="text-[18px] text-[#8a2c36]" />
                    </div>
                    <div>
                        <h3 className="font-title text-[18px] font-semibold text-[#1c1814]">
                            Últimos libros agregados
                        </h3>
                        <p className="mt-0.5 text-[13px] text-[#766d62]">
                            Libros registrados recientemente
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/libros')}
                    className="group flex items-center gap-1.5 rounded-lg border border-[#e6e0d7] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#8a2c36] transition-all hover:bg-[#fbf5f4] hover:border-[#d3cbbf]"
                >
                    Ver todos
                    <FaArrowRight className="text-[10px] transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>

            {/* contenido */}
            {librosRecientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbf5f4]">
                        <FaBookOpen className="text-[20px] text-[#8a2c36]/40" />
                    </div>
                    <p className="text-[14px] font-semibold text-[#1c1814]">No hay libros registrados</p>
                    <p className="mt-1 text-[13px] text-[#766d62]">Los últimos libros agregados aparecerán aquí.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-y border-[#f3efe9] bg-[#faf8f5]">
                                <th className="px-6 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#766d62]">
                                    Libro
                                </th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#766d62]">
                                    Autor
                                </th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#766d62]">
                                    Categoría
                                </th>
                                <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.03em] text-[#766d62]">
                                    Stock
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {librosRecientes.map((libro, index) => {
                                const stock = obtenerStock(libro.stock);

                                return (
                                    <tr
                                        key={libro.id_libro}
                                        className={`transition-colors duration-150 hover:bg-[#faf8f5] ${
                                            index < librosRecientes.length - 1 ? 'border-b border-[#f3efe9]' : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4 align-middle">
                                            <span className="text-[14px] font-medium text-[#1c1814]">
                                                {libro.titulo || 'Sin título'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[14px] text-[#766d62] align-middle">
                                            {libro.autor || 'Sin autor'}
                                        </td>
                                        <td className="px-6 py-4 text-[14px] text-[#766d62] align-middle">
                                            {libro.categoria || 'Sin categoría'}
                                        </td>
                                        <td className="px-6 py-4 text-right align-middle">
                                            <span
                                                className={`estado-pildora ${stock.clase}`}
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
        </section>
    );
}

export default RecentBooks;
