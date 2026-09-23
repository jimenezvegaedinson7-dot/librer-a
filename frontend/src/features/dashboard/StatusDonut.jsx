import { motion, useReducedMotion } from 'motion/react';
import { FaCalendarCheck, FaCartShopping, FaCircleCheck, FaCircleXmark, FaClock, FaTruck } from 'react-icons/fa6';

import { formatearMoneda } from '../../lib/utils/format';
import { Destello } from './Decoraciones';
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

// Barra 100 % apilada con escala y destello al pasar el cursor.
function BarraEstados({ lista }) {
    return (
        <div>
            <div className="estado-barra-marco">
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
                <Destello />
            </div>
            <div className="estado-escala" aria-hidden="true">
                <span>0 %</span>
                <span>50 %</span>
                <span>100 %</span>
            </div>
        </div>
    );
}

// Donut de proporciones: segmentos con separación de 1 unidad sobre 100.
function DonutEstados({ lista, total, unidad }) {
    const reducir = useReducedMotion();
    const separacion = lista.length > 1 ? 1.2 : 0;
    const segmentos = lista.reduce((acc, item) => {
        const previo = acc[acc.length - 1];
        const inicio = previo ? previo.inicio + previo.largo : 0;
        return [...acc, { ...item, largo: (item.cantidad / total) * 100, inicio }];
    }, []);
    const principal = segmentos[0];

    return (
        <div className="donut" role="img" aria-label={lista.map((i) => `${i.texto}: ${i.cantidad}`).join(', ')}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle className="donut-pista" cx="50" cy="50" r="40" pathLength="100" />
                {segmentos.filter((s) => s.largo > 0).map((s) => (
                    <circle
                        key={s.estado}
                        className={`donut-segmento ${s.clase}`}
                        cx="50"
                        cy="50"
                        r="40"
                        pathLength="100"
                        strokeDasharray={`${Math.max(s.largo - separacion, 0.5)} ${100 - Math.max(s.largo - separacion, 0.5)}`}
                        strokeDashoffset={-s.inicio}
                    />
                ))}
                <motion.circle
                    className="donut-brillo"
                    cx="50"
                    cy="50"
                    r="40"
                    pathLength="100"
                    strokeDasharray="10 90"
                    variants={{
                        visible: { strokeDashoffset: 0, opacity: 0 },
                        hover: reducir
                            ? { opacity: 0 }
                            : { strokeDashoffset: [0, -100], opacity: [0, 1, 0], transition: { duration: 0.6, ease: 'easeInOut' } },
                    }}
                />
            </svg>
            <div className="donut-centro">
                <span className="donut-cifra">{Math.round(principal.largo)}%</span>
                <span className="donut-texto">{principal.texto.toLowerCase()}</span>
            </div>
            <span className="sr-only">{`${total} ${unidad}`}</span>
        </div>
    );
}

function StatusDonut({ titulo, subtitulo, datos = [], tipo = 'ventas', variante = 'barra' }) {
    const lista = (Array.isArray(datos) ? datos : [])
        .map((item) => ({ ...item, ...configEstado(item.estado), cantidad: num(item.cantidad) }))
        .sort((a, b) => a.orden - b.orden);

    const total = lista.reduce((acc, item) => acc + item.cantidad, 0);
    const unidad = tipo === 'reservas' ? 'reservas' : 'ventas';
    const IconoTitulo = tipo === 'reservas' ? FaCalendarCheck : FaCartShopping;

    // Pie: lo que ya se cobró (ventas) o lo que falta atender (reservas).
    const suma = (estados, campo) => lista
        .filter((i) => estados.includes(String(i.estado).toLowerCase()))
        .reduce((acc, i) => acc + num(i[campo]), 0);
    const resumenPie = tipo === 'reservas'
        ? { etiqueta: 'Por atender (pendientes y confirmadas)', valor: suma(['pendiente', 'confirmada'], 'cantidad') }
        : { etiqueta: `Cobradas: ${suma(['pagada', 'entregada'], 'cantidad')} ventas`, valor: formatearMoneda(suma(['pagada', 'entregada'], 'total')) };

    const esDonut = variante === 'donut';

    return (
        <motion.section
            className="grafico-card panel-analitico flex h-full flex-col"
            aria-labelledby={`titulo-estado-${tipo}`}
            initial="visible"
            animate="visible"
            whileHover="hover"
        >
            <header className="panel-cabecera">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="panel-icono" aria-hidden="true">
                        <IconoTitulo />
                    </span>
                    <div className="min-w-0">
                        <h2 id={`titulo-estado-${tipo}`} className="panel-titulo">{titulo}</h2>
                        <p className="panel-subtitulo">{subtitulo}</p>
                    </div>
                </div>
                <div className="panel-total">
                    <p className="panel-total-cifra">{total}</p>
                    <p className="panel-total-unidad">{unidad}</p>
                </div>
            </header>

            {total === 0 ? (
                <p className="flex flex-1 items-center justify-center px-6 py-10 text-center text-[13px] text-[#766d62]">No hay {unidad} registradas.</p>
            ) : (
                <>
                    <div className={`panel-cuerpo flex-1 ${esDonut ? 'panel-cuerpo--donut' : ''}`}>
                        {esDonut ? <DonutEstados lista={lista} total={total} unidad={unidad} /> : <BarraEstados lista={lista} />}

                        <ul className="estado-lista">
                            {lista.map((item) => {
                                const porcentaje = (item.cantidad / total) * 100;
                                const { Icono } = item;
                                return (
                                    <li key={item.estado} className={`estado-fila ${item.clase}`}>
                                        <span className="estado-chip" aria-hidden="true"><Icono /></span>
                                        <div className="min-w-0 flex-1">
                                            <p className="estado-nombre">{item.texto}</p>
                                            {tipo === 'ventas' && item.total != null && (
                                                <p className="estado-monto">{formatearMoneda(item.total)}</p>
                                            )}
                                        </div>
                                        {!esDonut && (
                                            <span className="estado-mini-pista" aria-hidden="true">
                                                <span style={{ width: `${porcentaje}%` }} />
                                            </span>
                                        )}
                                        <span className="estado-cantidad">{item.cantidad}</span>
                                        <span className="estado-porcentaje">{porcentaje.toFixed(0)} %</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <footer className="panel-pie">
                        <span>{resumenPie.etiqueta}</span>
                        <span className="panel-pie-valor">{resumenPie.valor}</span>
                    </footer>
                </>
            )}
        </motion.section>
    );
}

export default StatusDonut;
