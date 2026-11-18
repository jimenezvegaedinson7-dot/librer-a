import { Fragment, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight, FaDownload, FaMobileScreenButton } from 'react-icons/fa6';
import iconoApp from '../../../assets/web/app-icono.webp';
import imgFavoritos from '../../../assets/web/app/favoritos.webp';
import imgPerfilCielo from '../../../assets/web/app/perfil-cielo.webp';
import imgComprasMenta from '../../../assets/web/app/compras-menta.webp';
import { CANALES, DESCARGAS, plataformaDisponible } from '../../../models/config/web/downloads';
import { usePlataforma } from '../../../hooks/web/useEntorno';
import { fechaLarga } from '../../../services/web/formato';
import { gsap, useGSAP } from '../animacion/scroll';
import ActualizarApp from '../ActualizarApp';
import './aplicacion.css';
import './descargar.css';

const PLATAFORMAS = [
    { clave: 'android', nombre: 'Android' },
    { clave: 'ios', nombre: 'iPhone' }
];

const PASOS_INSTALAR = [
    { titulo: 'Abra la página de la app', texto: 'Presione «Descargar para Android» desde su celular. Se abrirá la página oficial de la app, donde podrá bajar el archivo.' },
    { titulo: 'Permita la instalación', texto: 'Al abrirlo, Android solicitará permiso para instalar aplicaciones desde esta fuente. Acepte el permiso solo para este archivo.' },
    { titulo: 'Cree su cuenta', texto: 'Ingrese con su correo, explore el catálogo y realice su primer pedido.' }
];

function DownloadCard({ clave, nombre, destacada }) {
    const datos = DESCARGAS[clave];
    const canal = datos && CANALES[datos.tipo];

    // Si falta la configuración de esta plataforma, no se dibuja la tarjeta
    // (antes, un dato faltante rompía toda la página).
    if (!datos || !canal) return null;

    const disponible = plataformaDisponible(clave);
    const filas = [
        datos.version && ['Versión', datos.version],
        disponible && ['Formato', canal.formato],
        datos.tamano && ['Tamaño', datos.tamano],
        datos.actualizado && ['Actualizada', fechaLarga(datos.actualizado)]
    ].filter(Boolean);

    return (
        <article className="tarjeta-descarga" data-destacada={destacada} data-disponible={disponible} aria-labelledby={`descarga-${clave}`}>
            {destacada && <span className="tu-equipo">Su equipo</span>}

            <div className="tarjeta-descarga__cabeza">
                <img className="icono-app icono-app--medio" src={iconoApp} alt="" width="56" height="56" />
                <div>
                    <h2 id={`descarga-${clave}`}>{nombre}</h2>
                    <p className="tarjeta-descarga__estado">{disponible ? 'Disponible ahora' : canal.formato}</p>
                </div>
            </div>

            {filas.length > 0 && (
                <dl className="ficha-tecnica">
                    {filas.map(([k, v]) => (
                        <Fragment key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                        </Fragment>
                    ))}
                </dl>
            )}

            {canal.nota && <p className="tarjeta-descarga__nota">{canal.nota}</p>}

            {disponible && (
                <a className="boton" href={datos.url} rel="noopener" data-descarga={clave}>
                    <FaDownload aria-hidden="true" /> {canal.accion}
                </a>
            )}
        </article>
    );
}

export default function DownloadSection({ reducido = false }) {
    const seccion = useRef(null);
    const plataforma = usePlataforma();
    const visibles = PLATAFORMAS.filter(({ clave }) => DESCARGAS[clave]?.habilitado);
    const android = DESCARGAS.android;
    const androidListo = plataformaDisponible('android');

    useGSAP(
        () => {
            if (reducido) return;
            // clearProps: al terminar, GSAP limpia los estilos en línea y no interfiere con tu CSS
            gsap.from('.descargar-portada__texto > *', {
                opacity: 0,
                y: 24,
                duration: 0.45,
                ease: 'expo.out',
                stagger: 0.05,
                clearProps: 'opacity,transform'
            });
            gsap.from('.descargar-portada__telefonos .telefono--1', {
                opacity: 0,
                y: 30,
                duration: 0.7,
                ease: 'expo.out',
                clearProps: 'opacity,transform'
            });
            gsap.from('.descargar-portada__telefonos .telefono--2', {
                opacity: 0,
                xPercent: 42,
                y: 44,
                duration: 0.85,
                delay: 0.05,
                ease: 'expo.out',
                clearProps: 'opacity,transform'
            });
            gsap.from('.descargar-portada__telefonos .telefono--3', {
                opacity: 0,
                xPercent: -42,
                y: 44,
                duration: 0.85,
                delay: 0.1,
                ease: 'expo.out',
                clearProps: 'opacity,transform'
            });
        },
        { scope: seccion, dependencies: [reducido] }
    );

    return (
        <div id="descargar" ref={seccion} className="descargar-pagina">
            <section className="seccion descargar-portada" aria-labelledby="descarga-titulo">
                <div className="contenedor descargar-portada__rejilla">
                    <div className="descargar-portada__texto">
                        <span className="descargar-portada__sello">Aplicación para Android</span>
                        <h1 id="descarga-titulo" className="descargar-portada__titulo">
                            Descargue la app
                        </h1>
                        <p className="descargar-portada__entrada">Gratis para Android. Compre y siga sus pedidos desde su teléfono.</p>
                        <div className="descargar-portada__acciones">
                            {androidListo && (
                                <a
                                    className="boton"
                                    href="#plataformas-titulo"
                                    rel="noopener"
                                    data-descarga-pagina="android"
                                >
                                    <FaMobileScreenButton aria-hidden="true" /> {CANALES[android.tipo].accion}
                                </a>
                            )}
                            <Link to="/catalogo" className="enlace-mas">
                                Ver el catálogo <FaChevronRight aria-hidden="true" />
                            </Link>
                        </div>
                    </div>

                    <div className="descargar-portada__telefono">
                        <span className="descargar-portada__estela" aria-hidden="true" />
                        <div className="descargar-portada__telefonos">
                            <figure className="telefono telefono--catalogo telefono--2" aria-hidden="true">
                                <img src={imgPerfilCielo} alt="" width="390" height="844" decoding="async" />
                            </figure>
                            <figure className="telefono telefono--catalogo telefono--1" aria-hidden="true">
                                <img src={imgFavoritos} alt="" width="390" height="844" decoding="async" />
                            </figure>
                            <figure className="telefono telefono--catalogo telefono--3" aria-hidden="true">
                                <img src={imgComprasMenta} alt="" width="390" height="844" decoding="async" />
                            </figure>
                        </div>
                        <p className="descargar-portada__muestra" aria-hidden="true">Personalice los colores de la app</p>
                    </div>
                </div>
            </section>

            <section className="seccion crema descargar-plataformas" aria-labelledby="plataformas-titulo">
                <div className="contenedor">
                    <h2 id="plataformas-titulo" className="seccion__titulo">
                        Elija su teléfono
                    </h2>

                    <div className="descarga__rejilla">
                        {visibles.map((p) => (
                            <DownloadCard key={p.clave} {...p} destacada={plataforma === p.clave} />
                        ))}
                    </div>

                    {androidListo && (
                        <div className="instalar" aria-labelledby="instalar-titulo">
                            <h2 id="instalar-titulo">
                                <FaMobileScreenButton aria-hidden="true" /> Cómo instalarla en Android
                            </h2>
                            <ol className="instalar__pasos">
                                {PASOS_INSTALAR.map(({ titulo, texto }, i) => (
                                    <li key={titulo} className="instalar__paso">
                                        <span className="instalar__numero" aria-hidden="true">
                                            {i + 1}
                                        </span>
                                        <h3>{titulo}</h3>
                                        <p>{texto}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {androidListo && <ActualizarApp />}
                </div>
            </section>
        </div>
    );
}