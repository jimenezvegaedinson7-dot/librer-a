import { FaBook, FaArrowRight } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

function RecentBooks({ libros = [], stockBajo = [] }) {
    const navigate = useNavigate();

    // Stock bajo según el mínimo configurado en Inventario (la lista ya viene
    // del backend), no un umbral fijo; los libros inactivos se indican aparte.
    // stockBajo null = la consulta falló: no se clasifica como bajo ni normal.
    const idsStockBajo = stockBajo ? new Set(stockBajo.map((item) => Number(item.id_libro))) : null;

    const obtenerStock = (libro) => {
        const cantidad = Number(libro.stock || 0);

        if (Number(libro.estado) === 0) {
            return { texto: 'Inactivo', clase: 'estado--neutro' };
        }

        if (cantidad <= 0) {
            return { texto: 'Sin stock', clase: 'estado--peligro' };
        }

        if (!idsStockBajo) {
            return { texto: `${cantidad} disp.`, clase: 'estado--neutro' };
        }

        if (idsStockBajo.has(Number(libro.id_libro))) {
            return { texto: `${cantidad} disp.`, clase: 'estado--aviso' };
        }

        return { texto: `${cantidad} disp.`, clase: 'estado--exito' };
    };

    const librosRecientes = libros.slice(0, 5);

    return (
        <section className="grafico-card recientes">

            {/* cabecera */}
            <div className="recientes-encabezado flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2f8f6]">
                        <FaBook className="text-[18px] text-[#0b5c51]" />
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
                    className="group flex items-center gap-1.5 rounded-lg border border-[#e6e0d7] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#0b5c51] transition-all hover:bg-[#f2f8f6] hover:border-[#d3cbbf]"
                >
                    Ver todos
                    <FaArrowRight className="text-[10px] transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>

            {/* contenido */}
            {librosRecientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f8f6]">
                        <FaBook className="text-[20px] text-[#0b5c51]/40" />
                    </div>
                    <p className="text-[14px] font-semibold text-[#1c1814]">No hay libros registrados</p>
                    <p className="mt-1 text-[13px] text-[#766d62]">Los últimos libros agregados aparecerán aquí.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="recientes-cabecera">
                                <th className="px-4 sm:px-6 py-3 text-left text-[12px] font-bold uppercase tracking-[0.05em]">
                                    Libro
                                </th>
                                <th className="px-4 sm:px-6 py-3 text-left text-[12px] font-bold uppercase tracking-[0.05em]">
                                    Autor
                                </th>
                                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-[12px] font-bold uppercase tracking-[0.05em]">
                                    Categoría
                                </th>
                                <th className="px-4 sm:px-6 py-3 text-right text-[12px] font-bold uppercase tracking-[0.05em]">
                                    Stock
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {librosRecientes.map((libro, index) => {
                                const stock = obtenerStock(libro);

                                return (
                                    <tr
                                        key={libro.id_libro}
                                        className={`recientes-fila ${index < librosRecientes.length - 1 ? 'recientes-fila--linea' : ''}`}
                                    >
                                        <td className="px-4 sm:px-6 py-4 align-middle">
                                            <span className="text-[14px] font-medium text-[#1c1814]">
                                                {libro.titulo || 'Sin título'}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-[14px] text-[#766d62] align-middle">
                                            {libro.autor || 'Sin autor'}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-[14px] text-[#766d62] align-middle">
                                            {libro.categoria || 'Sin categoría'}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-right align-middle">
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
