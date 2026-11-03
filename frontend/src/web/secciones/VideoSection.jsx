import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa6';
import { useAnuncioActivo } from '../hooks/useApiPublica';
import { useMovimientoReducido } from '../hooks/useEntorno';

const POR_DEFECTO = {
    etiqueta: 'Descubre nuestra librería',
    descripcion: 'Conoce nuestra librería, descubre nuestras colecciones y encuentra historias que pueden acompañarte en cada momento.',
    botonTexto: 'Explorar libros',
    botonEnlace: '/catalogo'
};

export default function VideoSection() {
    const { cargando, anuncio } = useAnuncioActivo();
    const reducido = useMovimientoReducido();
    const [fallo, setFallo] = useState(null);

    if (cargando) return null;

    if (!anuncio?.video_url || fallo === anuncio.video_url) return null;

    const etiqueta = anuncio.etiqueta || POR_DEFECTO.etiqueta;
    const descripcion = anuncio.descripcion || POR_DEFECTO.descripcion;
    const botonTexto = anuncio.boton_texto || POR_DEFECTO.botonTexto;

    const enlace = anuncio.boton_enlace;
    const botonEnlace = enlace && enlace.startsWith('/') && !enlace.startsWith('//') ? enlace : POR_DEFECTO.botonEnlace;

    return (
        <section className="seccion video-destacado" aria-labelledby="video-destacado-titulo" data-reveal="scale">
            <div className="contenedor video-destacado__rejilla">
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
                <div className="video-destacado__texto" data-revelar="">
                    <p className="video-destacado__etiqueta">{etiqueta}</p>
                    <h2 id="video-destacado-titulo" className="video-destacado__titulo">
                        {anuncio.titulo}
                    </h2>
                    <p className="video-destacado__descripcion">{descripcion}</p>
                    <Link to={botonEnlace} className="boton video-destacado__boton">
                        {botonTexto} <FaArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
