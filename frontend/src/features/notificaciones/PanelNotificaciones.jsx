import { useState } from 'react';

import { motion, useReducedMotion } from 'motion/react';

import { haceCuanto } from './notificacionesService';

const FILTROS = [
    { id: 'todas', texto: 'Todas' },
    { id: 'pago', texto: 'Pagos' },
    { id: 'reserva', texto: 'Reservas' },
    { id: 'stock', texto: 'Stock' },
];

const entrada = {
    oculto: { opacity: 0, y: 4 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.22, delay: Math.min(i, 8) * 0.025, ease: [0.25, 1, 0.5, 1] } }),
};

function Item({ notificacion, nueva, indice, onAbrir }) {
    const reducir = useReducedMotion();
    const cuando = haceCuanto(notificacion.fecha);
    return (
        <motion.li custom={indice} variants={reducir ? undefined : entrada} initial="oculto" animate="visible">
            <button
                type="button"
                onClick={() => onAbrir(notificacion)}
                className={`notif-item notif--${notificacion.tono} ${nueva ? 'notif-item--nueva' : ''}`}
            >
                <span className="notif-cabeza">
                    <span className="notif-etiqueta">{notificacion.etiqueta}</span>
                    {nueva && <span className="notif-nueva">Nueva</span>}
                    {cuando && <span className="notif-tiempo">{cuando}</span>}
                </span>
                <span className="notif-titulo">{notificacion.titulo}</span>
                <span className="notif-detalle">{notificacion.detalle}</span>
                <span className="notif-abrir" aria-hidden="true">Abrir</span>
            </button>
        </motion.li>
    );
}

export default function PanelNotificaciones({ notificaciones, nuevas, cargando, onAbrir, onActualizar, onMarcarLeidas }) {
    const [filtro, setFiltro] = useState('todas');

    const conteo = (tipo) => notificaciones.filter((n) => tipo === 'todas' || n.tipo === tipo).length;
    const visibles = notificaciones.filter((n) => filtro === 'todas' || n.tipo === filtro);
    const actividad = visibles.filter((n) => n.tipo !== 'stock');
    const inventario = visibles.filter((n) => n.tipo === 'stock');
    const cantidadNuevas = notificaciones.filter((n) => nuevas.has(n.clave)).length;

    const lista = (items, desde) => (
        <ul className="notif-lista">
            {items.map((n, i) => (
                <Item key={n.clave} notificacion={n} nueva={nuevas.has(n.clave)} indice={desde + i} onAbrir={onAbrir} />
            ))}
        </ul>
    );

    return (
        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
            <header className="notif-encabezado">
                <div>
                    <h3 className="notif-titulo-panel">Notificaciones</h3>
                    <p className="notif-subtitulo">
                        {cantidadNuevas > 0
                            ? `${cantidadNuevas} ${cantidadNuevas === 1 ? 'nueva' : 'nuevas'} · pagos, reservas y stock`
                            : 'Pagos, reservas y stock que requieren atención'}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {cantidadNuevas > 0 && (
                        <button type="button" onClick={onMarcarLeidas} className="notif-accion">Marcar leídas</button>
                    )}
                    <button type="button" onClick={onActualizar} className="notif-accion" disabled={cargando}>
                        {cargando ? 'Actualizando…' : 'Actualizar'}
                    </button>
                </div>
            </header>

            <div className="notif-filtros" role="tablist" aria-label="Filtrar notificaciones">
                {FILTROS.map((f) => (
                    <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={filtro === f.id}
                        onClick={() => setFiltro(f.id)}
                        className={`notif-filtro ${filtro === f.id ? 'notif-filtro--activo' : ''}`}
                    >
                        {f.texto}
                        <span className="notif-filtro-conteo">{conteo(f.id)}</span>
                    </button>
                ))}
            </div>

            <div className="notif-cuerpo scrollbar-light">
                {cargando && notificaciones.length === 0 ? (
                    <div className="notif-vacio">
                        <span className="skeleton h-3 w-40" />
                        <span className="skeleton mt-3 h-3 w-56" />
                        <span className="skeleton mt-3 h-3 w-32" />
                    </div>
                ) : visibles.length === 0 ? (
                    <div className="notif-vacio">
                        <p className="notif-vacio-titulo">Todo en orden</p>
                        <p className="notif-vacio-texto">
                            {filtro === 'todas' ? 'No hay pagos, reservas ni alertas de stock pendientes.' : 'No hay notificaciones de este tipo.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {actividad.length > 0 && (
                            <section>
                                {filtro === 'todas' && <p className="notif-seccion">Actividad</p>}
                                {lista(actividad, 0)}
                            </section>
                        )}
                        {inventario.length > 0 && (
                            <section>
                                {filtro === 'todas' && <p className="notif-seccion">Inventario</p>}
                                {lista(inventario, actividad.length)}
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
