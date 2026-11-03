import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { formatearMoneda } from '../../compartido/lib/utils/format';
import { Anillo, TendenciaViva } from '../dashboard/Decoraciones';
import { IlustracionIndicador } from './IlustracionIndicador';

const estilosIndicador = `
  .indicadores:has(.indicador-nuevo) {
    position: relative;
    display: grid;
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    align-items: stretch;
    gap: 0;
    padding: 0;
    border: 1px solid #dbcdb7;
    border-radius: 0.65rem;
    background: linear-gradient(180deg, #fffdf8 0%, #f9f0e0 100%);
    box-shadow: 0 2px 7px rgb(43 33 21 / 0.05);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: #d8ccb9 transparent;
  }
  .indicadores:has(.indicador-nuevo) > :first-child { grid-column: auto; }
  .indicador-nuevo:nth-child(1) { --tinte: #d4af37; --divisor: #d4af37; }
  .indicador-nuevo:nth-child(2) { --tinte: #c96f4a; --divisor: #c96f4a; }
  .indicador-nuevo:nth-child(3) { --tinte: #8f7bd6; --divisor: #8f7bd6; }
  .indicador-nuevo:nth-child(4) { --tinte: #3aa79f; --divisor: #3aa79f; }
  .indicador-nuevo:nth-child(5) { --tinte: #cf7fa5; --divisor: #cf7fa5; }
  .indicador-nuevo:nth-child(6) { --tinte: #5f93d6; --divisor: #5f93d6; }
  .indicador-nuevo {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 3.25rem minmax(0, 1fr);
    grid-template-rows: auto auto auto;
    align-items: center;
    column-gap: 0.6rem;
    row-gap: 0.08rem;
    min-height: 0;
    padding: 0.6rem 0.9rem;
    border-top: 2px solid color-mix(in srgb, var(--tinte, #d4af37) 72%, #e2d8c8);
    background-color: color-mix(in srgb, var(--tinte, #d4af37) 16%, #fffdf8);
    background-image: linear-gradient(180deg, color-mix(in srgb, var(--tinte, #d4af37) 16%, transparent) 0%, transparent 100%);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.65);
    transition: background-color 0.2s ease;
  }
  .indicador-nuevo + .indicador-nuevo {
    border-left: 1px solid color-mix(in srgb, var(--divisor, #d4af37) 60%, #d9cdb9);
  }
  .indicador-nuevo:hover {
    background-color: color-mix(in srgb, var(--tinte, #d4af37) 22%, #fffdf8);
  }
  .indicador-nuevo > div:first-child { display: contents; }
  .indicador-nuevo > * { position: relative; z-index: 1; }
  .indicador-nuevo .indicador-ilustracion {
    --figura-acento: var(--tinte, #d4af37);
    --figura-suave: color-mix(in srgb, var(--figura-acento) 30%, #fffdf8);
    --figura-trazo: color-mix(in srgb, var(--figura-acento) 22%, #354351);
    --figura-secundario: #94b1ad;
    --figura-papel: #fffdf8;
    grid-column: 1;
    grid-row: 1 / span 3;
    display: block;
    position: relative;
    width: 3.25rem;
    height: 3.25rem;
  }
  .indicador-ilustracion > svg { display: block; width: 100%; height: 100%; }
  .indicador-ilustracion__simbolo {
    position: absolute;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid var(--figura-papel);
    border-radius: 50%;
    color: var(--figura-papel);
    background: var(--figura-trazo);
    font-size: 0.75rem;
  }
  .indicador-nuevo.joya .kpi-label {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    font-size: 0.59rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 1.2;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--tinte, #d4af37) 20%, #4b4034);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .indicador-nuevo.joya .kpi-valor {
    grid-column: 2;
    grid-row: 2;
    min-width: 0;
    font-size: 1.3rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
    color: #241c12;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .indicador-nuevo.joya .kpi-valor.indicador-valor--texto {
    font-size: 0.85rem;
    line-height: 1.25;
    white-space: normal;
  }
  .indicador-nuevo.joya .kpi-descripcion {
    grid-column: 2;
    grid-row: 3;
    min-width: 0;
    margin: 0;
    font-size: 0.625rem;
    line-height: 1.25;
    color: #665745;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .indicador-nuevo.joya .kpi-descripcion::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 4px;
    margin-right: 0.28rem;
    border-radius: 50%;
    vertical-align: middle;
    background: color-mix(in srgb, var(--tinte, #d4af37) 70%, #8a7b66);
  }
  .indicador-nuevo .indicador-complemento {
    grid-column: 2;
    grid-row: 4;
    margin: 0.15rem 0 0;
    font-size: 0.625rem;
    line-height: 1.35;
    color: #665745;
  }
  .indicador-nuevo .indicador-zona,
  .indicador-nuevo .indicador-zona--esqueleto,
  .indicador-nuevo .kpi-destello { display: none; }
  .indicador-nuevo.joya .indicador-esqueleto {
    grid-column: 2;
    grid-row: 2;
    display: block;
    width: 55%;
    height: 0.8rem;
    border-radius: 0.3rem;
    background: linear-gradient(90deg, #ece2d3 0%, #f8f2e8 50%, #ece2d3 100%);
    background-size: 200% 100%;
    animation: indicador-mini-brillo 1.2s linear infinite;
  }
  @keyframes indicador-mini-brillo {
    to { background-position: -200% 0; }
  }
  @media (max-width: 640px) {
    .indicadores:has(.indicador-nuevo) {
      grid-auto-columns: minmax(190px, 1fr);
      gap: 0;
      padding: 0;
      border-radius: 0.5rem;
      scroll-snap-type: x proximity;
    }
    .indicadores:has(.indicador-nuevo) > :first-child { grid-column: auto; }
    .indicador-nuevo {
      scroll-snap-align: start;
      grid-template-columns: 2.75rem minmax(0, 1fr);
      column-gap: 0.5rem;
      padding: 0.5rem 0.65rem;
    }
    .indicador-nuevo .indicador-ilustracion {
      width: 2.75rem;
      height: 2.75rem;
    }
    .indicador-ilustracion__simbolo { width: 1.25rem; height: 1.25rem; font-size: 0.625rem; }
    .indicador-nuevo.joya .kpi-label { letter-spacing: 0.1em; }
    .indicador-nuevo.joya .kpi-valor { font-size: 1.1rem; }
    .indicador-nuevo.joya .kpi-descripcion { display: none; }
    .indicador-nuevo .indicador-complemento { grid-row: 3; }
  }
  @media (prefers-reduced-motion: reduce) {
    .indicador-nuevo.joya .indicador-esqueleto { animation: none; }
  }
`;

const ContextoIndicadores = createContext({ cargando: false, error: false });

const columnas = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 xl:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 indicadores--cinco'
};

function partesDe(hijos) {
    const total = Number(hijos[0]?.props.valor);
    if (!Number.isFinite(total) || total <= 0) return [];
    const partes = [];
    let suma = 0;
    for (const h of hijos.slice(1)) {
        if (Number(h.props.de) !== total) continue;
        const valor = Number(h.props.valor);

        if (h.props.valor == null || !Number.isFinite(valor) || valor < 0) return [];
        if (suma + valor > total) break;
        suma += valor;
        partes.push({ titulo: h.props.titulo, valor, tono: h.props.tono || 'neutral' });
    }
    if (partes.length < 2) return [];
    if (suma < total) partes.push({ titulo: 'Otros', valor: total - suma, tono: 'neutral' });
    return partes;
}

export function Indicadores({ etiqueta, cargando = false, error = false, children }) {
    const hijos = Children.toArray(children).filter(isValidElement);

    return (
        <ContextoIndicadores.Provider value={{ cargando, error }}>
            <style>{estilosIndicador}</style>
            <section aria-label={etiqueta} aria-busy={cargando || undefined} className={`indicadores grid gap-3 ${columnas[hijos.length] || 'grid-cols-2 xl:grid-cols-4'}`}>
                {hijos.map((hijo, orden) => cloneElement(hijo, { orden, ...(orden === 0 && !hijo.props.de ? { composicion: partesDe(hijos) } : {}) }))}
            </section>
        </ContextoIndicadores.Provider>
    );
}

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
        const control = animate(anterior.current, objetivo, { duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: setValor });
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

const ACENTOS = {
    primary: '#e3b865',
    success: '#a3dcc2',
    danger: '#f2b6be',
    warning: '#f2cf92',
    info: '#f0d58e',
    violet: '#cdbff5',
    teal: '#a2e0da',
    sky: '#abcdef',
    rose: '#f2b6d1',
    neutral: '#e2d7c6'
};

function Composicion({ partes, activa }) {
    const suma = partes.reduce((s, p) => s + p.valor, 0);
    if (!suma) return null;
    return (
        <div className="grafico-composicion" style={Object.fromEntries(partes.map((p, i) => [`--parte-${i}`, ACENTOS[p.tono] || ACENTOS.neutral]))}>
            <TendenciaViva datos={partes.map((p) => p.valor)} activa={activa} etiqueta={`Reparto del total: ${partes.map((p) => `${p.titulo} ${p.valor}`).join(', ')}`} />
            <ul className="grafico-composicion__leyenda">
                {partes.map((p) => (
                    <li key={p.titulo}>
                        <i style={{ background: ACENTOS[p.tono] || ACENTOS.neutral }} />
                        {p.titulo} <b>{p.valor}</b>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function Indicador({
    titulo,
    valor,
    icono,
    tono = 'neutral',
    detalle,
    de,
    formato = 'numero',
    orden = 0,
    serie,
    composicion,
    leyenda = 'del total',
    className = '',
    claseValor = '',
    children
}) {
    const { cargando, error } = useContext(ContextoIndicadores);
    const visible = error ? 'No disponible' : valor;
    const numero = typeof visible === 'number' ? visible : Number.isFinite(Number(visible)) && visible !== '' && visible !== null ? Number(visible) : null;
    const cifra = useCifraAnimada(numero ?? visible, !cargando);

    const conProporcion = numero !== null && Number.isFinite(numero) && numero >= 0 && Number.isFinite(Number(de)) && Number(de) > 0 && numero <= Number(de);
    const conDato = numero !== null && Number.isFinite(numero);
    const conSerie = conDato && Array.isArray(serie) && serie.length > 1 && serie.every((v) => Number.isFinite(v) && v >= 0);
    const [activa, setActiva] = useState(false);

    return (
        <article
            className={`indicador-nuevo joya ${tono === 'primary' ? '' : `joya--${tono}`} ${cargando ? 'indicador--cargando' : ''} ${className}`}
            aria-label={titulo}
            style={{ '--orden': orden }}
            onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') setActiva(true);
            }}
            onPointerLeave={() => setActiva(false)}>
            <div className="flex items-start justify-between gap-3">
                <p className="kpi-label">{titulo}</p>
                <IlustracionIndicador icono={icono} />
            </div>
            {cargando ? (
                <span className="indicador-esqueleto" aria-hidden="true" />
            ) : (
                <p className={`kpi-valor${numero === null ? ' indicador-valor--texto' : ''} ${claseValor}`}>{formatear(cifra, formato)}</p>
            )}
            {detalle && <p className="kpi-descripcion">{error ? 'Consulta no disponible' : detalle}</p>}
            {!error && children && <div className="indicador-complemento">{children}</div>}
            {!cargando && !error && (conSerie || conProporcion || composicion?.length > 0) && (
                <div className="indicador-zona">
                    {conSerie ? (
                        <TendenciaViva datos={serie} etiqueta={`Ventas de los últimos 14 días · ${titulo}`} activa={activa} />
                    ) : conProporcion ? (
                        <Anillo valor={numero} total={Number(de)} etiqueta={`${titulo} sobre el total`} leyenda={leyenda} activa={activa} />
                    ) : composicion?.length > 0 ? (
                        <Composicion partes={composicion} activa={activa} />
                    ) : null}
                </div>
            )}
            {cargando && <span className="indicador-zona indicador-zona--esqueleto" aria-hidden="true" />}
            {cargando && <span className="sr-only">Cargando {titulo}</span>}
            <span className="kpi-destello" aria-hidden="true" />
        </article>
    );
}
