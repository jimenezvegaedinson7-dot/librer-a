import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FaTruckFast, FaStore, FaLock, FaShieldHalved, FaCalendarCheck, FaXmark, FaHeart, FaClockRotateLeft, FaUserShield } from 'react-icons/fa6';

import imgEntrega from '../assets/app/entrega.webp';
import imgFicha from '../assets/app/ficha-libro.webp';
import { EASE } from '../config/motion';
import { gsap, useGSAP } from '../animation/scroll';
import CierreDescarga from '../components/CierreDescarga';

const OPCIONES = {
    domicilio: {
        Icono: FaTruckFast,
        titulo: 'A domicilio',
        detalle: 'En Lima',
        resultado: 'La tarifa depende de tu distrito y la ves antes de pagar.',
    },
    tienda: {
        Icono: FaStore,
        titulo: 'Recoger en tienda',
        detalle: 'Sin costo de envío',
        resultado: 'Recoges en la tienda de Pallasca, frente a la Plaza de Armas.',
    },
};

// Réplica funcional del selector de entrega de la app.
function SelectorEntrega() {
    const [valor, setValor] = useState('domicilio');
    const claves = Object.keys(OPCIONES);
    const mover = (e) => {
        if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        e.preventDefault();
        const siguiente = claves[(claves.indexOf(valor) + 1) % claves.length];
        setValor(siguiente);
        e.currentTarget.parentElement.querySelector(`[data-valor="${siguiente}"]`)?.focus();
    };
    return (
        <div>
            <div className="selector-entrega" role="radiogroup" aria-label="Tipo de entrega (demostración)">
                {claves.map((clave) => {
                    const { Icono, titulo, detalle } = OPCIONES[clave];
                    const activo = valor === clave;
                    return (
                        <button
                            key={clave}
                            type="button"
                            role="radio"
                            data-valor={clave}
                            aria-checked={activo}
                            tabIndex={activo ? 0 : -1}
                            className="opcion-entrega"
                            onClick={() => setValor(clave)}
                            onKeyDown={mover}
                        >
                            <span className="opcion-entrega__icono"><Icono aria-hidden="true" /></span>
                            <span><b>{titulo}</b><small>{detalle}</small></span>
                            <span className="opcion-entrega__radio" aria-hidden="true" />
                        </button>
                    );
                })}
            </div>
            <p className="selector-entrega__resultado" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={valor}
                        style={{ display: 'inline-block' }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.3, ease: EASE.salida }}
                    >
                        {OPCIONES[valor].resultado}
                    </motion.span>
                </AnimatePresence>
            </p>
        </div>
    );
}

function Recorte({ src, alt, posicion, proporcion }) {
    return (
        <div className="recorte" style={{ aspectRatio: proporcion, maxWidth: 440, marginInline: 'auto' }}>
            <img src={src} alt={alt} loading="lazy" decoding="async" width="390" height="844" style={{ height: '100%', objectFit: 'cover', objectPosition: posicion }} />
        </div>
    );
}

export default function FeatureStory({ reducido }) {
    const seccion = useRef(null);

    // Todos los bloques entran igual que el resto del sitio: suben y aparecen,
    // primero el texto y un instante después su imagen.
    useGSAP(() => {
        if (reducido) return;
        gsap.utils.toArray('.ventaja').forEach((bloque) => {
            gsap.from(bloque.querySelectorAll('.ventaja__texto, .ventaja__visual'), {
                opacity: 0,
                y: 32,
                duration: 1,
                ease: 'expo.out',
                stagger: 0.12,
                scrollTrigger: { trigger: bloque, start: 'top 80%' },
            });
        });
    }, { scope: seccion, dependencies: [reducido] });

    return (
        <section id="ventajas" ref={seccion} className="seccion" aria-labelledby="ventajas-titulo">
                        <div className="contenedor">
                <h1 id="ventajas-titulo" className="seccion__titulo">Comprar un libro, sin vueltas</h1>
                <p className="seccion__entrada">Lo que la app resuelve por ti, de la búsqueda a la entrega.</p>

                <div className="ventajas__lista">
                    <article className="ventaja" data-ventaja="1">
                        <div className="ventaja__texto">
                            <h2>Te lo llevamos en Lima o lo recoges sin costo</h2>
                            <p>
                                Al finalizar el pedido eliges cómo recibirlo. En Lima lo llevamos a tu dirección con la tarifa de
                                tu distrito; si prefieres, lo recoges en nuestra tienda de Pallasca sin pagar envío.
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <div className="ficha" style={{ maxWidth: 500, marginInline: 'auto' }}>
                                <SelectorEntrega />
                                <p className="ficha__pie">Réplica del selector de entrega de la app.</p>
                            </div>
                        </div>
                    </article>

                    <article className="ventaja ventaja--inversa" data-ventaja="2">
                        <div className="ventaja__texto">
                            <h2>Pago en línea con PayU</h2>
                            <p>
                                Confirmas tu pedido en la app y el pago se completa en la ventana de PayU. En “Mis compras” ves el
                                estado de cada pago y, si quedó pendiente, puedes continuarlo.
                            </p>
                            <p className="ventaja__detalle">
                                <span><FaLock aria-hidden="true" /> Pasarela de PayU</span>
                                <span><FaShieldHalved aria-hidden="true" /> Los datos de tu tarjeta se ingresan en PayU, no en la app</span>
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <div className="ficha" style={{ maxWidth: 500, marginInline: 'auto' }}>
                                <Recorte src={imgEntrega} alt="Botón Ir al pago seguro y aviso de redirección a PayU en la app" posicion="50% 100%" proporcion="39 / 15" />
                                <p className="ficha__pie">Captura de la app: último paso antes de pagar.</p>
                            </div>
                        </div>
                    </article>

                    <article className="ventaja" data-ventaja="3">
                        <div className="ventaja__texto">
                            <h2>Resérvalo desde su ficha</h2>
                            <p>
                                ¿Aún no te decides a comprarlo? Apártalo con un toque en “Reservar” y revisa tus reservas cuando
                                quieras. Si cambias de idea, la cancelas desde la app.
                            </p>
                            <p className="ventaja__detalle">
                                <span><FaCalendarCheck aria-hidden="true" /> Mis reservas</span>
                                <span><FaXmark aria-hidden="true" /> Cancelación desde la app</span>
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <div className="ficha" style={{ maxWidth: 500, marginInline: 'auto' }}>
                                <Recorte src={imgFicha} alt="Parte inferior de la ficha de un libro con el total y los botones Reservar y Añadir" posicion="50% 100%" proporcion="16 / 9" />
                                <p className="ficha__pie">Captura de la app: ficha de un libro.</p>
                            </div>
                        </div>
                    </article>

                    <article className="ventaja ventaja--inversa" data-ventaja="4">
                        <div className="ventaja__texto">
                            <h2>Tu cuenta, a tu manera</h2>
                            <p>Guarda favoritos, revisa tus compras y protege tu cuenta con verificación en dos pasos.</p>
                            <p className="ventaja__detalle">
                                <span><FaHeart aria-hidden="true" /> Favoritos</span>
                                <span><FaClockRotateLeft aria-hidden="true" /> Mis compras</span>
                                <span><FaUserShield aria-hidden="true" /> Verificación en dos pasos</span>
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <p className="tipografica" aria-hidden="true" data-revelar="">
                                <span className="linea"><span>Favoritos.</span></span>
                                <span className="linea" style={{ '--i': 1 }}><span>Compras.</span></span>
                                <span className="linea" style={{ '--i': 2 }}><span><em>Tu cuenta.</em></span></span>
                            </p>
                        </div>
                    </article>
                </div>
                <CierreDescarga texto="Todo esto ya está en la app. Es gratis y está disponible para Android." />
            </div>
        </section>
    );
}
