import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaMagnifyingGlass, FaBook, FaCartShopping, FaHeart, FaReceipt, FaDownload, FaChevronRight } from 'react-icons/fa6';
import imgCatalogo from '../../../assets/web/app/catalogo.webp';
import imgEntrega from '../../../assets/web/app/entrega.webp';
import imgInicio from '../../../assets/web/app/inicio.webp';
import { gsap, useGSAP } from '../animacion/scroll';
import './aplicacion.css';

const FUNCIONES = [
    { Icono: FaMagnifyingGlass, titulo: 'Búsqueda', texto: 'Por título, autor o ISBN, con filtros por categoría.' },
    { Icono: FaBook, titulo: 'Ficha de cada libro', texto: 'Portada, sinopsis, precio y ejemplares disponibles.' },
    { Icono: FaCartShopping, titulo: 'Carrito y pago en línea', texto: 'Pague con PayU y siga sus compras desde la aplicación.' },
    { Icono: FaHeart, titulo: 'Favoritos', texto: 'Guarde los libros que desea leer más adelante.' },
    { Icono: FaReceipt, titulo: 'Mis compras', texto: 'Consulte el estado del pago y siga la entrega de sus pedidos.' }
];

function Telefono({ clase, src, alt }) {
    return (
        <figure className={`telefono telefono--catalogo ${clase}`}>
            <img src={src} alt={alt} width="390" height="844" loading="lazy" decoding="async" />
        </figure>
    );
}

export default function MobileExperience({ reducido }) {
    const seccion = useRef(null);

    useGSAP(
        () => {
            if (reducido) return;

            gsap.from('.app-portada__texto > *', { opacity: 0, y: 24, duration: 0.45, ease: 'expo.out', stagger: 0.05 });
            gsap.from('.telefono--1', {
                y: 30, opacity: 0, duration: 0.7, ease: 'expo.out',
                scrollTrigger: { trigger: seccion.current, start: 'top 72%', once: true }
            });
            gsap.from('.telefono--2', {
                xPercent: 42, y: 46, opacity: 0, duration: 0.85, delay: 0.05, ease: 'expo.out',
                scrollTrigger: { trigger: seccion.current, start: 'top 72%', once: true }
            });
            gsap.from('.telefono--3', {
                xPercent: -42, y: 46, opacity: 0, duration: 0.85, delay: 0.1, ease: 'expo.out',
                scrollTrigger: { trigger: seccion.current, start: 'top 72%', once: true }
            });
        },
        { scope: seccion, dependencies: [reducido] }
    );

    return (
        <div ref={seccion} className="app-pagina">
            <section id="app" className="seccion app app-portada casa-seccion" aria-labelledby="app-titulo">
                <div className="contenedor app__rejilla">
                    <div className="app-portada__texto">
                        <div className="casa-cabecera">
                            <span className="casa-etiqueta">Aplicación</span>
                            <h1 id="app-titulo" className="app-portada__titulo">
                                Toda la librería cabe en la app
                            </h1>
                            <p className="app-portada__entrada">Compre y siga sus pedidos desde su teléfono.</p>
                            <div className="app-portada__acciones casa-acciones">
                                <Link to="/descargar" className="boton">
                                    <FaDownload aria-hidden="true" /> Descargar la app
                                </Link>
                                <Link to="/catalogo" className="enlace-mas">
                                    Ver el catálogo <FaChevronRight aria-hidden="true" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="app__telefonos">
                        <Telefono clase="telefono--2" src={imgInicio} alt="Pantalla de inicio de la app con búsqueda, destacado y categorías" />
                        <Telefono clase="telefono--1" src={imgCatalogo} alt="Catálogo de la app con categorías y libros con precio" />
                        <Telefono clase="telefono--3" src={imgEntrega} alt="Seguimiento de la entrega de un pedido en la app" />
                    </div>
                </div>
            </section>

            <section className="seccion app-funciones-seccion" aria-labelledby="funciones-titulo">
                <div className="contenedor">
                    <div className="casa-cabecera casa-cabecera--compacta">
                        <span className="casa-etiqueta">Lo que incluye</span>
                        <h2 id="funciones-titulo" className="seccion__titulo">
                            Todo lo que puedes hacer
                        </h2>
                        <p className="seccion__entrada">Cada función existe hoy en la app: nada de promesas para más adelante.</p>
                    </div>
                    <ul className="app-funciones app__lista casa-tarjetas">
                        {FUNCIONES.map(({ Icono, titulo, texto }) => (
                            <li key={titulo} className="app-funcion">
                                <span className="app-funcion__icono" aria-hidden="true">
                                    <Icono />
                                </span>
                                <p>
                                    <b>{titulo}</b>
                                    <span>{texto}</span>
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    );
}
