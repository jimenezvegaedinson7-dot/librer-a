import { FaCalendarCheck, FaCartShopping, FaCircleCheck, FaCircleXmark, FaClock, FaTruck } from 'react-icons/fa6';

import { formatearMoneda } from '../../lib/utils/format';
import { num } from './graficoUtils';

// Estados como paleta de estado (validada con el validador de dataviz en claro y oscuro).
// Orden fijo: el color sigue al estado, nunca a su posición en la lista.
const ESTADOS = {
    pagada: { texto: 'Pagada', clase: 'estado--exito', Icono: FaCircleCheck, orden: 1 },
    completada: { texto: 'Completada', clase: 'estado--exito', Icono: FaCircleCheck, orden: 1 },
    entregada: { texto: 'Entregada', clase: 'estado--info', Icono: FaTruck, orden: 2 },
    confirmada: { texto: 'Confirmada', clase: 'estado--info', Icono: FaCircleCheck, orden: 2 },
    pendiente: { texto: 'Pendiente', clase: 'estado--aviso', Icono: FaClock, orden: 3 },
    cancelada: { texto: 'Cancelada', clase: 'estado--peligro', Icono: FaCircleXmark, orden: 4 },
};

const configEstado = (estado) => {
    const clave = String(estado || '').toLowerCase();
    return ESTADOS[clave] || { texto: clave || 'Otro', clase: 'estado--neutro', Icono: FaClock, orden: 9 };
};

function StatusDonut({ titulo, subtitulo, datos = [], tipo = 'ventas' }) {
    const lista = (Array.isArray(datos) ? datos : [])
        .map((item) => ({ ...item, ...configEstado(item.estado), cantidad: num(item.cantidad) }))
        .sort((a, b) => a.orden - b.orden);

    const total = lista.reduce((acc, item) => acc + item.cantidad, 0);
    const unidad = tipo === 'reservas' ? 'reservas' : 'ventas';
    const IconoTitulo = tipo === 'reservas' ? FaCalendarCheck : FaCartShopping;

    return (
        <section className="grafico-card" aria-labelledby={`titulo-estado-${tipo}`}>
            <header className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="ficha-icono flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" aria-hidden="true">
                        <IconoTitulo />
                    </span>
                    <div className="min-w-0">
                        <h2 id={`titulo-estado-${tipo}`} className="font-title text-[18px] font-semibold leading-snug text-[#1c1814]">{titulo}</h2>
                        <p className="mt-0.5 text-[13px] text-[#766d62]">{subtitulo}</p>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-[26px] font-semibold leading-none text-[#1c1814]">{total}</p>
                    <p className="mt-1 text-[12px] text-[#766d62]">{unidad}</p>
                </div>
            </header>

            {total === 0 ? (
                <p className="px-6 py-10 text-center text-[13px] text-[#766d62]">No hay {unidad} registradas.</p>
            ) : (
                <div className="px-5 pb-5 pt-5 sm:px-6">
                    {/* Barra 100 % apilada con separación de 2px entre segmentos */}
                    <div className="estado-barra" role="img" aria-label={lista.map((i) => `${i.texto}: ${i.cantidad}`).join(', ')}>
                        {lista.map((item, i) => (
                            <span
                                key={item.estado}
                                className={`estado-segmento reporte-barra-h ${item.clase}`}
                                style={{ flexGrow: item.cantidad, '--barra-i': i }}
                                title={`${item.texto}: ${item.cantidad}`}
                            />
                        ))}
                    </div>

                    <ul className="mt-4 divide-y divide-[#f3efe9]">
                        {lista.map((item) => {
                            const porcentaje = (item.cantidad / total) * 100;
                            const { Icono } = item;
                            return (
                                <li key={item.estado} className="flex items-center justify-between gap-3 py-2.5">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span className={`estado-chip ${item.clase}`} aria-hidden="true"><Icono /></span>
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-medium text-[#1c1814]">{item.texto}</p>
                                            {tipo === 'ventas' && item.total != null && (
                                                <p className="text-[12px] tabular-nums text-[#766d62]">{formatearMoneda(item.total)}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-baseline gap-2 tabular-nums">
                                        <span className="text-[15px] font-semibold text-[#1c1814]">{item.cantidad}</span>
                                        <span className="w-12 text-right text-[12px] text-[#766d62]">{porcentaje.toFixed(0)} %</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
}

export default StatusDonut;
