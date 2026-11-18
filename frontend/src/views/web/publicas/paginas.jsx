import { useOutletContext } from 'react-router-dom';
import PortadaDiferida from '../../../components/web/secciones/PortadaDiferida';
import BookShowcase from '../../../components/web/secciones/BookShowcase';
import VideoSection from '../../../components/web/secciones/VideoSection';
import ExplorarCategorias from '../../../components/web/secciones/ExplorarCategorias';
import ComoComprar from '../../../components/web/secciones/ComoComprar';
import OfertasDestacadas from '../../../components/web/secciones/OfertasDestacadas';

export function InicioPage() {
    const { reducido, catalogo } = useOutletContext();
    return (
        <div>
            <PortadaDiferida reducido={reducido} catalogo={catalogo} />
            <ExplorarCategorias catalogo={catalogo} />
            <BookShowcase catalogo={catalogo} reducido={reducido} />
            <OfertasDestacadas catalogo={catalogo} />
            <VideoSection />
            <ComoComprar />
        </div>
    );
}
