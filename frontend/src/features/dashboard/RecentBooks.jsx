import { FaBookOpen, FaArrowRight } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

function RecentBooks({ libros = [] }) {
    const navigate = useNavigate();

    const obtenerStock = (stock) => {
        const cantidad = Number(stock || 0);

        if (cantidad <= 0) {
            return { texto: 'Sin stock', color: '#DC2626', bg: '#FEF2F2' };
        }

        if (cantidad <= 5) {
            return { texto: `${cantidad} disp.`, color: '#D97706', bg: '#FFFBEB' };
        }

        return { texto: `${cantidad} disp.`, color: '#059669', bg: '#ECFDF5' };
    };

    const librosRecientes = libros.slice(0, 5);

    return (
        <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">

            {/* cabecera */}
            <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF]">
                        <FaBookOpen className="text-[18px] text-[#2563EB]" />
                    </div>
                    <div>
                        <h3 className="font-title text-[18px] font-semibold text-[#0F172A]">
                            Últimos libros agregados
                        </h3>
                        <p className="mt-0.5 text-[13px] text-[#64748B]">
                            Libros registrados recientemente
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/libros')}
                    className="group flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#2563EB] transition-all hover:bg-[#EFF6FF] hover:border-[#CBD5E1]"
                >
                    Ver todos
                    <FaArrowRight className="text-[10px] transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>

            {/* contenido */}
            {librosRecientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF]">
                        <FaBookOpen className="text-[20px] text-[#2563EB]/40" />
                    </div>
                    <p className="text-[14px] font-semibold text-[#0F172A]">No hay libros registrados</p>
                    <p className="mt-1 text-[13px] text-[#64748B]">Los últimos libros agregados aparecerán aquí.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-y border-[#F1F5F9] bg-[#F8FAFC]">
                                <th className="px-6 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#64748B]">
                                    Libro
                                </th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#64748B]">
                                    Autor
                                </th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#64748B]">
                                    Categoría
                                </th>
                                <th className="px-6 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.03em] text-[#64748B]">
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
                                        className={`transition-colors duration-150 hover:bg-[#F8FAFC] ${
                                            index < librosRecientes.length - 1 ? 'border-b border-[#F1F5F9]' : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4 align-middle">
                                            <span className="text-[14px] font-medium text-[#0f172a]">
                                                {libro.titulo || 'Sin título'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[14px] text-[#64748B] align-middle">
                                            {libro.autor || 'Sin autor'}
                                        </td>
                                        <td className="px-6 py-4 text-[14px] text-[#64748B] align-middle">
                                            {libro.categoria || 'Sin categoría'}
                                        </td>
                                        <td className="px-6 py-4 text-right align-middle">
                                            <span
                                                className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold"
                                                style={{ backgroundColor: stock.bg, color: stock.color }}
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
