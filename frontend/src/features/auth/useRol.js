import { useAuth } from './AuthContext';
import { esAdministrador } from '../../lib/roles';

// ============================================================
// PERMISOS DE INTERFAZ
// derived de la sesión real. Solo controlan qué se muestra: la
// autorización verdadera la aplica el backend, que es quien
// rechaza con 403 cualquier operación no permitida.
// ============================================================
export function useRol() {
    const { usuario } = useAuth();
    const rol = usuario?.rol;

    const esAdmin = esAdministrador(rol);

    return {
        rol,
        esAdmin,

        // Catálogo, inventario y acciones sensibles: exclusiva del admin.
        puedeEditarCatalogo: esAdmin,
        puedeEditarStock: esAdmin,
        puedeReembolsar: esAdmin,
        puedeAnularComprobantes: esAdmin,
        puedeRegistrarSunat: esAdmin,
    };
}

export default useRol;
