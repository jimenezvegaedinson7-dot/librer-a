import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useRef, useState } from 'react';

import { animate, useReducedMotion } from 'motion/react';

import { formatearMoneda } from '../../lib/utils/format';
import { Anillo, OndaDecorativa, TendenciaViva } from '../../features/dashboard/Decoraciones';

// Fila de indicadores de cada módulo: tarjetas compactas con el acabado de
// "Total vendido" en distintos colores. Mientras la página carga muestran un
// barrido de luz; al llegar los datos la cifra cuenta hasta su valor, aparece
// el gráfico usa las mismas piezas que el Dashboard, sin modificarlo.

const ContextoIndicadores = createContext({ cargando: false });

const columnas = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 xl:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 indicadores--cinco',
};

// Partes del total: tarjetas que se miden contra la misma referencia y que,
// sumadas, no la superan (así no se mezclan grupos que se superponen, como
// «clientes» y «activos»). Se toman en orden hasta completar el total.
function partesDe(hijos) {
    const total = Number(hijos[0]?.props.valor);
    if (!Number.isFinite(total) || total <= 0) return [];
    const partes = [];
    let suma = 0;
    for (const h of hijos.slice(1)) {
        if (Number(h.props.de) !== total) continue;
        const valor = Number(h.props.valor);
        // Una parte no disponible no equivale a cero; no dibujar un reparto
        // incompleto que aparentaría conocer los estados que faltan.
        if (h.props.valor == null || !Number.isFinite(valor) || valor < 0) return [];
        if (suma + valor > total) break;
        suma += valor;
        partes.push({ titulo: h.props.titulo, valor, tono: h.props.tono || 'neutral' });
    }
    if (partes.length < 2) return [];
    if (suma < total) partes.push({ titulo: 'Otros', valor: total - suma, tono: 'neutral' });
    return partes;
}

export function Indicadores({ etiqueta, cargando = false, children }) {
    const hijos = Children.toArray(children).filter(isValidElement);

    return (
        <ContextoIndicadores.Provider value={{ cargando }}>
            <section
                aria-label={etiqueta}
                aria-busy={cargando || undefined}
                className={`indicadores grid gap-3 ${columnas[hijos.length] || 'grid-cols-2 xl:grid-cols-4'}`}
            >
                {hijos.map((hijo, orden) => cloneElement(hijo, {
                    orden,
                    ...(orden === 0 && !hijo.props.de ? { composicion: partesDe(hijos) } : {}),
                }))}
            </section>
        </ContextoIndicadores.Provider>
    );
}

// Cuenta desde el último valor mostrado hasta el nuevo, con frenado suave.
function useCifraAnimada(objetivo, activo) {
    const reducirMovimiento = useReducedMotion();
    const [valor, setValor] = useState(objetivo);
    const anterior = useRef(0);
    const animar = activo && !reducirMovimiento && typeof objetivo === 'number' && Number.isFinite(objetivo);

    useEffect(() => {
        if (!animar) {
            if (typeof objetivo === 'number') anterior.current = objetivo;
            return undefined;
        }
        const control = animate(anterior.current, objetivo, {
            duration: 0.9,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: setValor,
        });
        anterior.current = objetivo;
        return () => control.stop();
    }, [objetivo, animar]);

    return animar ? valor : objetivo;
}

function formatear(valor, formato) {
    if (typeof valor !== 'number') return valor;
    if (formato === 'moneda') return formatearMoneda(valor);
    return Math.round(valor).toLocaleString('es-PE');
}


// ============================================================
// GRÁFICOS DENTRO DE LA TARJETA
// Todos dibujan datos reales: la parte del total que representa la tarjeta,
// el reparto entre tarjetas o una serie (por ejemplo, actividad por día).
// Se reutilizan los anillos, columnas y ondas del Dashboard. Las ondas son
// decorativas; solo las proporciones, series y repartos representan datos.
// ============================================================
const ACENTOS = {
    primary: '#e3b865', success: '#a3dcc2', danger: '#f2b6be', warning: '#f2cf92', info: '#f0d58e',
    violet: '#cdbff5', teal: '#a2e0da', sky: '#abcdef', rose: '#f2b6d1', neutral: '#e2d7c6',
};

// Tarjeta principal: cómo se reparte el total entre las demás tarjetas.
function Composicion({ partes, activa }) {
    const suma = partes.reduce((s, p) => s + p.valor, 0);
    if (!suma) return null;
    return (
        <div className="grafico-composicion" style={Object.fromEntries(partes.map((p, i) => [`--parte-${i}`, ACENTOS[p.tono] || ACENTOS.neutral]))}>
            <TendenciaViva datos={partes.map((p) => p.valor)} activa={activa}
                etiqueta={`Reparto del total: ${partes.map((p) => `${p.titulo} ${p.valor}`).join(', ')}`} />
            <ul className="grafico-composicion__leyenda">
                {partes.map((p) => (
                    <li key={p.titulo}><i style={{ background: ACENTOS[p.tono] || ACENTOS.neutral }} />{p.titulo} <b>{p.valor}</b></li>
                ))}
            </ul>
        </div>
    );
}

/**
 * @param {number[]} [serie]  valores en el tiempo (columnas del Dashboard).
 * @param {string} tono  primary | success | danger | warning | info | neutral | violet | teal | sky | rose
 * @param {number} [de]  total de referencia: muestra el porcentaje y llena el medidor.
 * @param {'numero'|'moneda'} [formato]
 * @param {string} [leyenda]  texto junto al anillo («del total»).
 */
export function Indicador({ titulo, valor, icono, tono = 'neutral', detalle, de, formato = 'numero', orden = 0, serie, composicion, leyenda = 'del total' }) {
    const { cargando } = useContext(ContextoIndicadores);
    const numero = typeof valor === 'number' ? valor : Number.isFinite(Number(valor)) && valor !== '' && valor !== null ? Number(valor) : null;
    const cifra = useCifraAnimada(numero ?? valor, !cargando);

    const conProporcion = numero !== null && Number.isFinite(numero) && numero >= 0
        && Number.isFinite(Number(de)) && Number(de) > 0 && numero <= Number(de);
    const conDato = numero !== null && Number.isFinite(numero);
    const conTexto = typeof valor === 'string' && valor.trim() !== '' && valor !== 'No disponible' && valor !== '—';
    const conSerie = conDato && Array.isArray(serie) && serie.length > 1
        && serie.every((v) => Number.isFinite(v) && v >= 0);
    const [activa, setActiva] = useState(false);

    // Mismo diseño que las tarjetas del Dashboard y de Ventas (StatCard):
    // título arriba a la izquierda, ícono a la derecha, cifra, descripción y
    // gráfico abajo. Se conservan la carga animada y el conteo de la cifra.
    return (
        <article
            className={`kpi-card kpi-card--destacada joya ${tono === 'primary' ? '' : `joya--${tono}`} indicador-tarjeta ${cargando ? 'indicador--cargando' : ''}`}
            style={{ '--orden': orden }}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActiva(true); }}
            onPointerLeave={() => setActiva(false)}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="kpi-label">{titulo}</p>
                <span className="kpi-icono" aria-hidden="true">{icono}</span>
            </div>
            {cargando ? (
                <span className="indicador-esqueleto" aria-hidden="true" />
            ) : (
                <p className={`kpi-valor${numero === null ? ' indicador-valor--texto' : ''}`}>{formatear(cifra, formato)}</p>
            )}
            {detalle && <p className="kpi-descripcion">{detalle}</p>}
            {!cargando && (conDato || conTexto) && (
                <div className="indicador-zona">
                    {conSerie ? <TendenciaViva datos={serie} etiqueta={`Ventas de los últimos 14 días · ${titulo}`} activa={activa} />
                        : conProporcion ? <Anillo valor={numero} total={Number(de)} etiqueta={`${titulo} sobre el total`} leyenda={leyenda} activa={activa} />
                        : composicion?.length > 0 ? <Composicion partes={composicion} activa={activa} />
                        : <OndaDecorativa className="onda-decorativa--indicador" activa={activa} />}
                </div>
            )}
            {cargando && <span className="indicador-zona indicador-zona--esqueleto" aria-hidden="true" />}
            {cargando && <span className="sr-only">Cargando {titulo}</span>}
        </article>
    );
}
