import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';

export default function RutaProtegida({ children }) {
    const { autenticado } = useAuth();
    const ubicacion = useLocation();

    if (!autenticado) {
        return <Navigate to="/" replace state={{ desde: ubicacion.pathname }} />;
    }

    return children;
}
