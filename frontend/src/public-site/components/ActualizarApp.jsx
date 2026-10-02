import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa6';

import qr from '../assets/qr-actualizar.png';
import { DESCARGAS } from '../config/downloads';
import { useVersionApp } from '../hooks/useApiPublica';

export default function ActualizarApp() {
    const { cargando, error, version } = useVersionApp();
    const [params] = useSearchParams();
    const iniciada = useRef(false);
    const desdeQR = params.get('actualizar') === '1';
    const url = version?.apkUrl || DESCARGAS.android.url;

    useEffect(() => {
        if (!desdeQR || !version || iniciada.current) return;
        iniciada.current = true;
        window.location.assign(version.apkUrl);
    }, [desdeQR, version]);

    return (
        <section className="actualizacion-app" aria-labelledby="actualizacion-titulo">
            <div>
                <h2 id="actualizacion-titulo">¿Ya tienes la app en Android?</h2>
                <p>Escanea este QR o pulsa el botón desde tu celular para obtener la última versión.</p>
                <p>Abre el APK y elige <strong>Actualizar</strong>. No necesitas desinstalar la app; conservas tus datos.</p>
                <p className="actualizacion-app__version" role="status">
                    {cargando ? 'Consultando la versión más reciente…'
                        : error ? 'No pudimos consultar la última versión. Puedes descargar la versión publicada en esta página.'
                            : `Versión disponible: ${version.version}`}
                </p>
                {desdeQR && version && <p role="status">La descarga se está abriendo. Si no comienza, pulsa «Actualizar app».</p>}
                <a className="boton boton--linea" href={url} rel="noopener" data-actualizar-app="">
                    <FaDownload aria-hidden="true" /> Actualizar app
                </a>
            </div>
            <img className="actualizacion-app__qr" src={qr}
                alt="Código QR para descargar la actualización más reciente de Librería"
                width="176" height="176" decoding="async" />
        </section>
    );
}
