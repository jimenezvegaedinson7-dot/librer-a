import { useAuth } from '../../app/providers/AuthContext';
import { esAdministrador } from '../lib/roles';

export function useRol() {
    const { usuario } = useAuth();
    const rol = usuario?.rol;

    const esAdmin = esAdministrador(rol);

    return {
        rol,
        esAdmin,

        puedeEditarCatalogo: esAdmin,
        puedeEditarStock: esAdmin,
        puedeReembolsar: esAdmin,
        puedeAnularComprobantes: esAdmin
    };
}
