import {
    FaChartColumn
} from 'react-icons/fa6';

function SalesChart({
    ventasPorMes = []
}) {
    const datos =
        Array.isArray(
            ventasPorMes
        )
            ? ventasPorMes
            : [];

    const totalPeriodo =
        datos.reduce(
            (
                acumulado,
                item
            ) =>
                acumulado +
                Number(
                    item.total_vendido || 0
                ),
            0
        );

    const mayorMonto =
        datos.reduce(
            (
                mayor,
                item
            ) =>
                Math.max(
                    mayor,
                    Number(
                        item.total_vendido || 0
                    )
                ),
            0
        );

    const mejorMes =
        datos.reduce(
            (
                mejor,
                item
            ) => {
                if (
                    !mejor ||
                    Number(
                        item.total_vendido || 0
                    ) >
                    Number(
                        mejor.total_vendido || 0
                    )
                ) {
                    return item;
                }

                return mejor;
            },
            null
        );

    const obtenerAltura = (
        monto
    ) => {
        if (
            mayorMonto <= 0
        ) {
            return 0;
        }

        const porcentaje =
            (
                Number(monto) /
                mayorMonto
            ) * 100;

        return Math.max(
            8,
            porcentaje
        );
    };

    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">

            {/* ========================================
                CABECERA
            ======================================== */}
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-2.5">

                    <div className="flex h-8 w-8 items-center justify-center text-sm text-primary-700">
                        <FaChartColumn />
                    </div>

                    <div>

                        <h3 className="text-sm font-semibold text-slate-900">
                            Ventas por mes
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-600">
                            Ingresos reales de ventas pagadas
                        </p>

                    </div>

                </div>

                <span className="w-fit text-xs text-slate-500">
                    {datos.length}{' '}
                    {datos.length === 1
                        ? 'mes'
                        : 'meses'}
                </span>

            </div>

            {/* ========================================
                RESUMEN
            ======================================== */}
            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 px-4 py-3">

                <div className="px-3 py-2">

                    <p className="text-xs font-medium text-slate-500">
                        Total período
                    </p>

                    <p className="mt-1 text-base font-semibold text-slate-800">
                        S/ {totalPeriodo.toFixed(2)}
                    </p>

                </div>

                <div className="border-l border-slate-200 px-3 py-2">

                    <p className="text-xs font-medium text-slate-500">
                        Mejor mes
                    </p>

                    <p className="mt-1 text-base font-semibold text-slate-800">
                        {mejorMes
                            ? `${mejorMes.mes} ${mejorMes.anio}`
                            : 'Sin datos'}
                    </p>

                </div>

            </div>

            {/* ========================================
                GRÁFICO
            ======================================== */}
            <div className="p-4">

                {datos.length === 0 ? (

                    <div className="flex h-48 items-center justify-center text-center">

                        <div>

                            <p className="text-sm font-semibold text-slate-700">
                                No hay ventas pagadas
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                                Cuando se registren ventas, aparecerán aquí.
                            </p>

                        </div>

                    </div>

                ) : (

                    <div className="relative h-52">

                        {/* LÍNEAS */}
                        <div className="absolute inset-x-0 top-0 h-px bg-slate-200" />
                        <div className="absolute inset-x-0 top-1/3 h-px bg-slate-200" />
                        <div className="absolute inset-x-0 top-2/3 h-px bg-slate-200" />
                        <div className="absolute inset-x-0 bottom-7 h-px bg-slate-300" />

                        {/* BARRAS */}
                        <div className="absolute inset-x-0 bottom-7 top-0 flex items-end justify-around gap-2 px-2">

                            {datos.map(
                                (
                                    item,
                                    index
                                ) => {

                                    const monto =
                                        Number(
                                            item.total_vendido || 0
                                        );

                                    return (
                                        <div
                                            key={`${item.anio}-${item.mes_numero}`}
                                            className="group flex h-full flex-1 flex-col items-center justify-end"
                                        >

                                            <div className="mb-1 opacity-0 transition duration-200 group-hover:opacity-100">

                                                <span className="whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[9px] font-semibold text-white shadow-sm">
                                                    S/ {monto.toFixed(2)}
                                                </span>

                                            </div>

                                            <div
                                                className={`w-full max-w-7 rounded-t-sm ${
                                                    index ===
                                                    datos.length - 1
                                                        ? 'bg-emerald-600'
                                                        : 'bg-emerald-400'
                                                }`}
                                                style={{
                                                    height:
                                                        `${obtenerAltura(
                                                            monto
                                                        )}%`
                                                }}
                                            />

                                        </div>
                                    );
                                }
                            )}

                        </div>

                        {/* MESES */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-around px-2">

                            {datos.map(
                                (
                                    item
                                ) => (
                                    <div
                                        key={`mes-${item.anio}-${item.mes_numero}`}
                                        className="text-center"
                                    >

                                        <p className="text-[10px] font-semibold text-slate-600">
                                            {item.mes}
                                        </p>

                                        <p className="text-[9px] text-slate-500">
                                            {item.anio}
                                        </p>

                                    </div>
                                )
                            )}

                        </div>

                    </div>

                )}

                {/* ========================================
                    LEYENDA
                ======================================== */}
                <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-2">

                        <span className="h-2 w-2 rounded-full bg-emerald-500" />

                        <span className="text-[11px] text-slate-600">
                            Total vendido por mes
                        </span>

                    </div>

                    {datos.length > 0 && (
                        <span className="text-[11px] font-medium text-slate-500">
                            Solo ventas pagadas
                        </span>
                    )}

                </div>

            </div>

        </section>
    );
}

export default SalesChart;
