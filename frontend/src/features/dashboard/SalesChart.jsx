import { useMemo, useState } from 'react';

import { FaChartColumn, FaTable } from 'react-icons/fa6';

import { formatearMoneda } from '../../lib/utils/format';
import { formatoEje, marcasEje, serieDiaria, serieMensual } from './graficoUtils';

const METRICAS = {
    total: { texto: 'Ingresos', formato: formatearMoneda, eje: formatoEje },
    cantidad: {
        texto: 'N.º de ventas',
        formato: (v) => {
            const n = Math.round(v * 10) / 10;
            return `${n.toLocaleString('es-PE')} ${n === 1 ? 'venta' : 'ventas'}`;
        },
        eje: (v) => String(v),
    },
};

const plural = (n) => `${n} ${n === 1 ? 'venta' : 'ventas'}`;

function Estadistica({ etiqueta, valor, detalle }) {
    return (
        <div className="grafico-stat">
            <p className="grafico-stat-etiqueta">{etiqueta}</p>
            <p className="grafico-stat-valor">{valor}</p>
            {detalle && <p className="grafico-stat-detalle">{detalle}</p>}
        </div>
    );
}

function SalesChart({
    ventasPorMes = [],
    ventasPorDia = [],
    dias = 14,
    meses = 6,
    titulo = 'Ingresos por ventas',
    idBase = 'ingresos',
    conMetrica = false,
}) {
    const [periodo, setPeriodo] = useState('dia');
    const [metrica, setMetrica] = useState('total');
    const [verTabla, setVerTabla] = useState(false);
    const [activo, setActivo] = useState(null);

    const periodos = [
        { id: 'dia', texto: `${dias} días`, unidad: 'día', actual: 'Hoy', resto: 'Días anteriores' },
        { id: 'mes', texto: `${meses} meses`, unidad: 'mes', actual: 'Mes actual', resto: 'Meses anteriores' },
    ];

    const serie = useMemo(
        () => (periodo === 'dia' ? serieDiaria(ventasPorDia, dias) : serieMensual(ventasPorMes, meses)),
        [periodo, ventasPorDia, ventasPorMes, dias, meses],
    );

    const config = periodos.find((p) => p.id === periodo);
    const m = METRICAS[metrica];
    const valorDe = (d) => d[metrica];

    const total = serie.reduce((acc, d) => acc + d.total, 0);
    const ventas = serie.reduce((acc, d) => acc + d.cantidad, 0);
    const suma = serie.reduce((acc, d) => acc + valorDe(d), 0);
    const conVentas = serie.filter((d) => d.cantidad > 0).length;
    const promedio = suma / serie.length;
    const mejor = serie.reduce((best, d) => (valorDe(d) > (best ? valorDe(best) : 0) ? d : best), null);
    const { tope, marcas } = marcasEje(mejor ? valorDe(mejor) : 0);
    const alto = (v) => (tope > 0 ? (v / tope) * 100 : 0);

    // Con muchas columnas se rotula una de cada N (siempre la actual).
    const pasoEscritorio = serie.length > 20 ? 3 : 1;
    const pasoMovil = serie.length > 20 ? 5 : 2;

    const cambiarPeriodo = (id) => { setPeriodo(id); setActivo(null); };

    return (
        <section className="grafico-card flex h-full flex-col" aria-labelledby={`titulo-${idBase}`}>
            <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="ficha-icono flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" aria-hidden="true">
                        <FaChartColumn />
                    </span>
                    <div className="min-w-0">
                        <h2 id={`titulo-${idBase}`} className="font-title text-[18px] font-semibold leading-snug text-[#1c1814]">
                            {titulo}
                        </h2>
                        <p className="mt-0.5 text-[13px] text-[#766d62]">
                            {metrica === 'total' ? 'Ingresos cobrados (ventas pagadas y entregadas)' : 'Ventas cobradas'} por {config.unidad}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {conMetrica && (
                        <div className="segmentado" role="group" aria-label="Métrica">
                            {Object.entries(METRICAS).map(([id, info]) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={metrica === id}
                                    onClick={() => { setMetrica(id); setActivo(null); }}
                                    className={`segmentado-opcion ${metrica === id ? 'segmentado-opcion--activa' : ''}`}
                                >
                                    {info.texto}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="segmentado" role="group" aria-label="Periodo">
                        {periodos.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                aria-pressed={periodo === p.id}
                                onClick={() => cambiarPeriodo(p.id)}
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
                <Estadistica
                    etiqueta={metrica === 'total' ? 'Total vendido' : 'Total de ventas'}
                    valor={metrica === 'total' ? formatearMoneda(total) : ventas}
                    detalle={metrica === 'total' ? plural(ventas) : formatearMoneda(total)}
                />
                <Estadistica etiqueta={`Promedio por ${config.unidad}`} valor={m.formato(promedio)} detalle={`${conVentas} de ${serie.length} con ventas`} />
                <Estadistica
                    etiqueta={`Mejor ${config.unidad}`}
                    valor={mejor ? m.formato(valorDe(mejor)) : '—'}
                    detalle={mejor ? mejor.etiquetaLarga : 'Sin ventas en el periodo'}
                />
                <Estadistica
                    etiqueta="Ticket promedio"
                    valor={ventas > 0 ? formatearMoneda(total / ventas) : '—'}
                    detalle="por venta pagada"
                />
            </div>

            {verTabla ? (
                <div className="tabla-reporte max-h-[360px] overflow-auto">
                    <table className="min-w-full">
                        <caption className="sr-only">Ventas cobradas por {config.unidad}</caption>
                        <thead className="sticky top-0">
                            <tr>
                                <th scope="col" className="text-left">{config.unidad === 'día' ? 'Día' : 'Mes'}</th>
                                <th scope="col" className="text-center">Ventas</th>
                                <th scope="col" className="text-right">Ingresos</th>
                                <th scope="col" className="text-right">Ticket</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...serie].reverse().map((d) => (
                                <tr key={d.clave}>
                                    <td>{d.etiquetaLarga}</td>
                                    <td className="text-center">{d.cantidad}</td>
                                    <td className="text-right font-semibold">{formatearMoneda(d.total)}</td>
                                    <td className="text-right">{d.cantidad > 0 ? formatearMoneda(d.total / d.cantidad) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="px-5 pb-5 pt-6 sm:px-6">
                    {suma === 0 ? (
                        <div className="flex h-[240px] flex-col items-center justify-center text-center">
                            <p className="font-title text-[16px] font-semibold text-[#1c1814]">Sin ventas cobradas en este periodo</p>
                            <p className="mt-1 text-[13px] text-[#766d62]">
                                {periodo === 'dia' ? `Prueba con el periodo de ${meses} meses.` : 'Aún no hay ventas registradas.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grafico-area" onPointerLeave={() => setActivo(null)}>
                            <div className="grafico-eje-y" aria-hidden="true">
                                {marcas.map((marca) => (
                                    <span key={marca} style={{ bottom: `${alto(marca)}%` }}>{m.eje(marca)}</span>
                                ))}
                            </div>

                            <div className="grafico-plot">
                                {marcas.map((marca) => (
                                    <span key={marca} className="grafico-rejilla" style={{ bottom: `${alto(marca)}%` }} aria-hidden="true" />
                                ))}

                                {promedio > 0 && (
                                    <div className="grafico-promedio" style={{ bottom: `${alto(promedio)}%` }} aria-hidden="true">
                                        <span>Prom. {m.formato(promedio)}</span>
                                    </div>
                                )}

                                <ol className="grafico-columnas" aria-label={`${m.texto} por ${config.unidad}`}>
                                    {serie.map((d, i) => {
                                        const valor = valorDe(d);
                                        const esMejor = mejor && d.clave === mejor.clave;
                                        const conTooltip = activo === d.clave;
                                        const desdeFin = serie.length - 1 - i;
                                        const texto = `${d.etiquetaLarga}: ${formatearMoneda(d.total)}, ${plural(d.cantidad)}`;
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
                                                    {valor > 0 ? (
                                                        <span
                                                            className={`grafico-barra reporte-barra ${d.actual ? 'grafico-barra--actual' : ''} ${conTooltip ? 'grafico-barra--activa' : ''}`}
                                                            style={{ height: `${alto(valor)}%`, '--barra-i': Math.min(i, 16) }}
                                                        >
                                                            {esMejor && !conTooltip && (
                                                                <span className="grafico-etiqueta-max">{m.formato(valor)}</span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="grafico-barra-cero" />
                                                    )}
                                                    {conTooltip && (
                                                        <span
                                                            className={`grafico-tooltip ${i < 2 ? 'grafico-tooltip--inicio' : ''} ${desdeFin < 2 ? 'grafico-tooltip--fin' : ''}`}
                                                            style={{ bottom: `calc(${alto(valor)}% + 10px)` }}
                                                        >
                                                            <strong>{metrica === 'total' ? formatearMoneda(d.total) : plural(d.cantidad)}</strong>
                                                            <span>{metrica === 'total' ? plural(d.cantidad) : formatearMoneda(d.total)}</span>
                                                            <span>{d.etiquetaLarga}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className={`grafico-eje-x ${d.actual ? 'grafico-eje-x--actual' : ''} ${
                                                        !d.actual && desdeFin % pasoEscritorio !== 0 ? 'grafico-eje-x--oculta' : ''
                                                    } ${!d.actual && desdeFin % pasoMovil !== 0 ? 'grafico-eje-x--alterna' : ''}`}
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
