import { FaBoxOpen, FaTriangleExclamation } from 'react-icons/fa6';

import { num } from './graficoUtils';

const plural = (n, uno, varios) => `${n} ${Number(n) === 1 ? uno : varios}`;

export default function StockBajo({ items = [] }) {
    const lista = Array.isArray(items) ? items : [];
    const sinStock = lista.filter((i) => num(i.stock) <= 0).length;

    return (
        <section className="grafico-card flex flex-col" aria-labelledby="titulo-stock-bajo">
            <header className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className={`${lista.length > 0 ? 'reporte-icono-peligro' : 'ficha-icono'} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}
                        aria-hidden="true"
                    >
                        <FaTriangleExclamation />
                    </span>
                    <div className="min-w-0">
                        <h2 id="titulo-stock-bajo" className="font-title text-[18px] font-semibold leading-snug text-[#1c1814]">
                            Libros con stock bajo
                        </h2>
                        <p className="mt-0.5 text-[13px] text-[#766d62]">Stock igual o menor al mínimo configurado</p>
                    </div>
                </div>
                <span className={`reporte-contador ${lista.length > 0 ? 'reporte-contador--peligro' : ''}`}>{lista.length}</span>
            </header>

            {lista.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                    <span className="ficha-icono mb-3 flex h-12 w-12 items-center justify-center rounded-full" aria-hidden="true">
                        <FaBoxOpen />
                    </span>
                    <p className="font-title text-[16px] font-semibold text-[#1c1814]">Inventario en orden</p>
                    <p className="mt-1 text-[13px] text-[#766d62]">Todos los libros están sobre su stock mínimo.</p>
                </div>
            ) : (
                <>
                    <ul className="flex-1 space-y-1 px-3 py-4 sm:px-4">
                        {lista.map((item) => {
                            const stock = num(item.stock);
                            const minimo = num(item.stock_minimo);
                            const agotado = stock <= 0;
                            const porcentaje = minimo > 0 ? Math.min(100, (stock / minimo) * 100) : 0;
                            return (
                                <li key={item.id_inventario} className="ranking-fila">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p className="truncate text-[14px] font-semibold text-[#1c1814]" title={item.titulo}>{item.titulo}</p>
                                            <span className={`estado-pildora shrink-0 ${agotado ? 'estado--peligro' : 'estado--aviso'}`}>
                                                {agotado ? 'Sin stock' : `${stock} de ${minimo}`}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <div
                                                className="ranking-pista"
                                                role="meter"
                                                aria-valuemin={0}
                                                aria-valuemax={minimo}
                                                aria-valuenow={stock}
                                                aria-label={`Stock de ${item.titulo}: ${stock} de un mínimo de ${minimo}`}
                                            >
                                                <span
                                                    className={`ranking-barra reporte-barra-h stock-barra ${agotado ? 'estado--peligro' : 'estado--aviso'}`}
                                                    style={{ width: `${Math.max(porcentaje, agotado ? 0 : 4)}%` }}
                                                />
                                            </div>
                                            <span className="w-[110px] shrink-0 truncate text-right text-[12px] text-[#766d62]" title={item.ubicacion || 'Sin ubicación'}>
                                                {item.ubicacion || 'Sin ubicación'}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-[13px] sm:px-6">
                        <span className="text-[#766d62]">{plural(sinStock, 'libro agotado', 'libros agotados')}</span>
                        <span className="text-[#766d62]">{plural(lista.length - sinStock, 'bajo mínimo', 'bajo mínimo')}</span>
                    </footer>
                </>
            )}
        </section>
    );
}
