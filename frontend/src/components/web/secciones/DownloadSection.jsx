import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight, FaDownload, FaMobileScreenButton } from 'react-icons/fa6';
import iconoApp from '../../../assets/web/app-icono.webp';
import imgCatalogo from '../../../assets/web/app/catalogo.webp';
import imgEntrega from '../../../assets/web/app/entrega.webp';
import imgInicio from '../../../assets/web/app/inicio.webp';
import { CANALES, DESCARGAS, plataformaDisponible } from '../../../models/config/web/downloads';
import { usePlataforma } from '../../../hooks/web/useEntorno';
import { fechaLarga } from '../../../services/web/formato';
import ActualizarApp from '../ActualizarApp';
import './descargar.css';

const PLATAFORMAS = [
    { clave: 'android', nombre: 'Android' },
    { clave: 'ios', nombre: 'iPhone' }
];

const PASOS_INSTALAR = [
    { titulo: 'Acceder a la descarga', texto: 'Desde un dispositivo Android, seleccione «Descargar para Android» para obtener el archivo APK.' },
    { titulo: 'Autorizar la instalación', texto: 'Android solicitará permiso para instalar aplicaciones desde esta fuente. Confirme el permiso únicamente para este archivo.' },
    { titulo: 'Ingresar a la cuenta', texto: 'Ingrese con su correo, consulte el catálogo y realice su pedido.' }
];

function DownloadCard({ clave, nombre, destacada }) {
    const datos = DESCARGAS[clave];
    const canal = datos && CANALES[datos.tipo];

    if (!datos || !canal) return null;

    const disponible = plataformaDisponible(clave);
    const filas = [
        datos.version && ['Versión', datos.version],
        disponible && ['Formato', canal.formato],
        datos.tamano && ['Tamaño', datos.tamano],
        datos.actualizado && ['Fecha de actualización', fechaLarga(datos.actualizado)]
    ].filter(Boolean);

    return (
        <article className="tarjeta-descarga" data-destacada={destacada} data-disponible={disponible} aria-labelledby={`descarga-${clave}`}>
            {destacada && <span className="tu-equipo">Su equipo</span>}

            <div className="tarjeta-descarga__cabeza">
                <img className="icono-app icono-app--medio" src={iconoApp} alt="" width="56" height="56" />
                <div>
                    <h2 id={`descarga-${clave}`}>{nombre}</h2>
                    <p className="tarjeta-descarga__estado">{disponible ? 'Disponible' : canal.formato}</p>
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

export default function DownloadSection() {
    const plataforma = usePlataforma();
    const visibles = PLATAFORMAS.filter(({ clave }) => DESCARGAS[clave]?.habilitado);
    const android = DESCARGAS.android;
    const androidListo = plataformaDisponible('android');

    return (
        <div id="descargar" className="descargar-pagina">
            <section className="seccion descargar-portada casa-seccion" aria-labelledby="descarga-titulo">
                <div className="contenedor descargar-portada__rejilla">
                    <div className="descargar-portada__texto">
                        <div className="casa-cabecera">
                            <h1 id="descarga-titulo" className="descargar-portada__titulo">
                                Descargue la app
                            </h1>
                            <p className="descargar-portada__entrada">Consulte el catálogo, compre y siga sus pedidos desde su teléfono Android.</p>
                            <div className="descargar-portada__acciones casa-acciones">
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
                    </div>

                    <div className="descargar-portada__telefono">
                        <span className="descargar-portada__estela" aria-hidden="true" />
                        <div className="descargar-portada__telefonos">
                            <figure className="telefono telefono--catalogo telefono--2" aria-hidden="true">
                                <img src={imgInicio} alt="" width="390" height="844" decoding="async" />
                            </figure>
                            <figure className="telefono telefono--catalogo telefono--1" aria-hidden="true">
                                <img src={imgCatalogo} alt="" width="390" height="844" decoding="async" />
                            </figure>
                            <figure className="telefono telefono--catalogo telefono--3" aria-hidden="true">
                                <img src={imgEntrega} alt="" width="390" height="844" decoding="async" />
                            </figure>
                        </div>
                        <p className="descargar-portada__muestra" aria-hidden="true">Vistas de la aplicación</p>
                    </div>
                </div>
            </section>

            <section className="seccion crema descargar-plataformas" aria-labelledby="plataformas-titulo">
                <div className="contenedor">
                    <h2 id="plataformas-titulo" className="seccion__titulo">
                        Disponibilidad por plataforma
                    </h2>

                    <div className="descarga__rejilla casa-tarjetas">
                        {visibles.map((p) => (
                            <DownloadCard key={p.clave} {...p} destacada={plataforma === p.clave} />
                        ))}
                    </div>

                    {androidListo && (
                        <div className="instalar" aria-labelledby="instalar-titulo">
                            <h2 id="instalar-titulo">
                                <FaMobileScreenButton aria-hidden="true" /> Instalación en Android
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