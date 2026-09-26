import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';

// El panel es solo para administradores. El backend valida el rol en cada
// petición; aquí se evita además cargar el panel con una sesión que no es
// de administrador (por ejemplo, datos guardados de otra cuenta).
export default function RutaProtegida({ children }) {
    const { autenticado, usuario, cerrarSesion } = useAuth();
    const ubicacion = useLocation();
    const esAdministrador = usuario?.rol === 'administrador';

    useEffect(() => {
        if (autenticado && !esAdministrador) {
            cerrarSesion();
        }
    }, [autenticado, esAdministrador, cerrarSesion]);

    if (!autenticado || !esAdministrador) {
        return <Navigate to="/" replace state={{ desde: ubicacion.pathname }} />;
    }

    return children;
}
