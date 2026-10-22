import { useRef } from 'react';
import {
    FaBook, FaDiamondTurnRight, FaLocationDot, FaShieldHalved,
    FaStore, FaTruckFast,
} from 'react-icons/fa6';

import { UBICACION_TIENDA } from '../config/site';
import { gsap, useGSAP } from '../animacion/scroll';
import './nosotros.css';

// ============================================================
// NOSOTROS
// Información de la librería y la tienda con su mapa. Todo lo que se
// afirma aquí es real: tienda y delivery en Pallasca, PayU y la app.
// ============================================================

const PILARES = [
    {
        Icono: FaBook,
        titulo: 'Libros físicos disponibles en tienda',
        texto: 'Cada título del catálogo corresponde a un libro disponible en nuestra librería, con su portada, su precio en soles y su stock actualizado.',
    },
    {
        Icono: FaTruckFast,
        titulo: 'Delivery dentro de Pallasca',
        texto: 'Realizamos entregas en cualquier dirección de la ciudad de Pallasca con una tarifa única por pedido, informada antes del pago.',
    },
    {
        Icono: FaStore,
        titulo: 'Recojo gratuito en Pallasca',
        texto: 'Si se encuentra cerca de la librería, puede recoger su pedido en el local frente a la Plaza de Armas, sin costo de envío.',
    },
    {
        Icono: FaShieldHalved,
        titulo: 'Pago seguro con PayU',
        texto: 'El pago se completa en la ventana segura de PayU: los datos de su tarjeta nunca se procesan en nuestros servidores.',
    },
];

export default function AboutSection({ reducido }) {
    const seccion = useRef(null);
    useGSAP(() => {
        if (reducido) return;
        gsap.from('.nosotros-pilar', {
            opacity: 0,
            y: 16,
            duration: 0.45,
            ease: 'expo.out',
            stagger: 0.05,
            scrollTrigger: { trigger: '.nosotros-pilares', start: 'top 82%' },
        });
        gsap.from('.nosotros-tienda__tarjeta', {
            opacity: 0,
            x: -16,
            duration: 0.45,
            ease: 'expo.out',
            scrollTrigger: { trigger: '.nosotros-tienda', start: 'top 75%' },
        });
    }, { scope: seccion, dependencies: [reducido] });

    return (
        <div id="nosotros" ref={seccion} className="nosotros">
            {/* Lo que nos define. */}
            <section className="seccion nosotros-valores" aria-labelledby="valores-titulo">
                <div className="contenedor">
                    <div className="nosotros-valores__cabeza">
                        <h1 id="valores-titulo" className="seccion__titulo">Una librería de barrio, abierta a todo el Perú</h1>
                        <p className="seccion__entrada">
                            Contamos con una tienda en la Plaza de Armas de Pallasca y el mismo catálogo está
                            disponible en su teléfono: consulte los títulos, realice el pago en línea con PayU y elija
                            entre la entrega en la ciudad o el recojo gratuito en el local.
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
                            <span>{UBICACION_TIENDA.consulta}</span>
                        </p>
                        <p className="tienda__nota">
                            Aquí puede recoger sin costo de envío los pedidos realizados en la aplicación. Seleccione
                            «Recojo en Pallasca» al momento del pago.
                        </p>
                        <a className="boton" href={UBICACION_TIENDA.comoLlegar} target="_blank" rel="noopener noreferrer">
                            <FaDiamondTurnRight aria-hidden="true" /> Cómo llegar
                        </a>
                    </div>
                </div>
            </section>

        </div>
    );
}
