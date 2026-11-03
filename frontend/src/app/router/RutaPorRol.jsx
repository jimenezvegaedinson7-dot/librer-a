import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';
import { esPersonalInterno, inicioPorRol } from '../../panel/lib/roles';

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
