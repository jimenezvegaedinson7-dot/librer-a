import { useOutletContext } from 'react-router-dom';
import Migas from '../../../components/web/Migas';
import AboutSection from '../../../components/web/secciones/AboutSection';

export default function NosotrosPage() {
    const { reducido, legal } = useOutletContext();
    return (
        <>
            <Migas actual="Nosotros" />
            <AboutSection legal={legal} reducido={reducido} />
        </>
    );
}
