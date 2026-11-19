import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa6';
import qr from '../../assets/web/qr-actualizar.png';
import { DESCARGAS } from '../../models/config/web/downloads';
import { useVersionApp } from '../../hooks/web/useApiPublica';

export default function ActualizarApp() {
    const { cargando, error, version } = useVersionApp();
    const [params] = useSearchParams();
    const iniciada = useRef(false);

    const desdeQR = params.get('actualizar') === '1';
    const url = version?.apkUrl || DESCARGAS.android.url;

    useEffect(() => {
        if (!desdeQR || !version?.apkUrl || iniciada.current) return;
        iniciada.current = true;
        window.location.assign(version.apkUrl);
    }, [desdeQR, version]);

    let mensajeVersion;
    if (cargando) {
        mensajeVersion = 'Consultando la versión disponible…';
    } else if (error || !version) {
        mensajeVersion = 'No fue posible consultar la versión más reciente. Puede descargar la versión publicada en esta página.';
    } else {
        mensajeVersion = `Versión disponible: ${version.version}`;
    }

    return (
        <section className="actualizacion-app" aria-labelledby="actualizacion-titulo">
            <div className="actualizacion-app__contenido">
                <h2 id="actualizacion-titulo">¿Ya tiene la aplicación en Android?</h2>
                <p>Escanee el código QR o utilice el botón desde su dispositivo para obtener la versión más reciente.</p>
                <p>
                    Abra el archivo APK y seleccione <strong>Actualizar</strong>. No es necesario desinstalar la aplicación; sus datos se conservan.
                </p>

                <p className="actualizacion-app__version" role="status" aria-live="polite">
                    {mensajeVersion}
                </p>

                {desdeQR && version?.apkUrl && (
                    <p role="status" aria-live="polite">
                        La descarga se está abriendo. Si no inicia, utilice «Actualizar aplicación».
                    </p>
                )}

                <a className="boton boton--linea" href={url} rel="noopener" data-actualizar-app="">
                    <FaDownload aria-hidden="true" /> Actualizar aplicación
                </a>
            </div>

            <img
                className="actualizacion-app__qr"
                src={qr}
                alt="Código QR para descargar la actualización más reciente de MATIDANA Libros y Cultura"
                width="176"
                height="176"
                decoding="async"
            />
        </section>
    );
}