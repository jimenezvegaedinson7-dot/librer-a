import { useOutletContext } from 'react-router-dom';

import Migas from '../componentes/Migas';
import PortadaEspacial from '../secciones/portada3d/PortadaEspacial';
import BookShowcase from '../secciones/BookShowcase';
import VideoSection from '../secciones/VideoSection';
import ExplorarCategorias from '../secciones/ExplorarCategorias';
import ComoComprar from '../secciones/ComoComprar';
import BandaCatalogo from '../secciones/BandaCatalogo';
import OfertasDestacadas from '../secciones/OfertasDestacadas';
import MobileExperience from '../secciones/MobileExperience';
import FeatureStory from '../secciones/FeatureStory';
import DownloadSection from '../secciones/DownloadSection';
import AboutSection from '../secciones/AboutSection';

// Cada entrada del menú es una página propia; comparten cabecera, pie,
// y scroll suave desde PublicLayout.

export function InicioPage() {
    const { reducido, catalogo } = useOutletContext();
    return (
        <div>
            {/* Portada 3D: un libro real del catálogo y, al final, los últimos
                libros agregados. Luego da paso a las categorías y al catálogo. */}
            <PortadaEspacial reducido={reducido} catalogo={catalogo} />
            <ExplorarCategorias catalogo={catalogo} />
            <BookShowcase catalogo={catalogo} reducido={reducido} />
            <OfertasDestacadas catalogo={catalogo} />
            <BandaCatalogo />
            <VideoSection />
            <ComoComprar />
        </div>
    );
}

export function AplicacionPage() {
    const { reducido } = useOutletContext();
    return (
        <>
            <Migas actual="Aplicación" />
            <MobileExperience reducido={reducido} />
        </>
    );
}

export function CaracteristicasPage() {
    const { reducido } = useOutletContext();
    return (
        <>
            <Migas actual="Características" />
            <FeatureStory reducido={reducido} />
        </>
    );
}

export function NosotrosPage() {
    const { reducido, legal } = useOutletContext();
    return (
        <>
            <Migas actual="Nosotros" />
            <AboutSection legal={legal} reducido={reducido} />
        </>
    );
}

export function DescargarPage() {
    const { reducido } = useOutletContext();
    return (
        <>
            <Migas actual="Descargar" />
            <DownloadSection reducido={reducido} />
        </>
    );
}
