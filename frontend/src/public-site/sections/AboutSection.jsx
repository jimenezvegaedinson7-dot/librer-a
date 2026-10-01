import { useRef } from 'react';

import { FaDiamondTurnRight, FaLocationDot } from 'react-icons/fa6';

import { SITIO, UBICACION_TIENDA } from '../config/site';
import { gsap, useGSAP } from '../animation/scroll';

const CITA = 'Somos una librería con tienda frente a la Plaza de Armas de Pallasca, en Áncash. Con la app, nuestro catálogo llega a lectores de todo el Perú.';

export default function AboutSection({ legal, reducido }) {
    const seccion = useRef(null);
    const palabras = CITA.split(' ');

    // Las palabras se "leen" a medida que la sección avanza.
    useGSAP(() => {
        const nodos = seccion.current.querySelectorAll('.palabra');
        if (reducido) {
            nodos.forEach((n) => n.setAttribute('data-leida', 'true'));
            return;
        }
        const lectura = { avance: 0 };
        gsap.to(lectura, {
            avance: 1,
            duration: 1.8,
            ease: 'power1.inOut',
            scrollTrigger: { trigger: '.nosotros__cita', start: 'top 85%' },
            onUpdate: () => {
                const hasta = Math.round(lectura.avance * nodos.length);
                nodos.forEach((n, i) => n.setAttribute('data-leida', i < hasta ? 'true' : 'false'));
            },
        });
    }, { scope: seccion, dependencies: [reducido] });

    return (
        <section id="nosotros" ref={seccion} className="seccion" aria-labelledby="nosotros-titulo">
            <div className="contenedor">
                <h1 id="nosotros-titulo" className="seccion__titulo">Nosotros</h1>
                <p className="nosotros__cita">
                    <span className="visualmente-oculto">{CITA}</span>
                    <span aria-hidden="true">
                        {palabras.map((p, i) => (
                            <span key={i} className="palabra">{p}{i < palabras.length - 1 ? ' ' : ''}</span>
                        ))}
                    </span>
                </p>
                <div className="nosotros__datos">
                    <div>
                        <h2>Entregas</h2>
                        <p>A domicilio en Lima, con tarifa por distrito. Recojo en la tienda de Pallasca sin costo de envío.</p>
                    </div>
                    <div>
                        <h2>Reclamos</h2>
                        <p>
                            Si algo no salió bien, regístralo en nuestro{' '}
                            <a className="subrayado enlace-texto" href={SITIO.rutaReclamaciones}>Libro de Reclamaciones</a>.
                        </p>
                    </div>
                </div>

                <div id="tienda" className="tienda">
                    <div className="tienda__texto">
                        <h2>Nuestra tienda</h2>
                        <p className="tienda__direccion">
                            <FaLocationDot aria-hidden="true" />
                            <span>{legal.direccion}</span>
                        </p>
                        <p className="tienda__nota">Aquí recoges sin costo de envío los pedidos hechos en la app.</p>
                        <a className="boton boton--chico" href={UBICACION_TIENDA.comoLlegar} target="_blank" rel="noopener noreferrer">
                            <FaDiamondTurnRight aria-hidden="true" /> Cómo llegar
                        </a>
                    </div>
                    <div className="tienda__mapa">
                        <iframe
                            title="Mapa de la ubicación de la tienda en la Plaza de Armas de Pallasca"
                            src={UBICACION_TIENDA.mapa}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
