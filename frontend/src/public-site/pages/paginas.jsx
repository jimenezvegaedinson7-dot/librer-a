import { useOutletContext } from 'react-router-dom';

import Migas from '../components/Migas';
import Hero from '../sections/Hero';
import BookShowcase from '../sections/BookShowcase';
import Promos from '../sections/Promos';
import VideoSection from '../sections/VideoSection';
import MobileExperience from '../sections/MobileExperience';
import FeatureStory from '../sections/FeatureStory';
import DownloadSection from '../sections/DownloadSection';
import AboutSection from '../sections/AboutSection';

// Cada entrada del menú es una página propia; comparten cabecera, pie,
// y scroll suave desde PublicLayout.

export function InicioPage() {
    const { reducido, catalogo } = useOutletContext();
    return (
        <>
            <Hero reducido={reducido} />
            <BookShowcase catalogo={catalogo} reducido={reducido} />
            <VideoSection />
            <Promos />
        </>
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
