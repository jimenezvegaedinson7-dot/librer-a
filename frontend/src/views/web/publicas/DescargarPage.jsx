import { useOutletContext } from 'react-router-dom';
import Migas from '../../../components/web/Migas';
import DownloadSection from '../../../components/web/secciones/DownloadSection';

export default function DescargarPage() {
    const { reducido } = useOutletContext();
    return (
        <>
            <Migas actual="Descargar" />
            <DownloadSection reducido={reducido} />
        </>
    );
}
