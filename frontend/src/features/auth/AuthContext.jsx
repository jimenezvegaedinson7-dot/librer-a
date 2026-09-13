/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import storage from '../../lib/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(() => storage.getUsuario());

    const iniciarSesion = useCallback((token, datosUsuario) => {
        storage.setToken(token);
        storage.setUsuario(datosUsuario);
        setUsuario(datosUsuario);
    }, []);

    const actualizarUsuario = useCallback((datosUsuario) => {
        storage.setUsuario(datosUsuario);
        setUsuario(datosUsuario);
    }, []);

    const cerrarSesion = useCallback(() => {
        storage.clearSesion();
        setUsuario(null);
    }, []);

    const value = useMemo(
        () => ({
            usuario,
            autenticado: Boolean(storage.getToken()),
            iniciarSesion,
            actualizarUsuario,
            cerrarSesion,
        }),
        [usuario, iniciarSesion, actualizarUsuario, cerrarSesion],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    }
    return context;
}
