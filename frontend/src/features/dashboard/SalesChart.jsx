import { useMemo, useState } from 'react';

import { FaChartColumn, FaTable } from 'react-icons/fa6';

import { formatearMoneda } from '../../lib/utils/format';
import { formatoEje, marcasEje, serieDiaria, serieMensual } from './graficoUtils';

const PERIODOS = [
    { id: 'dia', texto: '14 días', unidad: 'día', actual: 'Hoy', resto: 'Días anteriores' },
    { id: 'mes', texto: '6 meses', unidad: 'mes', actual: 'Mes actual', resto: 'Meses anteriores' },
];

function Estadistica({ etiqueta, valor, detalle }) {
    return (
        <div className="grafico-stat">
            <p className="grafico-stat-etiqueta">{etiqueta}</p>
            <p className="grafico-stat-valor">{valor}</p>
            {detalle && <p className="grafico-stat-detalle">{detalle}</p>}
        </div>
    );
}

function SalesChart({ ventasPorMes = [], ventasPorDia = [] }) {
    const [periodo, setPeriodo] = useState('dia');
    const [verTabla, setVerTabla] = useState(false);
    const [activo, setActivo] = useState(null);

    const serie = useMemo(
        () => (periodo === 'dia' ? serieDiaria(ventasPorDia, 14) : serieMensual(ventasPorMes, 6)),
        [periodo, ventasPorDia, ventasPorMes],
    );

    const config = PERIODOS.find((p) => p.id === periodo);
    const total = serie.reduce((acc, d) => acc + d.total, 0);
    const ventas = serie.reduce((acc, d) => acc + d.cantidad, 0);
    const conVentas = serie.filter((d) => d.cantidad > 0).length;
    const promedio = total / serie.length;
    const mejor = serie.reduce((m, d) => (d.total > (m?.total ?? 0) ? d : m), null);
    const { tope, marcas } = marcasEje(mejor?.total ?? 0);
    const alto = (v) => (tope > 0 ? (v / tope) * 100 : 0);

    return (
        <section className="grafico-card" aria-labelledby="titulo-ingresos">
            <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="ficha-icono flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" aria-hidden="true">
                        <FaChartColumn />
                    </span>
                    <div className="min-w-0">
                        <h2 id="titulo-ingresos" className="font-title text-[18px] font-semibold leading-snug text-[#1c1814]">
                            Ingresos por ventas
                        </h2>
                        <p className="mt-0.5 text-[13px] text-[#766d62]">Ventas pagadas por {config.unidad}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="segmentado" role="group" aria-label="Periodo">
                        {PERIODOS.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                aria-pressed={periodo === p.id}
                                onClick={() => { setPeriodo(p.id); setActivo(null); }}
                                className={`segmentado-opcion ${periodo === p.id ? 'segmentado-opcion--activa' : ''}`}
                            >
                                {p.texto}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setVerTabla((v) => !v)}
                        aria-pressed={verTabla}
                        aria-label={verTabla ? 'Ver gráfico' : 'Ver tabla'}
                        title={verTabla ? 'Ver gráfico' : 'Ver tabla'}
                        className={`grafico-boton ${verTabla ? 'grafico-boton--activo' : ''}`}
                    >
                        {verTabla ? <FaChartColumn /> : <FaTable />}
                    </button>
                </div>
            </header>

            <div className="grafico-stats mt-5 grid grid-cols-2 lg:grid-cols-4">
                <Estadistica etiqueta="Total vendido" valor={formatearMoneda(total)} detalle={`${ventas} ${ventas === 1 ? 'venta' : 'ventas'}`} />
                <Estadistica etiqueta={`Promedio por ${config.unidad}`} valor={formatearMoneda(promedio)} detalle={`${conVentas} de ${serie.length} con ventas`} />
                <Estadistica
                    etiqueta={`Mejor ${config.unidad}`}
                    valor={mejor ? formatearMoneda(mejor.total) : '—'}
                    detalle={mejor ? mejor.etiquetaLarga : 'Sin ventas en el periodo'}
                />
                <Estadistica
                    etiqueta="Ticket promedio"
                    valor={ventas > 0 ? formatearMoneda(total / ventas) : '—'}
                    detalle="por venta pagada"
                />
            </div>

            {verTabla ? (
                <div className="tabla-reporte max-h-[330px] overflow-auto">
                    <table className="min-w-full">
                        <caption className="sr-only">Ingresos por {config.unidad}</caption>
                        <thead className="sticky top-0">
                            <tr>
                                <th scope="col" className="text-left">{config.unidad === 'día' ? 'Día' : 'Mes'}</th>
                                <th scope="col" className="text-center">Ventas</th>
                                <th scope="col" className="text-right">Ingresos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...serie].reverse().map((d) => (
                                <tr key={d.clave}>
                                    <td>{d.etiquetaLarga}</td>
                                    <td className="text-center">{d.cantidad}</td>
                                    <td className="text-right font-semibold">{formatearMoneda(d.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="px-5 pb-5 pt-6 sm:px-6">
                    {total === 0 ? (
                        <div className="flex h-[240px] flex-col items-center justify-center text-center">
                            <p className="font-title text-[16px] font-semibold text-[#1c1814]">Sin ventas pagadas en este periodo</p>
                            <p className="mt-1 text-[13px] text-[#766d62]">
                                {periodo === 'dia' ? 'Prueba con el periodo de 6 meses.' : 'Aún no hay ventas registradas.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grafico-area" onPointerLeave={() => setActivo(null)}>
                            <div className="grafico-eje-y" aria-hidden="true">
                                {marcas.map((m) => (
                                    <span key={m} style={{ bottom: `${alto(m)}%` }}>{formatoEje(m)}</span>
                                ))}
                            </div>

                            <div className="grafico-plot">
                                {marcas.map((m) => (
                                    <span key={m} className="grafico-rejilla" style={{ bottom: `${alto(m)}%` }} aria-hidden="true" />
                                ))}

                                {promedio > 0 && (
                                    <div className="grafico-promedio" style={{ bottom: `${alto(promedio)}%` }} aria-hidden="true">
                                        <span>Prom. {formatearMoneda(promedio)}</span>
                                    </div>
                                )}

                                <ol className="grafico-columnas" aria-label={`Ingresos por ${config.unidad}`}>
                                    {serie.map((d, i) => {
                                        const esMejor = mejor && d.clave === mejor.clave;
                                        const conTooltip = activo === d.clave;
                                        const texto = `${d.etiquetaLarga}: ${formatearMoneda(d.total)}, ${d.cantidad} ${d.cantidad === 1 ? 'venta' : 'ventas'}`;
                                        return (
                                            <li
                                                key={d.clave}
                                                className="grafico-columna"
                                                tabIndex={0}
                                                aria-label={texto}
                                                onPointerEnter={() => setActivo(d.clave)}
                                                onFocus={() => setActivo(d.clave)}
                                                onBlur={() => setActivo(null)}
                                            >
                                                <div className="grafico-columna-zona">
                                                    {d.total > 0 ? (
                                                        <span
                                                            className={`grafico-barra reporte-barra ${d.actual ? 'grafico-barra--actual' : ''} ${conTooltip ? 'grafico-barra--activa' : ''}`}
                                                            style={{ height: `${alto(d.total)}%`, '--barra-i': i }}
                                                        >
                                                            {esMejor && !conTooltip && (
                                                                <span className="grafico-etiqueta-max">{formatearMoneda(d.total)}</span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="grafico-barra-cero" />
                                                    )}
                                                    {conTooltip && (
                                                        <span
                                                            className={`grafico-tooltip ${i < 2 ? 'grafico-tooltip--inicio' : ''} ${i > serie.length - 3 ? 'grafico-tooltip--fin' : ''}`}
                                                            style={{ bottom: `calc(${alto(d.total)}% + 10px)` }}
                                                        >
                                                            <strong>{formatearMoneda(d.total)}</strong>
                                                            <span>{d.cantidad} {d.cantidad === 1 ? 'venta' : 'ventas'}</span>
                                                            <span>{d.etiquetaLarga}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className={`grafico-eje-x ${d.actual ? 'grafico-eje-x--actual' : ''} ${(serie.length - 1 - i) % 2 === 1 ? 'grafico-eje-x--alterna' : ''}`}
                                                    aria-hidden="true"
                                                >
                                                    {d.etiqueta}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        </div>
                    )}

                    <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-[#766d62]" aria-label="Leyenda">
                        <li className="flex items-center gap-2">
                            <span className="grafico-leyenda-marca grafico-leyenda-marca--actual" aria-hidden="true" />
                            {config.actual}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="grafico-leyenda-marca" aria-hidden="true" />
                            {config.resto}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="grafico-leyenda-linea" aria-hidden="true" />
                            Promedio del periodo
                        </li>
                    </ul>
                </div>
            )}
        </section>
    );
}

export default SalesChart;
