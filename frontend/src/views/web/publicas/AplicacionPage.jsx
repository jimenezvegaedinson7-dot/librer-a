import { useOutletContext } from 'react-router-dom';
import Migas from '../../../components/web/Migas';
import MobileExperience from '../../../components/web/secciones/MobileExperience';
import FeatureStory from '../../../components/web/secciones/FeatureStory';

export default function AplicacionPage() {
    const { reducido } = useOutletContext();
    return (
        <>
            <Migas actual="Aplicación" />
            <MobileExperience reducido={reducido} />
            <FeatureStory reducido={reducido} incrustado />
        </>
    );
}
