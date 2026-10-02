import { useRef } from 'react';
import { FaDownload, FaShieldHalved, FaMobileScreenButton, FaCircleCheck } from 'react-icons/fa6';

import iconoApp from '../assets/app-icono.webp';
import imgInicio from '../assets/app/inicio.webp';
import { CANALES, DESCARGAS, plataformaDisponible } from '../config/downloads';
import { usePlataforma } from '../hooks/useEntorno';
import { fechaLarga } from '../lib/formato';
import { gsap, useGSAP } from '../animation/scroll';
import ActualizarApp from '../components/ActualizarApp';
import './aplicacion.css';
import './descargar.css';

// ============================================================
// DESCARGAR
// Portada con el icono real de la app y la descarga principal; tarjetas por
// plataforma (con el icono de la app, no el del sistema); cómo instalar el
// APK y la actualización con QR. Versión, tamaño y fecha vienen de
// config/downloads.js: nada se escribe a mano aquí.
// ============================================================

const PLATAFORMAS = [
    { clave: 'android', nombre: 'Android' },
    { clave: 'ios', nombre: 'iPhone' },
];

const PASOS_INSTALAR = [
    { titulo: 'Descarga el archivo', texto: 'Pulsa «Descargar para Android» desde tu celular. El archivo se guarda en tu carpeta de descargas.' },
    { titulo: 'Permite la instalación', texto: 'Al abrirlo, Android te pedirá permitir instalar apps desde esta fuente. Acepta solo para este archivo.' },
    { titulo: 'Abre y crea tu cuenta', texto: 'Entra con tu correo, explora el catálogo y haz tu primer pedido.' },
];

function DownloadCard({ clave, nombre, destacada }) {
    const datos = DESCARGAS[clave];
    const canal = CANALES[datos.tipo];
    const disponible = plataformaDisponible(clave);
    const filas = [
        datos.version && ['Versión', datos.version],
        disponible && ['Formato', canal.formato],
        datos.tamano && ['Tamaño', datos.tamano],
        datos.actualizado && ['Actualizada', fechaLarga(datos.actualizado)],
    ].filter(Boolean);

    return (
        <article className="tarjeta-descarga" data-destacada={destacada} data-disponible={disponible} aria-labelledby={`descarga-${clave}`}>
            {destacada && <span className="tu-equipo">Tu equipo</span>}
            <div className="tarjeta-descarga__cabeza">
                <img className="icono-app icono-app--medio" src={iconoApp} alt="" width="56" height="56" />
                <div>
                    <h2 id={`descarga-${clave}`}>{nombre}</h2>
                    <p className="tarjeta-descarga__estado">
                        {disponible ? 'Disponible ahora' : canal.formato}
                    </p>
                </div>
            </div>
            {filas.length > 0 && (
                <dl className="ficha-tecnica">
                    {filas.map(([k, v]) => (
                        <div key={k} style={{ display: 'contents' }}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {canal.nota && <p className="tarjeta-descarga__nota">{canal.nota}</p>}
            {disponible && (
                <a className="boton" style={{ marginTop: 'auto' }} href={datos.url} rel="noopener" data-descarga={clave}>
                    <FaDownload aria-hidden="true" /> {canal.accion}
                </a>
            )}
        </article>
    );
}

export default function DownloadSection({ reducido }) {
    const seccion = useRef(null);
    const plataforma = usePlataforma();
    const visibles = PLATAFORMAS.filter(({ clave }) => DESCARGAS[clave]?.habilitado);
    const android = DESCARGAS.android;
    const androidListo = plataformaDisponible('android');

    useGSAP(() => {
        if (reducido) return;
        gsap.from('.descargar-portada__texto > *', { opacity: 0, y: 24, duration: 0.9, ease: 'expo.out', stagger: 0.08 });
        gsap.from('.descargar-portada__telefono', { opacity: 0, y: 60, rotate: 6, duration: 1.2, ease: 'expo.out', delay: 0.15 });
        gsap.from('.tarjeta-descarga', {
            y: 48,
            opacity: 0,
            duration: 1.1,
            ease: 'expo.out',
            stagger: 0.12,
            scrollTrigger: { trigger: '.descarga__rejilla', start: 'top 82%' },
        });
        gsap.from('.instalar__paso', {
            y: 30,
            opacity: 0,
            duration: 0.9,
            ease: 'expo.out',
            stagger: 0.1,
            scrollTrigger: { trigger: '.instalar', start: 'top 82%' },
        });
    }, { scope: seccion, dependencies: [reducido] });

    return (
        <div id="descargar" ref={seccion} className="descargar-pagina">
            <section className="seccion oscuro descargar-portada" aria-labelledby="descarga-titulo">
                <div className="contenedor descargar-portada__rejilla">
                    <div className="descargar-portada__texto">
                        <img className="icono-app icono-app--grande" src={iconoApp} alt="Icono de la app Librería del Saber" width="88" height="88" />
                        <h1 id="descarga-titulo" className="descargar-portada__titulo">Descarga la app</h1>
                        <p className="descargar-portada__entrada">
                            Gratis. Con ella exploras el catálogo, compras con PayU y sigues tus pedidos y reservas.
                        </p>
                        {androidListo && (
                            <ul className="descargar-portada__datos" aria-label="Datos de la versión para Android">
                                <li><FaCircleCheck aria-hidden="true" /> Gratis</li>
                                {android.version && <li>Versión {android.version}</li>}
                                {android.tamano && <li>{android.tamano}</li>}
                                {android.actualizado && <li>Actualizada el {fechaLarga(android.actualizado)}</li>}
                            </ul>
                        )}
                        {androidListo && (
                            <a className="boton boton--grande" href={android.url} rel="noopener">
                                <FaDownload aria-hidden="true" /> {CANALES[android.tipo].accion}
                            </a>
                        )}
                        <p className="descargar-portada__seguridad">
                            <FaShieldHalved aria-hidden="true" /> Archivo firmado por Librería del Saber. Tus pagos se hacen en PayU.
                        </p>
                    </div>
                    <div className="descargar-portada__telefono" aria-hidden="true">
                        <figure className="telefono">
                            <img src={imgInicio} alt="" width="390" height="844" decoding="async" />
                        </figure>
                    </div>
                </div>
            </section>

            <section className="seccion crema descargar-plataformas" aria-labelledby="plataformas-titulo">
                <div className="contenedor">
                    <h2 id="plataformas-titulo" className="seccion__titulo">Elige tu teléfono</h2>
                    <div className="descarga__rejilla">
                        {visibles.map((p) => (
                            <DownloadCard key={p.clave} {...p} destacada={plataforma === p.clave} />
                        ))}
                    </div>

                    {androidListo && (
                        <div className="instalar" aria-labelledby="instalar-titulo">
                            <h2 id="instalar-titulo"><FaMobileScreenButton aria-hidden="true" /> Cómo instalarla en Android</h2>
                            <ol className="instalar__pasos">
                                {PASOS_INSTALAR.map(({ titulo, texto }, i) => (
                                    <li key={titulo} className="instalar__paso">
                                        <span className="instalar__numero" aria-hidden="true">{i + 1}</span>
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
