import { useState } from 'react';
import { FaRankingStar, FaBookOpen } from 'react-icons/fa6';
import { construirUrlArchivo } from '../../lib/utils/url';

function PortadaLibro({ portada, titulo }) {
    const [error, setError] = useState(false);
    const url = construirUrlArchivo(portada);

    if (!url || error) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[#f1f5fb]">
                <FaBookOpen className="text-[10px] text-[#7b879d]" />
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
                rounded-[8px]
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
                        <FaRankingStar className="text-[14px]" />
                    </div>
                    <div>
                        <h3
                            className="
                                text-[16px]
                                font-semibold
                                leading-tight
                                text-[#10213f]
                            "
                        >
                            Libros más vendidos
                        </h3>
                        <p className="mt-0.5 text-[11px] text-[#7b879d]">
                            Ranking de ventas pagadas
                        </p>
                    </div>
                </div>
                <span className="text-[11px] font-medium text-[#0877e8]">
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
                            bg-[#edf5ff]
                            text-[#0877e8]
                        "
                    >
                        <FaBookOpen />
                    </div>
                    <p className="text-[14px] font-semibold text-[#10213f]">
                        No hay ventas pagadas
                    </p>
                    <p className="mt-1 text-[12px] text-[#7b879d]">
                        Los libros más vendidos aparecerán aquí.
                    </p>
                </div>
            ) : (
                <div className="px-3 pb-3">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#f1f5fb]">
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[#55637b]">
                                        Libro
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[#55637b]">
                                        Categoría
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-[#55637b]">
                                        Ventas
                                    </th>
                                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-[#55637b]">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#edf0f5]">
                                {lista.map((libro) => (
                                    <tr
                                        key={libro.id_libro}
                                        className="transition-colors hover:bg-[#f8fafd]"
                                    >
                                        <td className="px-3 py-2.5 align-middle">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-6 shrink-0 overflow-hidden rounded-[2px] bg-[#f1f5fb] shadow-sm">
                                                    <PortadaLibro portada={libro.portada} titulo={libro.titulo} />
                                                </div>
                                                <span className="truncate text-[11px] font-semibold text-[#10213f]">
                                                    {libro.titulo || 'Sin título'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-[11px] font-medium text-[#34445f] align-middle">
                                            {libro.categoria || '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-[11px] font-semibold text-[#10213f] align-middle">
                                            {Number(libro.cantidad_vendida || 0)}
                                        </td>
                                        <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#10213f] align-middle">
                                            S/ {Number(libro.total_generado || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

export default TopBooks;
