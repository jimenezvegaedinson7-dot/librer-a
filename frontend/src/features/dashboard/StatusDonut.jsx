function StatusDonut({ titulo, subtitulo, datos = [], tipo = 'ventas' }) {
    const lista = Array.isArray(datos) ? datos : [];

    const total = lista.reduce(
        (acc, item) => acc + Number(item.cantidad || 0), 0
    );

    const obtenerColor = (estado) => {
        const coloresVentas = {
            pagada: '#059669',
            pendiente: '#d97706',
            cancelada: '#dc2626',
        };

        const coloresReservas = {
            completada: '#059669',
            confirmada: '#0284c7',
            pendiente: '#d97706',
            cancelada: '#dc2626',
        };

        const colores = tipo === 'reservas' ? coloresReservas : coloresVentas;
        return colores[String(estado).toLowerCase()] || '#94a3b8';
    };

    const segmentos = [];
    let acumulado = 0;

    lista.forEach((item) => {
        const cantidad = Number(item.cantidad || 0);
        const porcentaje = total > 0 ? (cantidad / total) * 100 : 0;
        const inicio = acumulado;
        const fin = acumulado + porcentaje;

        segmentos.push(`${obtenerColor(item.estado)} ${inicio}% ${fin}%`);
        acumulado = fin;
    });

    const fondo = total > 0
        ? `conic-gradient(${segmentos.join(', ')})`
        : 'conic-gradient(#e2e8f0 0% 100%)';

    return (
        <section
            className="
                overflow-hidden
                rounded-[8px]
                border border-[#e7eaf3]
                bg-white
                p-5
                shadow-[0_2px_8px_rgba(30,64,175,0.06)]
            "
        >

            <div className="mb-4">
                <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[#10213f]">{titulo}</h3>
                <p className="mt-1 text-[12px] font-normal text-[#66738c]">{subtitulo}</p>
            </div>

            <div className="flex flex-col items-center gap-5 sm:flex-row">

                {/* dona */}
                <div
                    className="relative h-36 w-36 shrink-0 rounded-full shadow-inner"
                    style={{ background: fondo }}
                >
                    <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
                        <span className="text-[26px] font-bold tracking-[-0.02em] text-[#10213f]">{total}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#7b879d]">total</span>
                    </div>
                </div>

                {/* leyenda */}
                <div className="w-full space-y-2">
                    {lista.length === 0 ? (
                        <p className="text-[12px] text-[#7b879d]">No hay datos disponibles.</p>
                    ) : (
                        lista.map((item) => {
                            const cantidad = Number(item.cantidad || 0);
                            const porcentaje = total > 0
                                ? ((cantidad / total) * 100).toFixed(1)
                                : '0.0';

                            return (
                                <div
                                    key={item.estado}
                                    className="
                                        flex items-center justify-between gap-3
                                        rounded-[6px] border border-[#edf0f6]
                                        px-3.5 py-2.5
                                        transition-colors hover:bg-[#f8fafd]
                                    "
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className="h-3 w-3 rounded-full ring-2 ring-white"
                                            style={{ backgroundColor: obtenerColor(item.estado) }}
                                        />
                                        <span className="text-[12px] font-semibold capitalize text-[#10213f]">
                                            {item.estado}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[14px] font-bold text-[#10213f]">{cantidad}</p>
                                        <p className="text-[10px] font-medium text-[#7b879d]">{porcentaje}%</p>
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
