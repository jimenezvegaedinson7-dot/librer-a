import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';
import { esPersonalInterno } from '../../panel/lib/roles';

export default function RutaProtegida({ children }) {
    const { autenticado, usuario, cerrarSesion } = useAuth();
    const ubicacion = useLocation();
    const esDelPanel = esPersonalInterno(usuario?.rol);

    useEffect(() => {
        if (autenticado && !esDelPanel) {
            cerrarSesion();
        }
    }, [autenticado, esDelPanel, cerrarSesion]);

    if (!autenticado || !esDelPanel) {
        return <Navigate to="/admin/login" replace state={{ desde: ubicacion.pathname }} />;
    }

    return children;
}
