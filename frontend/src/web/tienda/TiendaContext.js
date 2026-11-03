import { createContext, useContext } from 'react';

export const ContextoTienda = createContext(null);

export function useTienda() {
    return useContext(ContextoTienda);
}
