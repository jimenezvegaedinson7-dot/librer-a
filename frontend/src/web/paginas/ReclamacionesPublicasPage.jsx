import { TiendaProvider } from '../tienda/TiendaContext';
import LibroReclamacionesPage from '../../panel/reclamaciones/LibroReclamacionesPage';

export default function ReclamacionesPublicasPage() {
    return <TiendaProvider catalogo={{ libros: [], cargando: false }}><LibroReclamacionesPage /></TiendaProvider>;
}
