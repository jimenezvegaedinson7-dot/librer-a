import reposoWebm from '../assets/asistente/anime-reposo.webm';
import reposoMp4 from '../assets/asistente/anime-reposo.mp4';
import pensarWebm from '../assets/asistente/anime-pensar.webm';
import pensarMp4 from '../assets/asistente/anime-pensar.mp4';
import poster from '../assets/asistente/anime-poster.webp';

// ============================================================
// AVATAR DEL ASISTENTE
// Un chico de anime en 3D (modelo CC0 de VRoid, ver
// assets/asistente/CREDITOS.txt) animado como una persona:
//   - reposo: respira, parpadea, mira a los lados, mueve la cabeza,
//     sonríe y saluda con la mano;
//   - pensando: ladea la cabeza, mira hacia arriba y apoya la mano en
//     el mentón.
// Son dos videos cortos en bucle que se cruzan con un fundido. Con
// movimiento reducido se queda la imagen fija.
// ============================================================
const reducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Clip({ webm, mp4, clase, quieto, desde = 0 }) {
    return (
        <video className={`icono-ia__video ${clase}`} poster={poster} muted loop playsInline autoPlay={!quieto} preload={quieto ? 'none' : 'auto'} disablePictureInPicture
            onLoadedMetadata={desde ? (e) => { e.currentTarget.currentTime = desde; } : undefined}>
            <source src={webm} type="video/webm" />
            <source src={mp4} type="video/mp4" />
        </video>
    );
}

// `desde`: segundo en que arranca el reposo (4.4 = justo antes del saludo).
export default function IconoIA({ pensando = false, desde = 0 }) {
    const quieto = reducido();
    return (
        <span className={`icono-ia${pensando ? ' icono-ia--pensando' : ''}`} aria-hidden="true">
            <Clip webm={reposoWebm} mp4={reposoMp4} clase="icono-ia__video--reposo" quieto={quieto} desde={desde} />
            {!quieto && <Clip webm={pensarWebm} mp4={pensarMp4} clase="icono-ia__video--pensar" quieto={quieto} />}
        </span>
    );
}
