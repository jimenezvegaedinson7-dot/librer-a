import { FaChartColumn } from 'react-icons/fa6';

function SalesChart({ ventasPorMes = [] }) {
    const datos = Array.isArray(ventasPorMes) ? ventasPorMes : [];

    const totalPeriodo = datos.reduce(
        (acc, item) => acc + Number(item.total_vendido || 0),
        0
    );

    const mayorMonto = datos.reduce(
        (mayor, item) => Math.max(mayor, Number(item.total_vendido || 0)),
        0
    );

    const mejorMes = datos.reduce((mejor, item) => {
        if (
            !mejor ||
            Number(item.total_vendido || 0) >
                Number(mejor.total_vendido || 0)
        ) {
            return item;
        }

        return mejor;
    }, null);

    const obtenerAltura = (monto) => {
        if (mayorMonto <= 0) return 0;
        return Math.max(6, (Number(monto) / mayorMonto) * 100);
    };

    return (
        <section
            className="
                overflow-hidden
                rounded-[8px]
                border border-[#e7eaf3]
                bg-white
                shadow-[0_2px_8px_rgba(30,64,175,0.06)]
            "
        >

            {/* CABECERA */}
            <div className="flex items-start justify-between px-6 pt-6">
                <div>
                    <div className="flex items-center gap-2">
                        <FaChartColumn className="text-[16px] text-[#0877e8]" />

                        <h3
                            className="
                                text-[16px]
                                font-semibold
                                tracking-[-0.01em]
                                text-[#0f172a]
                            "
                        >
                            Ventas por mes
                        </h3>
                    </div>

                    <p className="mt-1.5 text-[12px] font-normal text-[#94a3b8]">
                        Ingresos de ventas pagadas por cada mes.
                    </p>
                </div>

                <button
                    type="button"
                    className="
                        flex h-9 w-9
                        items-center justify-center
                        rounded-full
                        border border-[#edf0f6]
                        bg-white
                        text-[18px]
                        font-bold
                        text-[#0f172a]
                        transition
                        hover:bg-[#f5f7fb]
                    "
                >
                    ···
                </button>
            </div>

            {/* RESUMEN */}
            <div className="flex flex-wrap items-end gap-x-14 gap-y-5 px-9 pt-8">

                {/* Total periodo */}
                <div>
                    <p
                        className="
                            text-[26px]
                            font-semibold
                            leading-none
                            tracking-[-0.02em]
                            text-[#0f172a]
                        "
                    >
                        S/ {totalPeriodo.toFixed(2)}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#0877e8]" />

                        <span className="text-[12px] font-medium text-[#94a3b8]">
                            Total vendido
                        </span>
                    </div>
                </div>

                {/* mejor mes */}
                <div>
                    <p
                        className="
                            text-[26px]
                            font-semibold
                            leading-none
                            tracking-[-0.02em]
                            text-[#0f172a]
                        "
                    >
                        {mejorMes
                            ? `${mejorMes.mes} ${mejorMes.anio}`
                            : '—'}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#f43f5e]" />

                        <span className="text-[12px] font-medium text-[#94a3b8]">
                            Mejor mes
                        </span>
                    </div>
                </div>

                {/* meses registrados */}
                <div>
                    <p
                        className="
                            text-[26px]
                            font-semibold
                            leading-none
                            tracking-[-0.02em]
                            text-[#0f172a]
                        "
                    >
                        {datos.length}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />

                        <span className="text-[12px] font-medium text-[#94a3b8]">
                            {datos.length === 1 ? 'Mes' : 'Meses'}
                        </span>
                    </div>
                </div>
            </div>

            {/* GRÁFICO */}
            <div className="px-6 pb-6 pt-8">

                {datos.length === 0 ? (
                    <div
                        className="
                            flex h-[270px]
                            items-center justify-center
                            border-t border-[#edf0f6]
                            text-center
                        "
                    >
                        <div>
                            <div
                                className="
                                    mx-auto mb-3
                                    flex h-11 w-11
                                    items-center justify-center
                                    rounded-full
                                    bg-[#edf5ff]
                                    text-[#0877e8]
                                "
                            >
                                <FaChartColumn />
                            </div>

                            <p className="text-[14px] font-semibold text-[#0f172a]">
                                No hay ventas pagadas
                            </p>

                            <p className="mt-1 text-[12px] text-[#94a3b8]">
                                Cuando se registren ventas, aparecerán aquí.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="relative h-[280px]">

                        {/* líneas horizontales estilo Valex */}
                        <div className="absolute inset-x-10 top-0 border-t border-[#e7eaf1]" />
                        <div className="absolute inset-x-10 top-1/4 border-t border-[#e7eaf1]" />
                        <div className="absolute inset-x-10 top-2/4 border-t border-[#e7eaf1]" />
                        <div className="absolute inset-x-10 top-3/4 border-t border-[#e7eaf1]" />
                        <div className="absolute inset-x-10 bottom-8 border-t border-[#e7eaf1]" />

                        {/* números eje Y decorativos */}
                        <div className="absolute bottom-8 left-0 top-0 flex w-9 flex-col justify-between pb-0 text-right">
                            <span className="text-[10px] font-medium text-[#94a3b8]">
                                {mayorMonto.toFixed(0)}
                            </span>

                            <span className="text-[10px] font-medium text-[#94a3b8]">
                                {(mayorMonto * 0.75).toFixed(0)}
                            </span>

                            <span className="text-[10px] font-medium text-[#94a3b8]">
                                {(mayorMonto * 0.5).toFixed(0)}
                            </span>

                            <span className="text-[10px] font-medium text-[#94a3b8]">
                                {(mayorMonto * 0.25).toFixed(0)}
                            </span>

                            <span className="text-[10px] font-medium text-[#94a3b8]">
                                0
                            </span>
                        </div>

                        {/* BARRAS */}
                        <div
                            className="
                                absolute
                                bottom-8 left-11 right-3 top-0
                                flex items-end
                                justify-around
                                gap-3
                            "
                        >
                            {datos.map((item, index) => {
                                const monto = Number(
                                    item.total_vendido || 0
                                );

                                const esUltimo =
                                    index === datos.length - 1;

                                return (
                                    <div
                                        key={`${item.anio}-${item.mes_numero}`}
                                        className="
                                            group relative
                                            flex h-full flex-1
                                            items-end justify-center
                                        "
                                    >

                                        {/* tooltip */}
                                        <div
                                            className="
                                                pointer-events-none
                                                absolute z-20
                                                mb-2
                                                -translate-y-full
                                                opacity-0
                                                transition-all
                                                duration-200
                                                group-hover:opacity-100
                                            "
                                            style={{
                                                bottom: `${obtenerAltura(
                                                    monto
                                                )}%`,
                                            }}
                                        >
                                            <div
                                                className="
                                                    whitespace-nowrap
                                                    rounded-[4px]
                                                    bg-[#0f172a]
                                                    px-3 py-1.5
                                                    text-[11px]
                                                    font-medium
                                                    text-white
                                                    shadow-lg
                                                "
                                            >
                                                S/ {monto.toFixed(2)}
                                            </div>

                                            <div
                                                className="
                                                    mx-auto
                                                    h-0 w-0
                                                    border-l-[4px]
                                                    border-r-[4px]
                                                    border-t-[4px]
                                                    border-l-transparent
                                                    border-r-transparent
                                                    border-t-[#0f172a]
                                                "
                                            />
                                        </div>

                                        {/* barra */}
                                        <div
                                            className={`
                                                w-full
                                                max-w-[12px]
                                                transition-all
                                                duration-500
                                                group-hover:opacity-80

                                                ${
                                                    esUltimo
                                                        ? 'bg-[#f43f5e]'
                                                        : 'bg-[#0877e8]'
                                                }
                                            `}
                                            style={{
                                                height: `${obtenerAltura(
                                                    monto
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* MESES */}
                        <div
                            className="
                                absolute
                                bottom-0 left-11 right-3
                                flex justify-around
                            "
                        >
                            {datos.map((item) => (
                                <div
                                    key={`mes-${item.anio}-${item.mes_numero}`}
                                    className="min-w-0 flex-1 text-center"
                                >
                                    <p
                                        className="
                                            truncate
                                            text-[11px]
                                            font-medium
                                            text-[#94a3b8]
                                        "
                                    >
                                        {item.mes}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default SalesChart;
