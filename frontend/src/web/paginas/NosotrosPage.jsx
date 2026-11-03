import { useOutletContext } from 'react-router-dom';
import Migas from '../componentes/Migas';
import AboutSection from '../secciones/AboutSection';

export default function NosotrosPage() {
    const { reducido, legal } = useOutletContext();
    return (
        <>
            <Migas actual="Nosotros" />
            <AboutSection legal={legal} reducido={reducido} />
        </>
    );
}
