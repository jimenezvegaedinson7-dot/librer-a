import { useState } from 'react';
import { FaRankingStar, FaBookOpen } from 'react-icons/fa6';
import { construirUrlArchivo } from '../../lib/utils/url';

const medallas = [
    { bg: 'bg-gradient-to-br from-amber-400 to-amber-500', text: 'text-white', shadow: 'shadow-amber-200/50' },
    { bg: 'bg-gradient-to-br from-primary-300 to-primary-400', text: 'text-white', shadow: 'shadow-primary-200/50' },
    { bg: 'bg-gradient-to-br from-amber-600 to-amber-700', text: 'text-white', shadow: 'shadow-amber-200/50' },
];

function PortadaLibro({ portada, titulo }) {
    const [error, setError] = useState(false);
    const url = construirUrlArchivo(portada);

    if (!url || error) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-parchment-300 to-parchment-400">
                <FaBookOpen className="text-lg text-primary-300" />
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
        <section className="h-full overflow-hidden rounded-2xl border border-primary-200/60 bg-white shadow-sm">

            {/* cabecera */}
            <div className="flex items-center justify-between border-b border-primary-100 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <FaRankingStar />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-mahogany-800">Libros más vendidos</h3>
                        <p className="text-[11px] text-primary-400">Ranking de ventas pagadas</p>
                    </div>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-[10px] font-medium text-primary-500">
                    Top {lista.length}
                </span>
            </div>

            {/* lista */}
            {lista.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-300">
                        <FaBookOpen />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-mahogany-700">No hay ventas pagadas</p>
                    <p className="mt-1 text-xs text-primary-400">Los libros más vendidos aparecerán aquí.</p>
                </div>
            ) : (
                <div className="divide-y divide-primary-100">
                    {lista.map((libro, index) => {
                        const medal = medallas[index] || null;

                        return (
                            <div
                                key={libro.id_libro}
                                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-parchment-200/40"
                            >
                                {/* portada + ranking */}
                                <div className="relative shrink-0">

                                    {/* portada */}
                                    <div className="h-14 w-10 overflow-hidden rounded-lg bg-parchment-200 shadow-sm ring-1 ring-black/5">
                                        <PortadaLibro portada={libro.portada} titulo={libro.titulo} />
                                    </div>

                                    {/* badge ranking */}
                                    <div className={`absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${medal ? `${medal.bg} ${medal.text} shadow-md ${medal.shadow}` : 'bg-primary-100 text-primary-600'}`}>
                                        {index + 1}
                                    </div>

                                </div>

                                {/* info */}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-mahogany-800 group-hover:text-mahogany-900">
                                        {libro.titulo}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-primary-400">
                                        {Number(libro.cantidad_vendida || 0)} unidades vendidas
                                    </p>
                                </div>

                                {/* monto */}
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-mahogany-700">
                                        S/ {Number(libro.total_generado || 0).toFixed(2)}
                                    </p>
                                    <p className="text-[10px] text-primary-300">generado</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default TopBooks;
