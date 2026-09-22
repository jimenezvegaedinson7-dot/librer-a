import { createContext, useContext, useState, useEffect } from 'react';

const CLAVE_COLOR = 'libreria-color-theme';

const COLORES = {
    default: { primary: '#2563eb', primaryHover: '#1d4ed8', primarySoft: '#eff6ff', text: '#2563eb' },
    azul: { primary: '#2563eb', primaryHover: '#1d4ed8', primarySoft: '#eff6ff', text: '#2563eb' },
    indigo: { primary: '#4f46e5', primaryHover: '#4338ca', primarySoft: '#eef2ff', text: '#4f46e5' },
    violeta: { primary: '#7c3aed', primaryHover: '#6d28d9', primarySoft: '#f5f3ff', text: '#7c3aed' },
    esmeralda: { primary: '#059669', primaryHover: '#047857', primarySoft: '#ecfdf5', text: '#059669' },
    turquesa: { primary: '#0891b2', primaryHover: '#0e7490', primarySoft: '#ecfeff', text: '#0891b2' },
    rosa: { primary: '#db2777', primaryHover: '#be185d', primarySoft: '#fdf2f8', text: '#db2777' },
    naranja: { primary: '#ea580c', primaryHover: '#c2410c', primarySoft: '#fff7ed', text: '#ea580c' },
    rojo: { primary: '#dc2626', primaryHover: '#b91c1c', primarySoft: '#fef2f2', text: '#dc2626' },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [colorAcento, setColorAcento] = useState(() => window.localStorage.getItem(CLAVE_COLOR) || 'default');

    useEffect(() => {
        window.localStorage.setItem(CLAVE_COLOR, colorAcento);
    }, [colorAcento]);

    const cambiarColor = (nuevoColor) => setColorAcento(nuevoColor);

    const colores = COLORES[colorAcento] || COLORES.default;

    return (
        <ThemeContext.Provider value={{ colorAcento, cambiarColor, colores }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTema() {
    return useContext(ThemeContext);
}

export { COLORES };
