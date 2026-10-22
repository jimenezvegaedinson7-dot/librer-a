import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FaTruckFast, FaStore, FaLock, FaShieldHalved, FaCartShopping, FaReceipt, FaHeart, FaClockRotateLeft, FaUserShield } from 'react-icons/fa6';

import imgEntrega from '../assets/app/entrega.webp';
import { EASE } from '../config/motion';
import { gsap, useGSAP } from '../animacion/scroll';
import CierreDescarga from '../componentes/CierreDescarga';

const OPCIONES = {
    domicilio: {
        Icono: FaTruckFast,
        titulo: 'Delivery dentro de Pallasca',
        detalle: 'Tarifa única por pedido',
        resultado: 'Mismo precio en toda la ciudad de Pallasca. No incluye anexos ni otros distritos.',
    },
    tienda: {
        Icono: FaStore,
        titulo: 'Recojo en Pallasca',
        detalle: 'Sin costo de envío',
        resultado: 'Recogida sin costo en Plaza de Armas, Jr. Marañón 161, Pallasca 02835.',
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
                duration: 0.45,
                ease: 'expo.out',
                stagger: 0.05,
                scrollTrigger: { trigger: bloque, start: 'top 80%' },
            });
        });
    }, { scope: seccion, dependencies: [reducido] });

    return (
        <section id="ventajas" ref={seccion} className="seccion crema" aria-labelledby="ventajas-titulo">
                        <div className="contenedor">
                <h1 id="ventajas-titulo" className="seccion__titulo">Comprar un libro, sin vueltas</h1>
                <p className="seccion__entrada">Lo que resuelve la aplicación por usted, de la búsqueda a la entrega.</p>

                <div className="ventajas__lista">
                    <article className="ventaja" data-ventaja="1">
                        <div className="ventaja__texto">
                            <h2>Delivery o recojo en Pallasca</h2>
                            <p>
                                Al finalizar el pedido, elija cómo recibirlo. Dentro de Pallasca realizamos la entrega en su dirección con la tarifa
                                vigente de su zona; si lo prefiere, puede recogerlo en nuestra librería de Pallasca sin costo de envío.
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <div className="ficha" style={{ maxWidth: 500, marginInline: 'auto' }}>
                                <SelectorEntrega />
                                <p className="ficha__pie">Réplica del selector de entrega de la aplicación.</p>
                            </div>
                        </div>
                    </article>

                    <article className="ventaja ventaja--inversa" data-ventaja="2">
                        <div className="ventaja__texto">
                            <h2>Pago en línea con PayU</h2>
                            <p>
                                Confirme su pedido en la aplicación y el pago se completa en la ventana segura de PayU. En “Mis compras” consulte
                                el estado de cada pago y, si quedó pendiente, podrá continuarlo.
                            </p>
                            <p className="ventaja__detalle">
                                <span><FaLock aria-hidden="true" /> Pasarela de PayU</span>
                                <span><FaShieldHalved aria-hidden="true" /> Los datos de su tarjeta se ingresan en PayU, no en la aplicación</span>
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <div className="ficha" style={{ maxWidth: 500, marginInline: 'auto' }}>
                                <Recorte src={imgEntrega} alt="Botón Ir al pago seguro y aviso de redirección a PayU en la aplicación" posicion="50% 100%" proporcion="39 / 15" />
                                <p className="ficha__pie">Captura de la aplicación: último paso antes de pagar.</p>
                            </div>
                        </div>
                    </article>

                    <article className="ventaja" data-ventaja="3">
                        <div className="ventaja__texto">
                            <h2>Del carrito a Mis compras</h2>
                            <p>
                                Revise los libros y las cantidades del carrito, elija la entrega y pague con PayU.
                                En Mis compras puede consultar el estado del pago y seguir la entrega de su pedido.
                            </p>
                            <p className="ventaja__detalle">
                                <span><FaCartShopping aria-hidden="true" /> Carrito de libros</span>
                                <span><FaReceipt aria-hidden="true" /> Estado de sus compras</span>
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <p className="tipografica" aria-hidden="true" data-revelar="">
                                <span className="linea"><span>Carrito.</span></span>
                                <span className="linea" style={{ '--i': 1 }}><span>Pago seguro.</span></span>
                                <span className="linea" style={{ '--i': 2 }}><span><em>Mis compras.</em></span></span>
                            </p>
                        </div>
                    </article>

                    <article className="ventaja ventaja--inversa" data-ventaja="4">
                        <div className="ventaja__texto">
                            <h2>Su cuenta, a su manera</h2>
                            <p>Guarde sus favoritos, revise sus compras y proteja su cuenta con la verificación en dos pasos.</p>
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
                                <span className="linea" style={{ '--i': 2 }}><span><em>Su cuenta.</em></span></span>
                            </p>
                        </div>
                    </article>
                </div>
                <CierreDescarga texto="Todo esto ya funciona en la aplicación. Es gratuito y está disponible para Android." />
            </div>
        </section>
    );
}
