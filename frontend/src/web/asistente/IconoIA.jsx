import reposoWebm from '../assets/asistente/anime-reposo.webm';
import reposoMp4 from '../assets/asistente/anime-reposo.mp4';
import pensarWebm from '../assets/asistente/anime-pensar.webm';
import pensarMp4 from '../assets/asistente/anime-pensar.mp4';
import poster from '../assets/asistente/anime-poster.webp';

const reducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Clip({ webm, mp4, clase, quieto, desde = 0 }) {
    return (
        <video
            className={`icono-ia__video ${clase}`}
            poster={poster}
            muted
            loop
            playsInline
            autoPlay={!quieto}
            preload={quieto ? 'none' : 'auto'}
            disablePictureInPicture
            onLoadedMetadata={
                desde
                    ? (e) => {
                          e.currentTarget.currentTime = desde;
                      }
                    : undefined
            }>
            <source src={webm} type="video/webm" />
            <source src={mp4} type="video/mp4" />
        </video>
    );
}

export default function IconoIA({ pensando = false, desde = 0 }) {
    const quieto = reducido();
    return (
        <span className={`icono-ia${pensando ? ' icono-ia--pensando' : ''}`} aria-hidden="true">
            <Clip webm={reposoWebm} mp4={reposoMp4} clase="icono-ia__video--reposo" quieto={quieto} desde={desde} />
            {!quieto && <Clip webm={pensarWebm} mp4={pensarMp4} clase="icono-ia__video--pensar" quieto={quieto} />}
        </span>
    );
}
