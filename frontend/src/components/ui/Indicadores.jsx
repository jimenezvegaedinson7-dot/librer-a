import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useRef, useState } from 'react';

import { animate, useReducedMotion } from 'motion/react';

import { formatearMoneda } from '../../lib/utils/format';

// Fila de indicadores de cada módulo: tarjetas compactas con el acabado de
// "Total vendido" en distintos colores. Mientras la página carga muestran un
// barrido de luz; al llegar los datos la cifra cuenta hasta su valor, aparece
// el porcentaje del total y se dibuja un gráfico distinto en cada tarjeta.

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
    const partes = [];
    let suma = 0;
    for (const h of hijos.slice(1)) {
        const valor = Number(h.props.valor);
        if (!(Number(h.props.de) > 0) || !Number.isFinite(valor)) continue;
        if (Number.isFinite(total) && suma + valor > total) break;
        suma += valor;
        partes.push({ titulo: h.props.titulo, valor, tono: h.props.tono || 'neutral' });
    }
    return partes.length > 1 ? partes : [];
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
// Usan el color de acento de la tarjeta y se dibujan al llegar los datos.
// ============================================================
const ACENTOS = {
    primary: '#e3b865', success: '#a3dcc2', danger: '#f2b6be', warning: '#f2cf92', info: '#f0d58e',
    violet: '#cdbff5', teal: '#a2e0da', sky: '#abcdef', rose: '#f2b6d1', neutral: '#e2d7c6',
};
const ESTILOS = ['anillo', 'segmentos', 'escala'];

function Anillo({ p }) {
    const r = 15, c = 2 * Math.PI * r;
    return (
        <svg className="grafico-anillo" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r={r} className="grafico-pista" />
            <circle cx="20" cy="20" r={r} className="grafico-trazo grafico-anillo__arco"
                style={{ strokeDasharray: c, '--inicio': c, '--fin': c * (1 - p) }} />
        </svg>
    );
}

// Segmentos: barra en 10 tramos; cada tramo es el 10 % del total.
function Segmentos({ p }) {
    const llenos = Math.round(p * 10);
    return (
        <div className="grafico-segmentos" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < llenos ? 'lleno' : ''} style={{ '--k': i }} />)}
        </div>
    );
}

function Escala({ p }) {
    return (
        <div className="grafico-escala" aria-hidden="true">
            <span className="grafico-escala__relleno" style={{ '--p': p }} />
            {[25, 50, 75].map((m) => <i key={m} style={{ left: `${m}%` }} />)}
        </div>
    );
}

function Linea({ serie }) {
    const max = Math.max(...serie, 1), n = serie.length;
    const x = (i) => (n === 1 ? 50 : (i / (n - 1)) * 100);
    const y = (v) => 30 - (v / max) * 26;
    const puntos = serie.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    return (
        <svg className="grafico-linea" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={`0,32 ${puntos} 100,32`} className="grafico-linea__area" />
            <polyline points={puntos} className="grafico-linea__trazo" pathLength="1" />
        </svg>
    );
}

// Tarjeta principal: cómo se reparte el total entre las demás tarjetas.
function Composicion({ partes }) {
    const suma = partes.reduce((s, p) => s + p.valor, 0);
    if (!suma) return null;
    return (
        <div className="grafico-composicion">
            <div className="grafico-composicion__barra" aria-hidden="true">
                {partes.filter((p) => p.valor > 0).map((p, i) => (
                    <span key={p.titulo} style={{ flexGrow: p.valor, background: ACENTOS[p.tono] || ACENTOS.neutral, '--k': i }} />
                ))}
            </div>
            <ul className="grafico-composicion__leyenda">
                {partes.slice(0, 4).map((p) => (
                    <li key={p.titulo}><i style={{ background: ACENTOS[p.tono] || ACENTOS.neutral }} />{p.titulo} <b>{p.valor}</b></li>
                ))}
            </ul>
        </div>
    );
}

/**
 * @param {number[]} [serie]  valores en el tiempo (dibuja una línea).
 * @param {'anillo'|'segmentos'|'escala'} [grafico]  estilo para la parte del total.
 * @param {string} tono  primary | success | danger | warning | info | neutral | violet | teal | sky | rose
 * @param {number} [de]  total de referencia: muestra el porcentaje y llena el medidor.
 * @param {'numero'|'moneda'} [formato]
 */
export function Indicador({ titulo, valor, icono, tono = 'neutral', detalle, de, formato = 'numero', orden = 0, serie, grafico, composicion }) {
    const { cargando } = useContext(ContextoIndicadores);
    const numero = typeof valor === 'number' ? valor : Number.isFinite(Number(valor)) && valor !== '' && valor !== null ? Number(valor) : null;
    const cifra = useCifraAnimada(numero ?? valor, !cargando);

    const conProporcion = numero !== null && Number(de) > 0;
    const proporcion = conProporcion ? Math.min(1, Math.max(0, numero / Number(de))) : 0;
    const porcentaje = Math.round(proporcion * 100);
    const conSerie = Array.isArray(serie) && serie.length > 1 && serie.some((v) => v > 0);
    const estilo = grafico || ESTILOS[(Math.max(orden, 1) - 1) % ESTILOS.length];
    const lateral = conProporcion && !conSerie && estilo === 'anillo';
    // Al pasar el mouse el gráfico se vuelve a dibujar (cambiar la clave
    // reinicia sus animaciones).
    const [vuelta, setVuelta] = useState(0);

    return (
        <article
            className={`indicador joya ${tono === 'primary' ? '' : `joya--${tono}`} ${cargando ? 'indicador--cargando' : ''}`}
            style={{ '--orden': orden }}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !cargando) setVuelta((v) => v + 1); }}
        >
            <div className="indicador-cabecera">
                <span className="indicador-icono" aria-hidden="true">{icono}</span>
                <p className="indicador-titulo">{titulo}</p>
            </div>
            <div className="indicador-cuerpo">
                <div className="indicador-texto">
                    {cargando ? (
                        <span className="indicador-esqueleto" aria-hidden="true" />
                    ) : (
                        <div className="indicador-cifras">
                            <p className="indicador-valor">{formatear(cifra, formato)}</p>
                            {conProporcion && (
                                <span key={`p${vuelta}`} className="indicador-porcentaje" title={`${porcentaje} % del total`}>{porcentaje}%</span>
                            )}
                        </div>
                    )}
                    {detalle && <p className="indicador-detalle" title={typeof detalle === 'string' ? detalle : undefined}>{detalle}</p>}
                </div>
                {lateral && !cargando && <div key={`l${vuelta}`} className="indicador-lateral"><Anillo p={proporcion} /></div>}
            </div>
            {!cargando && (conSerie || (conProporcion && !lateral) || composicion?.length > 0) && (
                <div key={`g${vuelta}`} className="indicador-grafico">
                    {conSerie ? <Linea serie={serie} />
                        : conProporcion ? (estilo === 'segmentos' ? <Segmentos p={proporcion} /> : <Escala p={proporcion} />)
                        : <Composicion partes={composicion} />}
                </div>
            )}
            {cargando && <span className="indicador-grafico indicador-grafico--esqueleto" aria-hidden="true" />}
            {cargando && <span className="sr-only">Cargando {titulo}</span>}
        </article>
    );
}
