import { useOutletContext } from 'react-router-dom';
import Migas from '../componentes/Migas';
import MobileExperience from '../secciones/MobileExperience';

export default function AplicacionPage() {
    const { reducido } = useOutletContext();
    return (
        <>
            <Migas actual="Aplicación" />
            <MobileExperience reducido={reducido} />
        </>
    );
}
