// ============================================================
// FONDO DEL HERO
// Capa 1: fondo_inicio (WebP, con PNG de respaldo). Capa 2: velo que
// sostiene el texto (.hero-fondo::after). Los prismas, esquirlas y el
// cristal difuminado se retiraron: eran diez capas con backdrop-filter
// animadas sin parar y hacían que el inicio se trabara al desplazarse.
// ============================================================

import fondoInicioOriginal from '../../assets/fondo_web/fondo_inicio.png';
import fondoInicioWebp from '../../assets/fondo_web/fondo_inicio.webp';

const FONDO_HERO = `image-set(url(${fondoInicioWebp}) type("image/webp"), url(${fondoInicioOriginal}) type("image/png"))`;

export default function HeroFondo() {
    return <div className="hero-fondo" style={{ '--bg-hero': FONDO_HERO }} aria-hidden="true" />;
}
