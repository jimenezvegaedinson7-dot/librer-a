import { useOutletContext } from 'react-router-dom';

import PortadaDiferida from '../secciones/PortadaDiferida';
import BookShowcase from '../secciones/BookShowcase';
import VideoSection from '../secciones/VideoSection';
import ExplorarCategorias from '../secciones/ExplorarCategorias';
import ComoComprar from '../secciones/ComoComprar';
import BandaCatalogo from '../secciones/BandaCatalogo';
import OfertasDestacadas from '../secciones/OfertasDestacadas';

// Cada entrada del menú es una página propia; comparten cabecera, pie,
// y navegación nativa desde PublicLayout.

export function InicioPage() {
    const { reducido, catalogo } = useOutletContext();
    return (
        <div>
            <PortadaDiferida reducido={reducido} catalogo={catalogo} />
            <ExplorarCategorias catalogo={catalogo} />
            <BookShowcase catalogo={catalogo} reducido={reducido} />
            <OfertasDestacadas catalogo={catalogo} />
            <BandaCatalogo />
            <VideoSection />
            <ComoComprar />
        </div>
    );
}
