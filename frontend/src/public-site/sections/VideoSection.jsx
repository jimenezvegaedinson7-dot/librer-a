import { useState } from 'react';

import { useAnuncioActivo } from '../hooks/useApiPublica';
import { useMovimientoReducido } from '../hooks/useEntorno';

// ============================================================
// VIDEO DE ANUNCIOS
// Solo el video, a todo el ancho y sobre el fondo normal del sitio.
// Sin título ni texto propio: el video se encarga de decirlo.
//
// Lo sube el administrador desde el panel (Libros > Anuncios). Si no
// hay ninguno activo la sección no se monta: es preferible a dejar un
// hueco vacío en medio de la portada.
// ============================================================

export default function VideoSection() {
    const { cargando, anuncio } = useAnuncioActivo();
    const reducido = useMovimientoReducido();
    const [fallo, setFallo] = useState(null);

    if (cargando) return null;

    if (!anuncio?.video_url || fallo === anuncio.video_url) return null;

    return (
        // aria-label en vez de aria-labelledby: la sección no tiene título.
        <section className="seccion video-destacado" aria-label="Anuncios">
            <div className="contenedor">
                <div className="video-destacado__marco">
                    <video
                        key={anuncio.id_anuncio}
                        controls
                        playsInline
                        muted
                        loop
                        autoPlay={!reducido}
                        preload={reducido ? 'metadata' : 'auto'}
                        onError={() => setFallo(anuncio.video_url)}
                        poster={anuncio.poster_url || undefined}
                        src={anuncio.video_url}
                    />
                </div>
            </div>
        </section>
    );
}
