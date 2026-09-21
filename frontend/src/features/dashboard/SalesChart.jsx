import { FaChartColumn } from 'react-icons/fa6';

function SalesChart({ ventasPorMes = [] }) {
    const datos = Array.isArray(ventasPorMes) ? ventasPorMes : [];

    const totalPeriodo = datos.reduce(
        (acc, item) => acc + Number(item.total_vendido || 0), 0
    );

    const mayorMonto = datos.reduce(
        (mayor, item) => Math.max(mayor, Number(item.total_vendido || 0)), 0
    );

    const mejorMes = datos.reduce((mejor, item) => {
        if (!mejor || Number(item.total_vendido || 0) > Number(mejor.total_vendido || 0)) {
            return item;
        }
        return mejor;
    }, null);

    const obtenerAltura = (monto) => {
        if (mayorMonto <= 0) return 0;
        return Math.max(6, (Number(monto) / mayorMonto) * 100);
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-primary-200/60 bg-white shadow-sm">

            {/* cabecera */}
            <div className="flex items-center justify-between border-b border-primary-100 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mahogany-50 text-mahogany-600">
                        <FaChartColumn />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-mahogany-800">Ventas por mes</h3>
                        <p className="text-[11px] text-primary-400">Ingresos de ventas pagadas</p>
                    </div>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-[10px] font-medium text-primary-500">
                    {datos.length} {datos.length === 1 ? 'mes' : 'meses'}
                </span>
            </div>

            {/* resumen */}
            <div className="grid grid-cols-2 divide-x divide-primary-100 border-b border-primary-100">
                <div className="px-5 py-3.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-primary-400">Total período</p>
                    <p className="mt-1 text-lg font-bold text-mahogany-800">S/ {totalPeriodo.toFixed(2)}</p>
                </div>
                <div className="px-5 py-3.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-primary-400">Mejor mes</p>
                    <p className="mt-1 text-lg font-bold text-mahogany-800">
                        {mejorMes ? `${mejorMes.mes} ${mejorMes.anio}` : '—'}
                    </p>
                </div>
            </div>

            {/* gráfico */}
            <div className="p-5">
                {datos.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-center">
                        <div>
                            <p className="text-sm font-semibold text-mahogany-700">No hay ventas pagadas</p>
                            <p className="mt-1 text-xs text-primary-400">Cuando se registren ventas, aparecerán aquí.</p>
                        </div>
                    </div>
                ) : (
                    <div className="relative h-52">
                        {/* líneas guía */}
                        <div className="absolute inset-x-0 top-0 h-px bg-primary-100" />
                        <div className="absolute inset-x-0 top-1/3 h-px bg-primary-100" />
                        <div className="absolute inset-x-0 top-2/3 h-px bg-primary-100" />
                        <div className="absolute inset-x-0 bottom-7 h-px bg-primary-100" />

                        {/* barras */}
                        <div className="absolute inset-x-0 bottom-7 top-0 flex items-end justify-around gap-1.5 px-1">
                            {datos.map((item, index) => {
                                const monto = Number(item.total_vendido || 0);
                                const esUltimo = index === datos.length - 1;

                                return (
                                    <div
                                        key={`${item.anio}-${item.mes_numero}`}
                                        className="group flex h-full flex-1 flex-col items-center justify-end"
                                    >
                                        <div className="mb-1.5 opacity-0 transition duration-200 group-hover:opacity-100">
                                            <span className="whitespace-nowrap rounded-lg bg-mahogany-800 px-2.5 py-1 text-[9px] font-semibold text-white shadow-lg">
                                                S/ {monto.toFixed(2)}
                                            </span>
                                        </div>
                                        <div
                                            className={`w-full max-w-8 rounded-t-md transition-all duration-500 ${
                                                esUltimo
                                                    ? 'bg-gradient-to-t from-mahogany-600 to-mahogany-500 shadow-sm shadow-mahogany-200'
                                                    : 'bg-gradient-to-t from-primary-300 to-primary-200 hover:from-primary-400 hover:to-primary-300'
                                            }`}
                                            style={{ height: `${obtenerAltura(monto)}%` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* meses */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-around px-1">
                            {datos.map((item) => (
                                <div key={`mes-${item.anio}-${item.mes_numero}`} className="text-center">
                                    <p className="text-[10px] font-semibold text-primary-500">{item.mes}</p>
                                    <p className="text-[9px] text-primary-300">{item.anio}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* leyenda */}
                <div className="mt-4 flex items-center justify-between border-t border-primary-100 pt-3">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-mahogany-500" />
                        <span className="text-[10px] text-primary-400">Total vendido por mes</span>
                    </div>
                    {datos.length > 0 && (
                        <span className="text-[10px] font-medium text-primary-300">Solo ventas pagadas</span>
                    )}
                </div>
            </div>
        </section>
    );
}

export default SalesChart;
