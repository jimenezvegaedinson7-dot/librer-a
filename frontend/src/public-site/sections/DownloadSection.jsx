import { useRef } from 'react';
import { FaAndroid, FaApple, FaDownload } from 'react-icons/fa6';

import { CANALES, DESCARGAS, plataformaDisponible } from '../config/downloads';
import { usePlataforma } from '../hooks/useEntorno';
import { fechaLarga } from '../lib/formato';
import { gsap, useGSAP } from '../animation/scroll';

const PLATAFORMAS = [
    { clave: 'android', nombre: 'Android', Icono: FaAndroid },
    { clave: 'ios', nombre: 'iPhone', Icono: FaApple },
];

function DownloadCard({ clave, nombre, Icono, destacada }) {
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
        <article className="tarjeta-descarga" data-destacada={destacada} aria-labelledby={`descarga-${clave}`}>
            {destacada && <span className="tu-equipo">Tu equipo</span>}
            <div className="tarjeta-descarga__cabeza">
                <Icono aria-hidden="true" />
                <div>
                    <h2 id={`descarga-${clave}`}>{nombre}</h2>
                    <p className="tarjeta-descarga__estado">{disponible ? 'Disponible' : canal.formato}</p>
                </div>
            </div>
            <dl className="ficha-tecnica">
                {filas.map(([k, v]) => (
                    <div key={k} style={{ display: 'contents' }}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                    </div>
                ))}
            </dl>
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

    useGSAP(() => {
        if (reducido) return;
        gsap.from('.tarjeta-descarga', {
            y: 48,
            opacity: 0,
            duration: 1.1,
            ease: 'expo.out',
            stagger: 0.12,
            scrollTrigger: { trigger: '.descarga__rejilla', start: 'top 82%' },
        });
    }, { scope: seccion, dependencies: [reducido] });

    return (
        <section id="descargar" ref={seccion} className="seccion" aria-labelledby="descarga-titulo">
            <div className="contenedor">
                <h1 id="descarga-titulo" className="seccion__titulo">Descarga la app</h1>
                <p className="seccion__entrada">
                    Gratis. Con ella exploras el catálogo, compras con PayU y sigues tus pedidos y reservas.
                </p>
                <div className="descarga__rejilla">
                    {visibles.map((p) => (
                        <DownloadCard key={p.clave} {...p} destacada={plataforma === p.clave} />
                    ))}
                </div>
            </div>
        </section>
    );
}
