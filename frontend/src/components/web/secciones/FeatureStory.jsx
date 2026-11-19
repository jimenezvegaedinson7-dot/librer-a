import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { FaTruckFast, FaStore, FaLock, FaShieldHalved, FaCartShopping, FaReceipt, FaHeart, FaClockRotateLeft, FaUserShield, FaCircleCheck, FaDownload } from 'react-icons/fa6';
import imgEntrega from '../../../assets/web/app/entrega.webp';
import { EASE } from '../../../models/config/web/motion';
import { DIRECCION_RECOJO } from '../../../models/config/web/site';
import { gsap, useGSAP } from '../animacion/scroll';
import CierreDescarga from '../CierreDescarga';

const OPCIONES = {
    domicilio: {
        Icono: FaTruckFast,
        titulo: 'Delivery dentro de Pallasca',
        detalle: 'Tarifa única por pedido',
        resultado: 'Mismo precio en toda la ciudad de Pallasca. No incluye anexos ni otros distritos.'
    },
    tienda: { Icono: FaStore, titulo: 'Recojo en Pallasca', detalle: 'Sin costo de envío', resultado: `Recogida sin costo en ${DIRECCION_RECOJO}.` }
};

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
                            onKeyDown={mover}>
                            <span className="opcion-entrega__icono">
                                <Icono aria-hidden="true" />
                            </span>
                            <span>
                                <b>{titulo}</b>
                                <small>{detalle}</small>
                            </span>
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
                        transition={{ duration: 0.3, ease: EASE.salida }}>
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

export default function FeatureStory({ reducido, incrustado = false }) {
    const seccion = useRef(null);
    const Titulo = incrustado ? 'h2' : 'h1';

    useGSAP(
        () => {
            if (reducido) return;
            gsap.utils.toArray('.ventaja').forEach((bloque) => {
                gsap.from(bloque.querySelectorAll('.ventaja__texto, .ventaja__visual'), {
                    opacity: 0,
                    y: 32,
                    duration: 0.45,
                    ease: 'expo.out',
                    stagger: 0.05,
                    scrollTrigger: { trigger: bloque, start: 'top 80%' }
                });
            });
        },
        { scope: seccion, dependencies: [reducido] }
    );

    return (
        <section id="ventajas" ref={seccion} className="seccion crema casa-seccion" aria-labelledby="ventajas-titulo">
            <div className="contenedor">
                <div className="casa-cabecera">
                    <span className="casa-etiqueta">La app en detalle</span>
                    <Titulo id="ventajas-titulo" className="seccion__titulo">
                        Comprar un libro, sin vueltas
                    </Titulo>
                    <p className="seccion__entrada">Lo que resuelve la aplicación por usted, de la búsqueda a la entrega.</p>
                    <div className="casa-acciones">
                        <Link to="/descargar" className="boton boton--secundario">
                            <FaDownload aria-hidden="true" /> Descargar la app
                        </Link>
                    </div>
                </div>

                <div className="ventajas__lista casa-tarjetas">
                    <article className="ventaja" data-ventaja="1">
                        <div className="ventaja__texto">
                            <h2>Delivery o recojo en Pallasca</h2>
                            <p>
                                Al finalizar el pedido, elija cómo recibirlo. Dentro de Pallasca realizamos la entrega en su dirección con la tarifa vigente de su zona; si lo
                                prefiere, puede recogerlo en nuestra librería de Pallasca sin costo de envío.
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <div className="ficha" style={{ maxWidth: 440, marginInline: 'auto' }}>
                                <SelectorEntrega />
                                <p className="ficha__pie">Réplica del selector de entrega de la aplicación.</p>
                            </div>
                        </div>
                    </article>

                    <article className="ventaja" data-ventaja="2">
                        <div className="ventaja__texto">
                            <h2>Pago en línea con PayU</h2>
                            <p>
                                Confirme su pedido en la aplicación y el pago se completa en la ventana segura de PayU. En “Mis compras” consulte el estado de cada pago y, si quedó
                                pendiente, podrá continuarlo.
                            </p>
                            <p className="ventaja__detalle">
                                <span>
                                    <FaLock aria-hidden="true" /> Pasarela de PayU
                                </span>
                                <span>
                                    <FaShieldHalved aria-hidden="true" /> Los datos de su tarjeta se ingresan en PayU, no en la aplicación
                                </span>
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <div className="ficha" style={{ maxWidth: 440, marginInline: 'auto' }}>
                                <Recorte src={imgEntrega} alt="Botón Ir al pago seguro y aviso de redirección a PayU en la aplicación" posicion="50% 100%" proporcion="39 / 15" />
                                <p className="ficha__pie">Captura de la aplicación: último paso antes de pagar.</p>
                            </div>
                        </div>
                    </article>

                    <article className="ventaja" data-ventaja="3">
                        <div className="ventaja__texto">
                            <h2>Del carrito a Mis compras</h2>
                            <p>
                                Revise los libros y las cantidades del carrito, elija la entrega y pague con PayU. En Mis compras puede consultar el estado del pago y seguir la
                                entrega de su pedido.
                            </p>
                            <p className="ventaja__detalle">
                                <span>
                                    <FaCartShopping aria-hidden="true" /> Carrito de libros
                                </span>
                                <span>
                                    <FaReceipt aria-hidden="true" /> Estado de sus compras
                                </span>
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <div className="ficha ficha--flujo" style={{ maxWidth: 440, marginInline: 'auto' }}>
                                <ol className="flujo" aria-hidden="true">
                                    <li className="flujo__paso">
                                        <span className="flujo__icono">
                                            <FaCartShopping />
                                        </span>
                                        <span className="flujo__texto">
                                            <b>Carrito</b>
                                            <small>Libros y cantidades</small>
                                        </span>
                                        <FaCircleCheck className="flujo__visto" />
                                    </li>
                                    <li className="flujo__paso">
                                        <span className="flujo__icono">
                                            <FaLock />
                                        </span>
                                        <span className="flujo__texto">
                                            <b>Pago seguro</b>
                                            <small>Ventana de PayU</small>
                                        </span>
                                        <FaCircleCheck className="flujo__visto" />
                                    </li>
                                    <li className="flujo__paso">
                                        <span className="flujo__icono">
                                            <FaReceipt />
                                        </span>
                                        <span className="flujo__texto">
                                            <b>Mis compras</b>
                                            <small>Estado y seguimiento</small>
                                        </span>
                                        <FaCircleCheck className="flujo__visto" />
                                    </li>
                                </ol>
                                <p className="ficha__pie">Recorrido de compra en la aplicación.</p>
                            </div>
                        </div>
                    </article>

                    <article className="ventaja" data-ventaja="4">
                        <div className="ventaja__texto">
                            <h2>Su cuenta, a su manera</h2>
                            <p>Guarde sus favoritos, revise sus compras y proteja su cuenta con la verificación en dos pasos.</p>
                            <p className="ventaja__detalle">
                                <span>
                                    <FaHeart aria-hidden="true" /> Favoritos
                                </span>
                                <span>
                                    <FaClockRotateLeft aria-hidden="true" /> Mis compras
                                </span>
                                <span>
                                    <FaUserShield aria-hidden="true" /> Verificación en dos pasos
                                </span>
                            </p>
                        </div>
                        <div className="ventaja__visual">
                            <div className="ficha ficha--cuenta" style={{ maxWidth: 440, marginInline: 'auto' }}>
                                <div className="cuenta-demo" aria-hidden="true">
                                    <span className="cuenta-demo__avatar">M</span>
                                    <span className="cuenta-demo__datos">
                                        <b>Su cuenta</b>
                                        <small>Cliente de MATIDANA</small>
                                    </span>
                                    <span className="cuenta-demo__sello">
                                        <FaUserShield /> Protegida
                                    </span>
                                </div>
                                <ul className="cuenta-demo__lista" aria-hidden="true">
                                    <li>
                                        <FaHeart />
                                        <span>
                                            <b>Favoritos</b>
                                            <small>Lecturas guardadas</small>
                                        </span>
                                    </li>
                                    <li>
                                        <FaClockRotateLeft />
                                        <span>
                                            <b>Mis compras</b>
                                            <small>Historial y seguimiento</small>
                                        </span>
                                    </li>
                                    <li>
                                        <FaUserShield />
                                        <span>
                                            <b>Verificación en dos pasos</b>
                                            <small>Activa</small>
                                        </span>
                                    </li>
                                </ul>
                                <p className="ficha__pie">Vista de referencia de la cuenta en la aplicación.</p>
                            </div>
                        </div>
                    </article>
                </div>
                <CierreDescarga texto="Todo esto ya funciona en la aplicación. Es gratuito y está disponible para Android." />
            </div>
        </section>
    );
}
