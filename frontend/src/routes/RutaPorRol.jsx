import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';
import { esPersonalInterno, inicioPorRol } from '../lib/roles';

// Restringe una pantalla del panel a ciertos roles. Si el usuario no
// tiene permiso, se le redirige a su página de inicio en lugar de
// mostrar un error técnico.
//
// El backend sigue siendo la fuente de verdad: esto solo evita que
// una cuenta sin permiso vea o pulse pantallas que no le corresponden.
export default function RutaPorRol({ roles, children }) {
    const { usuario } = useAuth();
    const ubicacion = useLocation();

    if (!esPersonalInterno(usuario?.rol)) {
        return <Navigate to={inicioPorRol()} replace />;
    }

    const permitidos = roles.map((rol) => String(rol).toLowerCase());
    const rolActual = String(usuario?.rol || '').toLowerCase();

    if (!permitidos.includes(rolActual)) {
        return <Navigate to={inicioPorRol()} replace state={{ desde: ubicacion.pathname }} />;
    }

    return children;
}
