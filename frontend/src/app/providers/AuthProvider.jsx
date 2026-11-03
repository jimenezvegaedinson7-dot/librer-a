import { useCallback, useMemo, useState } from 'react';
import storage from '../../panel/lib/storage/index';
import { AuthContext } from './AuthContext';

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
        () => ({ usuario, autenticado: Boolean(storage.getToken()), iniciarSesion, actualizarUsuario, cerrarSesion }),
        [usuario, iniciarSesion, actualizarUsuario, cerrarSesion]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
