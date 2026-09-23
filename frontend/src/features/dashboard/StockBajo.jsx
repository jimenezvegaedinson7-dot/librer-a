import { motion } from 'motion/react';
import { FaBoxOpen, FaLocationDot, FaTriangleExclamation } from 'react-icons/fa6';

import { Destello } from './Decoraciones';
import { num } from './graficoUtils';

const plural = (n, uno, varios) => `${n} ${Number(n) === 1 ? uno : varios}`;

export default function StockBajo({ items = [] }) {
    const lista = Array.isArray(items) ? items : [];
    const sinStock = lista.filter((i) => num(i.stock) <= 0).length;
    // Rojo solo si hay libros agotados; ámbar si solo están bajo el mínimo.
    const severidad = sinStock > 0 ? 'estado--peligro' : lista.length > 0 ? 'estado--aviso' : '';

    return (
        <motion.section
            className="grafico-card panel-analitico flex h-full flex-col"
            aria-labelledby="titulo-stock-bajo"
            initial="visible"
            animate="visible"
            whileHover="hover"
        >
            <header className="panel-cabecera">
                <div className="flex min-w-0 items-center gap-3">
                    <span className={`panel-icono ${severidad ? `panel-icono--estado ${severidad}` : ''}`} aria-hidden="true">
                        <FaTriangleExclamation />
                    </span>
                    <div className="min-w-0">
                        <h2 id="titulo-stock-bajo" className="panel-titulo">Libros con stock bajo</h2>
                        <p className="panel-subtitulo">Stock igual o menor al mínimo configurado</p>
                    </div>
                </div>
                <div className="panel-total">
                    <p className="panel-total-cifra">{lista.length}</p>
                    <p className="panel-total-unidad">{Number(lista.length) === 1 ? 'libro' : 'libros'}</p>
                </div>
            </header>

            {lista.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                    <span className="panel-icono mb-3 !h-12 !w-12 !rounded-full" aria-hidden="true">
                        <FaBoxOpen />
                    </span>
                    <p className="font-title text-[16px] font-semibold text-[#1c1814]">Inventario en orden</p>
                    <p className="mt-1 text-[13px] text-[#766d62]">Todos los libros están sobre su stock mínimo.</p>
                </div>
            ) : (
                <>
                    <ul className="panel-cuerpo stock-lista flex-1">
                        {lista.map((item) => {
                            const stock = num(item.stock);
                            const minimo = num(item.stock_minimo);
                            const agotado = stock <= 0;
                            const porcentaje = minimo > 0 ? Math.min(100, (stock / minimo) * 100) : 0;
                            const clase = agotado ? 'estado--peligro' : 'estado--aviso';
                            return (
                                <li key={item.id_inventario} className={`stock-fila ${clase}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="stock-titulo" title={item.titulo}>{item.titulo}</p>
                                        <span className={`estado-pildora shrink-0 ${clase}`}>{agotado ? 'Sin stock' : 'Stock bajo'}</span>
                                    </div>

                                    <div className="stock-detalle">
                                        <dl className="stock-cifras">
                                            <div>
                                                <dt>Actual</dt>
                                                <dd className="stock-cifra-actual">{stock}</dd>
                                            </div>
                                            <div>
                                                <dt>Mínimo</dt>
                                                <dd>{minimo}</dd>
                                            </div>
                                        </dl>
                                        <div
                                            className="stock-pista"
                                            role="meter"
                                            aria-valuemin={0}
                                            aria-valuemax={minimo}
                                            aria-valuenow={stock}
                                            aria-label={`Stock de ${item.titulo}: ${stock} de un mínimo de ${minimo}`}
                                        >
                                            <span
                                                className="stock-nivel reporte-barra-h"
                                                style={{ width: `${Math.max(porcentaje, agotado ? 0 : 4)}%` }}
                                            />
                                            <Destello />
                                        </div>
                                    </div>

                                    <p className="stock-ubicacion" title={item.ubicacion || 'Sin ubicación'}>
                                        <FaLocationDot aria-hidden="true" />
                                        <span className="truncate">{item.ubicacion || 'Sin ubicación'}</span>
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                    <footer className="panel-pie">
                        <span className="panel-pie-dato estado--peligro">{plural(sinStock, 'libro agotado', 'libros agotados')}</span>
                        <span className="panel-pie-dato estado--aviso">{plural(lista.length - sinStock, 'bajo mínimo', 'bajo mínimo')}</span>
                    </footer>
                </>
            )}
        </motion.section>
    );
}
