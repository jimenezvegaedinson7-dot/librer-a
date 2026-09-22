import { useState } from 'react';
import { FaRankingStar, FaBookOpen } from 'react-icons/fa6';
import { construirUrlArchivo } from '../../lib/utils/url';

function PortadaLibro({ portada, titulo }) {
    const [error, setError] = useState(false);
    const url = construirUrlArchivo(portada);

    if (!url || error) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[#f3efe9]">
                <FaBookOpen className="text-[10px] text-[#a39a8e]" />
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={`Portada de ${titulo}`}
            className="h-full w-full object-cover"
            onError={() => setError(true)}
            loading="lazy"
        />
    );
}

function TopBooks({ libros = [] }) {
    const lista = Array.isArray(libros) ? libros.slice(0, 5) : [];

    return (
        <section
            className="
                overflow-hidden
                rounded-2xl
                border
                border-[#e6e0d7]
                bg-white
                shadow-sm
            "
        >
            {/* cabecera */}
            <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-3.5">
                    <div
                        className="
                            flex h-11 w-11
                            items-center justify-center
                            rounded-xl
                            bg-[#fbf5f4]
                            text-[#8a2c36]
                        "
                    >
                        <FaRankingStar className="text-[18px]" />
                    </div>
                    <div>
                        <h3
                            className="
                                font-title
                                text-[18px]
                                font-semibold
                                leading-tight
                                text-[#1c1814]
                            "
                        >
                            Libros más vendidos
                        </h3>
                        <p className="mt-0.5 text-[13px] text-[#766d62]">
                            Ranking de ventas pagadas
                        </p>
                    </div>
                </div>
                <span className="text-[12px] font-semibold text-[#8a2c36]">
                    Top {lista.length}
                </span>
            </div>

            {/* contenido */}
            {lista.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div
                        className="
                            mb-3
                            flex h-10 w-10
                            items-center justify-center
                            rounded-full
                            bg-[#fbf5f4]
                            text-[#8a2c36]
                        "
                    >
                        <FaBookOpen />
                    </div>
                    <p className="text-[14px] font-semibold text-[#1c1814]">
                        No hay ventas pagadas
                    </p>
                    <p className="mt-1 text-[12px] text-[#a39a8e]">
                        Los libros más vendidos aparecerán aquí.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-y border-[#f3efe9] bg-[#faf8f5]">
                                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#766d62]">
                                    Libro
                                </th>
                                <th className="hidden px-4 py-3 text-left 2xl:table-cell text-[12px] font-semibold uppercase tracking-[0.03em] text-[#766d62]">
                                    Categoría
                                </th>
                                <th className="px-4 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.03em] text-[#766d62]">
                                    Ventas
                                </th>
                                <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.03em] text-[#766d62]">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map((libro, index) => (
                                <tr
                                    key={libro.id_libro}
                                    className={`transition-colors duration-150 hover:bg-[#faf8f5] ${
                                        index < lista.length - 1 ? 'border-b border-[#f3efe9]' : ''
                                    }`}
                                >
                                    <td className="px-4 py-4 align-middle">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-7 shrink-0 overflow-hidden rounded-md bg-[#f3efe9] shadow-sm">
                                                <PortadaLibro portada={libro.portada} titulo={libro.titulo} />
                                            </div>
                                            <span className="truncate text-[14px] font-medium text-[#1c1814]">
                                                {libro.titulo || 'Sin título'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="hidden px-4 py-4 2xl:table-cell text-[14px] text-[#766d62] align-middle">
                                        {libro.categoria || '—'}
                                    </td>
                                    <td className="px-4 py-4 text-center text-[14px] font-semibold text-[#1c1814] align-middle">
                                        {Number(libro.cantidad_vendida || 0)}
                                    </td>
                                    <td className="px-4 py-4 text-right text-[14px] font-semibold text-[#1c1814] align-middle">
                                        S/ {Number(libro.total_generado || 0).toFixed(2)}
                                    </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
            )}
        </section>
    );
}

export default TopBooks;
