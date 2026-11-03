import { useOutletContext } from 'react-router-dom';
import Migas from '../componentes/Migas';
import FeatureStory from '../secciones/FeatureStory';

export default function CaracteristicasPage() {
    const { reducido } = useOutletContext();
    return <><Migas actual="Características" /><FeatureStory reducido={reducido} /></>;
}
