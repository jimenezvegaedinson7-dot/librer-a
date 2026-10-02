import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    FaBookOpen, FaDiamondTurnRight, FaDownload, FaLocationDot, FaShieldHalved,
    FaStore, FaTruckFast, FaChevronRight, FaBuilding, FaFileSignature,
} from 'react-icons/fa6';

import HeroFondo from './HeroFondo';
import { SITIO, UBICACION_TIENDA } from '../config/site';
import { gsap, useGSAP } from '../animation/scroll';
import './nosotros.css';

// ============================================================
// NOSOTROS
// Portada con el mismo fondo del inicio (foto, velo y cristal) y el texto
// centrado en la altura; después, lo que nos define, la tienda con su mapa,
// los datos de la empresa y una llamada final a la app. Todo lo que se
// afirma aquí es real: tienda en Pallasca, entrega en Lima, PayU y la app.
// ============================================================

const CITA = 'Somos una librería con tienda frente a la Plaza de Armas de Pallasca, en Áncash. Con la app, nuestro catálogo llega a lectores de todo el Perú.';

const PILARES = [
    {
        Icono: FaBookOpen,
        titulo: 'Libros físicos de verdad',
        texto: 'Cada título del catálogo es un libro que tenemos en tienda, con su portada, su precio en soles y su stock real.',
    },
    {
        Icono: FaTruckFast,
        titulo: 'Entrega a domicilio en Lima',
        texto: 'Te lo llevamos a tu dirección con una tarifa por distrito que ves antes de pagar.',
    },
    {
        Icono: FaStore,
        titulo: 'Recojo gratis en Pallasca',
        texto: 'Si estás cerca, recoges tu pedido en nuestra tienda frente a la Plaza de Armas, sin costo de envío.',
    },
    {
        Icono: FaShieldHalved,
        titulo: 'Pago seguro con PayU',
        texto: 'El pago se completa en la ventana de PayU: los datos de tu tarjeta nunca pasan por nuestra app.',
    },
];

export default function AboutSection({ legal, reducido }) {
    const seccion = useRef(null);
    const palabras = CITA.split(' ');

    // Las palabras de la cita se "leen" al entrar en pantalla.
    useGSAP(() => {
        const nodos = seccion.current.querySelectorAll('.palabra');
        if (reducido) {
            nodos.forEach((n) => n.setAttribute('data-leida', 'true'));
            return;
        }
        const lectura = { avance: 0 };
        gsap.to(lectura, {
            avance: 1,
            duration: 1.6,
            delay: 0.3,
            ease: 'power1.inOut',
            onUpdate: () => {
                const hasta = Math.round(lectura.avance * nodos.length);
                nodos.forEach((n, i) => n.setAttribute('data-leida', i < hasta ? 'true' : 'false'));
            },
        });
        gsap.from('.nosotros-pilar', {
            opacity: 0,
            y: 36,
            duration: 0.9,
            ease: 'expo.out',
            stagger: 0.1,
            scrollTrigger: { trigger: '.nosotros-pilares', start: 'top 82%' },
        });
        gsap.from('.nosotros-tienda__tarjeta', {
            opacity: 0,
            x: -40,
            duration: 1,
            ease: 'expo.out',
            scrollTrigger: { trigger: '.nosotros-tienda', start: 'top 75%' },
        });
    }, { scope: seccion, dependencies: [reducido] });

    return (
        <div id="nosotros" ref={seccion} className="nosotros">
            {/* Portada: el mismo fondo del inicio, texto centrado en la altura. */}
            <section className="seccion hero oscuro nosotros-hero" aria-labelledby="nosotros-titulo">
                <HeroFondo />
                <div className="contenedor nosotros-hero__contenido">
                    <h1 id="nosotros-titulo" className="nosotros-hero__titulo">Nosotros</h1>
                    <p className="nosotros__cita">
                        <span className="visualmente-oculto">{CITA}</span>
                        <span aria-hidden="true">
                            {palabras.map((p, i) => (
                                <span key={i} className="palabra">{p}{i < palabras.length - 1 ? ' ' : ''}</span>
                            ))}
                        </span>
                    </p>
                    <div className="nosotros-hero__acciones">
                        <Link to="/catalogo" className="boton boton--blanco">
                            <FaBookOpen aria-hidden="true" /> Ver el catálogo
                        </Link>
                        <a href="#tienda" className="boton boton--linea">
                            <FaLocationDot aria-hidden="true" /> Visítanos en Pallasca
                        </a>
                    </div>
                </div>
            </section>

            {/* Lo que nos define. */}
            <section className="seccion nosotros-valores" aria-labelledby="valores-titulo">
                <div className="contenedor">
                    <div className="nosotros-valores__cabeza">
                        <h2 id="valores-titulo" className="seccion__titulo">Una librería de barrio, abierta a todo el Perú</h2>
                        <p className="seccion__entrada">
                            Tenemos tienda frente a la plaza de Pallasca y el mismo catálogo cabe en tu teléfono: lo
                            exploras con calma, pagas en línea y eliges si te lo llevamos o lo recoges.
                        </p>
                    </div>
                    <ul className="nosotros-pilares">
                        {PILARES.map(({ Icono, titulo, texto }) => (
                            <li key={titulo} className="nosotros-pilar">
                                <span className="nosotros-pilar__icono" aria-hidden="true"><Icono /></span>
                                <h3>{titulo}</h3>
                                <p>{texto}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* La tienda: tarjeta flotante sobre el mapa. */}
            <section id="tienda" className="seccion nosotros-tienda" aria-labelledby="tienda-titulo">
                <div className="contenedor nosotros-tienda__marco">
                    <div className="tienda__mapa">
                        <iframe
                            title="Mapa de la ubicación de la tienda en la Plaza de Armas de Pallasca"
                            src={UBICACION_TIENDA.mapa}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                        />
                    </div>
                    <div className="nosotros-tienda__tarjeta">
                        <h2 id="tienda-titulo">Nuestra tienda</h2>
                        <p className="tienda__direccion">
                            <FaLocationDot aria-hidden="true" />
                            <span>{legal.direccion}</span>
                        </p>
                        <p className="tienda__nota">
                            Aquí recoges sin costo de envío los pedidos que haces en la app. Elige «Recoger en tienda» al pagar.
                        </p>
                        <a className="boton" href={UBICACION_TIENDA.comoLlegar} target="_blank" rel="noopener noreferrer">
                            <FaDiamondTurnRight aria-hidden="true" /> Cómo llegar
                        </a>
                    </div>
                </div>
            </section>

            {/* Datos de la empresa y atención. */}
            <section className="seccion nosotros-empresa" aria-labelledby="empresa-titulo">
                <div className="contenedor">
                    <h2 id="empresa-titulo" className="visualmente-oculto">Datos de la empresa</h2>
                    <ul className="nosotros-empresa__datos">
                        <li>
                            <FaBuilding aria-hidden="true" />
                            <span>
                                <small>Razón social</small>
                                <strong>{legal.razonSocial}</strong>
                            </span>
                        </li>
                        <li>
                            <FaStore aria-hidden="true" />
                            <span>
                                <small>Nombre comercial</small>
                                <strong>{legal.nombreComercial}</strong>
                            </span>
                        </li>
                        <li>
                            <FaFileSignature aria-hidden="true" />
                            <span>
                                <small>RUC</small>
                                <strong>{legal.ruc}</strong>
                            </span>
                        </li>
                        <li>
                            <FaShieldHalved aria-hidden="true" />
                            <span>
                                <small>¿Algo no salió bien?</small>
                                <a href={SITIO.rutaReclamaciones} className="enlace-texto">Libro de Reclamaciones</a>
                            </span>
                        </li>
                    </ul>
                </div>
            </section>

            {/* Llamada final. */}
            <section className="seccion nosotros-cierre" aria-labelledby="cierre-titulo">
                <div className="contenedor">
                <div className="nosotros-cierre__contenido oscuro">
                    <div>
                        <h2 id="cierre-titulo">Lleva la librería en tu bolsillo</h2>
                        <p>Descarga la app gratis, explora el catálogo completo y recibe tus libros sin salir de casa.</p>
                    </div>
                    <div className="nosotros-cierre__acciones">
                        <Link to="/descargar" className="boton"><FaDownload aria-hidden="true" /> Descargar la app</Link>
                        <Link to="/catalogo" className="enlace-mas">Ver el catálogo <FaChevronRight aria-hidden="true" /></Link>
                    </div>
                </div>
                </div>
            </section>
        </div>
    );
}
