import { useOutletContext } from 'react-router-dom';
import Migas from '../componentes/Migas';
import DownloadSection from '../secciones/DownloadSection';

export default function DescargarPage() {
    const { reducido } = useOutletContext();
    return <><Migas actual="Descargar" /><DownloadSection reducido={reducido} /></>;
}
