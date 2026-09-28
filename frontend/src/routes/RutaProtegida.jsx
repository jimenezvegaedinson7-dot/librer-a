import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';
import { esPersonalInterno } from '../lib/roles';

// El panel es para personal interno: administrador y cajero. El backend
// valida el rol en cada petición; aquí se evita además cargar el panel
// con una sesión que no corresponde (por ejemplo, datos guardados de
// una cuenta de cliente).
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
        return <Navigate to="/" replace state={{ desde: ubicacion.pathname }} />;
    }

    return children;
}
