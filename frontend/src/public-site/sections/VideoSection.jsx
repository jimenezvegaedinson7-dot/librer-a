import { useEffect, useState } from 'react';
import { FaPlay } from 'react-icons/fa6';

// ============================================================
// VIDEO DE ANUNCIOS
// Solo el video, a todo el ancho y sobre el fondo normal del sitio.
// Sin título ni texto propio: el video se encarga de decirlo.
//
// Para cambiarlo, deja los archivos en frontend/public/video/:
//   anuncio.mp4          el video
//   anuncio-poster.webp  la miniatura (opcional, sale mejor sin parpadeo)
//
// Si el archivo no está, en su lugar sale un aviso; nunca un
// reproductor roto.
// ============================================================

const VIDEO = '/video/anuncio.mp4';
const POSTER = '/video/anuncio-poster.webp';

export default function VideoSection() {
    const [estado, setEstado] = useState('comprobando');

    // Se pregunta por el archivo antes de montar el reproductor.
    //
    // No basta con mirar el 200: los servidores de desarrollo y algunos
    // hostings responden 200 con el index.html cuando el archivo no existe,
    // así que también se comprueba que la respuesta sea un video.
    useEffect(() => {
        let vivo = true;
        fetch(VIDEO, { method: 'HEAD' })
            .then((r) => {
                const tipo = r.headers.get('content-type') || '';
                if (vivo) setEstado(r.ok && tipo.startsWith('video/') ? 'listo' : 'sin-archivo');
            })
            .catch(() => { if (vivo) setEstado('sin-archivo'); });
        return () => { vivo = false; };
    }, []);

    return (
        // aria-label en vez de aria-labelledby: la sección ya no tiene título.
        <section className="seccion video-destacado" aria-label="Anuncios">
            <div className="contenedor">
                <div className="video-destacado__marco">
                    {estado === 'listo' ? (
                        <video controls playsInline preload="metadata" poster={POSTER} src={VIDEO} />
                    ) : (
                        <div className="video-destacado__vacio" role="status">
                            <FaPlay aria-hidden="true" />
                            <p>
                                {estado === 'comprobando'
                                    ? 'Cargando el video…'
                                    : 'El video llega muy pronto.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
