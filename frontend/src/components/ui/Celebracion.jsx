import { useEffect, useRef, useState } from 'react';

import { motion, useReducedMotion } from 'motion/react';
import { FaCheck, FaEnvelope } from 'react-icons/fa6';

const LINEAS = 36;
const EASE = [0.25, 1, 0.5, 1];

// Color de cada línea: recorre burdeos → dorado → verde de la marca.
const PALETA = ['#8a2c36', '#a8423c', '#c2780a', '#b98d3e', '#8f9a3a', '#15803d'];
function colorLinea(i) {
    const posicion = (i / (LINEAS - 1)) * (PALETA.length - 1);
    return PALETA[Math.round(posicion)];
}

/**
 * Cargador circular de líneas de colores. Mientras `enviado` es falso las
 * líneas avanzan sin llegar al final; cuando pasa a verdadero terminan de
 * llenarse y aparece "Correo enviado". Llama a `onCompleto` al terminar.
 */
export function CargaCorreo({ enviado = false, onCompleto }) {
    const [progreso, setProgreso] = useState(0);
    const [completo, setCompleto] = useState(false);
    const avisado = useRef(false);
    const alCompletar = useRef(onCompleto);

    useEffect(() => {
        alCompletar.current = onCompleto;
    }, [onCompleto]);

    useEffect(() => {
        const intervalo = setInterval(() => {
            setProgreso((p) => {
                if (enviado) return Math.min(1, p + 0.045);
                return p + (0.82 - p) * 0.06;
            });
        }, enviado ? 22 : 90);
        return () => clearInterval(intervalo);
    }, [enviado]);

    useEffect(() => {
        if (progreso < 1 || avisado.current) return undefined;
        avisado.current = true;
        const t1 = setTimeout(() => setCompleto(true), 120);
        const t2 = setTimeout(() => alCompletar.current?.(), 1500);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [progreso]);

    const encendidas = Math.floor(progreso * LINEAS);

    return (
        <div className="carga-correo" role="status" aria-live="polite">
            <div className="carga-correo-circulo">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                    {Array.from({ length: LINEAS }).map((_, i) => {
                        const angulo = (i / LINEAS) * Math.PI * 2 - Math.PI / 2;
                        const x1 = 60 + Math.cos(angulo) * 40;
                        const y1 = 60 + Math.sin(angulo) * 40;
                        const x2 = 60 + Math.cos(angulo) * 54;
                        const y2 = 60 + Math.sin(angulo) * 54;
                        const encendida = i < encendidas;
                        const punta = i === encendidas - 1 && !completo;
                        return (
                            <line
                                key={i}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={encendida ? colorLinea(i) : '#e6e0d7'}
                                className={`carga-correo-linea ${punta ? 'carga-correo-linea--punta' : ''}`}
                            />
                        );
                    })}
                </svg>

                <motion.span
                    className={`carga-correo-centro ${completo ? 'carga-correo-centro--listo' : ''}`}
                    animate={completo ? { scale: [0.7, 1.12, 1] } : { scale: [1, 1.06, 1] }}
                    transition={completo ? { duration: 0.45, ease: EASE } : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                    {completo ? <FaCheck /> : <FaEnvelope />}
                </motion.span>
            </div>

            <motion.p
                key={completo ? 'listo' : 'enviando'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className={`carga-correo-texto ${completo ? 'carga-correo-texto--listo' : ''}`}
            >
                {completo ? 'Correo enviado' : 'Enviando correo…'}
            </motion.p>
            <p className="carga-correo-porcentaje">{completo ? 'Revisa tu bandeja de entrada' : `${Math.round(progreso * 100)} %`}</p>
        </div>
    );
}

// Destellos dorados que salen del check.
const DESTELLOS = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);

/**
 * Confirmación animada: anillo dorado que se dibuja, disco verde, check
 * trazado, onda expansiva y destellos. Respeta reduced motion.
 */
export function ExitoAnimado({ titulo, detalle, children }) {
    const reducir = useReducedMotion();
    const t = (s) => (reducir ? 0 : s);

    return (
        <div className="exito-animado" role="status" aria-live="polite">
            <div className="exito-animado-sello">
                {!reducir && (
                    <motion.span
                        className="exito-animado-onda"
                        initial={{ scale: 0.6, opacity: 0.55 }}
                        animate={{ scale: 1.9, opacity: 0 }}
                        transition={{ duration: 1.1, delay: 0.55, ease: 'easeOut' }}
                        aria-hidden="true"
                    />
                )}

                <svg viewBox="0 0 100 100" aria-hidden="true">
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="44"
                        className="exito-animado-anillo"
                        initial={{ pathLength: 0, rotate: -90 }}
                        animate={{ pathLength: 1, rotate: -90 }}
                        transition={{ duration: t(0.55), ease: EASE }}
                    />
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="35"
                        className="exito-animado-disco"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={reducir ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 16, delay: 0.3 }}
                        style={{ transformOrigin: '50px 50px' }}
                    />
                    <motion.path
                        d="M33 51 L45 63 L68 39"
                        className="exito-animado-check"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: t(0.35), delay: t(0.55), ease: EASE }}
                    />
                </svg>

                {!reducir && DESTELLOS.map((angulo, i) => (
                    <span
                        key={i}
                        className="exito-animado-eje"
                        style={{ transform: `rotate(${(angulo * 180) / Math.PI}deg)` }}
                        aria-hidden="true"
                    >
                        <motion.span
                            className="exito-animado-destello"
                            initial={{ opacity: 0, scaleY: 0.2, y: -40 }}
                            animate={{ opacity: [0, 1, 0], scaleY: [0.2, 1, 0.4], y: [-40, -58, -66] }}
                            transition={{ duration: 0.7, delay: 0.7 + (i % 2) * 0.06, ease: 'easeOut' }}
                        />
                    </span>
                ))}
            </div>

            <motion.div
                initial={reducir ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: t(0.75), ease: EASE }}
                className="text-center"
            >
                <p className="exito-animado-titulo">{titulo}</p>
                {detalle && <p className="exito-animado-detalle">{detalle}</p>}
                {children}
            </motion.div>
        </div>
    );
}
