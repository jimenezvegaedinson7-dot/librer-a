import { useOutletContext } from 'react-router-dom';
import Migas from '../../../components/web/Migas';
import FeatureStory from '../../../components/web/secciones/FeatureStory';

export default function CaracteristicasPage() {
    const { reducido } = useOutletContext();
    return (
        <>
            <Migas actual="Características" />
            <FeatureStory reducido={reducido} />
        </>
    );
}
