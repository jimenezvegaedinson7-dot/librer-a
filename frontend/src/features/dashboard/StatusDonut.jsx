function StatusDonut({
    titulo,
    subtitulo,
    datos = [],
    tipo = 'ventas'
}) {
    const lista =
        Array.isArray(datos)
            ? datos
            : [];

    const total =
        lista.reduce(
            (acumulado, item) =>
                acumulado +
                Number(item.cantidad || 0),
            0
        );

    const obtenerColor = (estado) => {
        const coloresVentas = {
            pagada: '#10b981',
            pendiente: '#f59e0b',
            cancelada: '#ef4444'
        };

        const coloresReservas = {
            completada: '#10b981',
            confirmada: '#38bdf8',
            pendiente: '#f59e0b',
            cancelada: '#ef4444'
        };

        const colores =
            tipo === 'reservas'
                ? coloresReservas
                : coloresVentas;

        return (
            colores[
                String(estado).toLowerCase()
            ] || '#94a3b8'
        );
    };

    const segmentos = [];

    let acumulado = 0;

    lista.forEach((item) => {
        const cantidad =
            Number(item.cantidad || 0);

        const porcentaje =
            total > 0
                ? (cantidad / total) * 100
                : 0;

        const inicio = acumulado;
        const fin = acumulado + porcentaje;

        segmentos.push(
            `${obtenerColor(
                item.estado
            )} ${inicio}% ${fin}%`
        );

        acumulado = fin;
    });

    const fondo =
        total > 0
            ? `conic-gradient(${segmentos.join(', ')})`
            : 'conic-gradient(#e2e8f0 0% 100%)';

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4">

            <div className="mb-3">

                <h3 className="text-sm font-semibold text-slate-900">
                    {titulo}
                </h3>

                <p className="mt-0.5 text-xs text-slate-600">
                    {subtitulo}
                </p>

            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row">

                {/* CÍRCULO */}
                <div
                    className="relative h-32 w-32 shrink-0 rounded-full"
                    style={{
                        background: fondo
                    }}
                >

                    <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white">

                        <span className="text-xl font-bold text-slate-900">
                            {total}
                        </span>

                        <span className="text-[10px] font-medium text-slate-500">
                            total
                        </span>

                    </div>

                </div>

                {/* LEYENDA */}
                <div className="w-full space-y-2">

                    {lista.length === 0 ? (

                        <p className="text-xs text-slate-600">
                            No hay datos disponibles.
                        </p>

                    ) : (

                        lista.map((item) => {
                            const cantidad =
                                Number(item.cantidad || 0);

                            const porcentaje =
                                total > 0
                                    ? (
                                        cantidad /
                                        total *
                                        100
                                    ).toFixed(1)
                                    : '0.0';

                            return (
                                <div
                                    key={item.estado}
                                    className="flex items-center justify-between gap-3 border-b border-slate-100 px-1 py-2 last:border-0"
                                >

                                    <div className="flex items-center gap-2">

                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    obtenerColor(
                                                        item.estado
                                                    )
                                            }}
                                        />

                                        <span className="text-xs font-semibold capitalize text-slate-700">
                                            {item.estado}
                                        </span>

                                    </div>

                                    <div className="text-right">

                                        <p className="text-xs font-semibold text-slate-800">
                                            {cantidad}
                                        </p>

                                        <p className="text-[10px] text-slate-500">
                                            {porcentaje}%
                                        </p>

                                    </div>

                                </div>
                            );
                        })

                    )}

                </div>

            </div>

        </section>
    );
}

export default StatusDonut;
