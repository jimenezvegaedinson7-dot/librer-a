import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useRef, useState } from 'react';

import { animate, useReducedMotion } from 'motion/react';

import { formatearMoneda } from '../../lib/utils/format';

// Fila de indicadores de cada módulo. Diseño propio (distinto al dashboard):
// tarjetas compactas con medidor de proporción en el borde inferior.
// Mientras la página carga, las tarjetas muestran un barrido de luz y el
// medidor en espera; al llegar los datos, la cifra cuenta hasta su valor y el
// medidor se llena con la parte que representa del total.

const ContextoIndicadores = createContext({ cargando: false });

const columnas = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 xl:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 indicadores--cinco',
};

export function Indicadores({ etiqueta, cargando = false, children }) {
    const hijos = Children.toArray(children).filter(isValidElement);

    return (
        <ContextoIndicadores.Provider value={{ cargando }}>
            <section
                aria-label={etiqueta}
                aria-busy={cargando || undefined}
                className={`indicadores grid gap-3 ${columnas[hijos.length] || 'grid-cols-2 xl:grid-cols-4'}`}
            >
                {hijos.map((hijo, orden) => cloneElement(hijo, { orden }))}
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

/**
 * @param {string} tono  primary | success | danger | warning | info | neutral | violet | teal | sky | rose
 * @param {number} [de]  total de referencia: muestra el porcentaje y llena el medidor.
 * @param {'numero'|'moneda'} [formato]
 */
export function Indicador({ titulo, valor, icono, tono = 'neutral', detalle, de, formato = 'numero', orden = 0 }) {
    const { cargando } = useContext(ContextoIndicadores);
    const numero = typeof valor === 'number' ? valor : Number.isFinite(Number(valor)) && valor !== '' && valor !== null ? Number(valor) : null;
    const cifra = useCifraAnimada(numero ?? valor, !cargando);

    const conProporcion = numero !== null && Number(de) > 0;
    const proporcion = conProporcion ? Math.min(1, Math.max(0, numero / Number(de))) : 1;
    const porcentaje = Math.round(proporcion * 100);

    return (
        <article
            className={`indicador indicador--${tono} ${cargando ? 'indicador--cargando' : ''}`}
            style={{ '--orden': orden, '--proporcion': cargando ? 0 : proporcion }}
        >
            <div className="indicador-cabecera">
                <span className="indicador-icono" aria-hidden="true">{icono}</span>
                <p className="indicador-titulo">{titulo}</p>
            </div>
            {cargando ? (
                <span className="indicador-esqueleto" aria-hidden="true" />
            ) : (
                <div className="indicador-cifras">
                    <p className="indicador-valor">{formatear(cifra, formato)}</p>
                    {conProporcion && (
                        <span className="indicador-porcentaje" title={`${porcentaje} % del total`}>{porcentaje}%</span>
                    )}
                </div>
            )}
            {detalle && <p className="indicador-detalle" title={typeof detalle === 'string' ? detalle : undefined}>{detalle}</p>}
            <span className="indicador-medidor" aria-hidden="true"><span /></span>
            {cargando && <span className="sr-only">Cargando {titulo}</span>}
        </article>
    );
}
