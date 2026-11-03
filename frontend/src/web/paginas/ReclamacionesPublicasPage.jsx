import { TiendaProvider } from '../tienda/TiendaProvider';
import LibroReclamacionesPage from '../../panel/reclamaciones/LibroReclamacionesPage';

export default function ReclamacionesPublicasPage() {
    return (
        <TiendaProvider catalogo={{ libros: [], cargando: false }}>
            <LibroReclamacionesPage />
        </TiendaProvider>
    );
}
