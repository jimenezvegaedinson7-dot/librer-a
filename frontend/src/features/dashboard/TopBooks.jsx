import { useState } from 'react';

import { FaBookOpen, FaRankingStar } from 'react-icons/fa6';

import { construirUrlArchivo } from '../../lib/utils/url';
import { formatearMoneda } from '../../lib/utils/format';
import { num } from './graficoUtils';

function PortadaLibro({ portada }) {
    const [error, setError] = useState(false);
    const url = construirUrlArchivo(portada);

    if (!url || error) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[#f3efe9]">
                <FaBookOpen className="text-[10px] text-[#a39a8e]" aria-hidden="true" />
            </div>
        );
    }

    return (
        <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setError(true)}
            loading="lazy"
        />
    );
}

function TopBooks({ libros = [], limite = 5 }) {
    const lista = Array.isArray(libros) ? libros.slice(0, limite) : [];
    const maxUnidades = Math.max(1, ...lista.map((l) => num(l.cantidad_vendida)));
    const totalUnidades = lista.reduce((acc, l) => acc + num(l.cantidad_vendida), 0);
    const totalIngresos = lista.reduce((acc, l) => acc + num(l.total_generado), 0);

    return (
        <section className="grafico-card flex h-full flex-col" aria-labelledby="titulo-top-libros">
            <header className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="ficha-icono flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" aria-hidden="true">
                        <FaRankingStar />
                    </span>
                    <div className="min-w-0">
                        <h2 id="titulo-top-libros" className="font-title text-[18px] font-semibold leading-snug text-[#1c1814]">
                            Libros más vendidos
                        </h2>
                        <p className="mt-0.5 text-[13px] text-[#766d62]">Unidades en ventas pagadas</p>
                    </div>
                </div>
                {lista.length > 0 && <span className="reporte-contador">Top {lista.length}</span>}
            </header>

            {lista.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                    <span className="ficha-icono mb-3 flex h-12 w-12 items-center justify-center rounded-full" aria-hidden="true">
                        <FaBookOpen />
                    </span>
                    <p className="font-title text-[16px] font-semibold text-[#1c1814]">Aún no hay ventas</p>
                    <p className="mt-1 text-[13px] text-[#766d62]">El ranking aparecerá con las primeras ventas pagadas.</p>
                </div>
            ) : (
                <>
                    <ol className="flex-1 space-y-1 px-3 py-4 sm:px-4">
                        {lista.map((libro, index) => {
                            const unidades = num(libro.cantidad_vendida);
                            const ancho = (unidades / maxUnidades) * 100;
                            return (
                                <li key={libro.id_libro} className="ranking-fila">
                                    <span className={`reporte-puesto ${index < 3 ? `reporte-puesto--${index + 1}` : ''}`} aria-label={`Puesto ${index + 1}`}>
                                        {index + 1}
                                    </span>
                                    <div className="h-11 w-8 shrink-0 overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgba(28,24,20,0.25)]">
                                        <PortadaLibro portada={libro.portada} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p className="truncate text-[14px] font-semibold text-[#1c1814]" title={libro.titulo}>{libro.titulo}</p>
                                            <p className="shrink-0 text-[13px] tabular-nums text-[#1c1814]">
                                                <span className="font-semibold">{unidades}</span>
                                                <span className="text-[#766d62]"> {unidades === 1 ? 'unidad' : 'unid.'}</span>
                                            </p>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <div className="ranking-pista" aria-hidden="true">
                                                <span className="ranking-barra reporte-barra-h" style={{ width: `${ancho}%`, '--barra-i': index }} />
                                            </div>
                                            <span className="w-[76px] shrink-0 text-right text-[12px] tabular-nums text-[#766d62]">
                                                {formatearMoneda(libro.total_generado)}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                    <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-[13px] sm:px-6">
                        <span className="text-[#766d62]">Top {lista.length}: {totalUnidades} unidades</span>
                        <span className="font-semibold tabular-nums text-[#1c1814]">{formatearMoneda(totalIngresos)}</span>
                    </footer>
                </>
            )}
        </section>
    );
}

export default TopBooks;
