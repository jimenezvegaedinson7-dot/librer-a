import { createContext, useContext, useState, useEffect } from 'react';

const CLAVE_COLOR = 'libreria-color-theme';
const CLAVE_TEMA = 'libreria-admin-theme';

const COLORES = {
    default: {
        primary: '#2563eb', primaryHover: '#1d4ed8', primarySoft: '#eff6ff', text: '#2563eb',
        sidebarBg: '#ffffff', sidebarBorder: '#E2E8F0', sidebarText: '#475569', sidebarHover: '#f8fafc', sidebarSection: '#94a3b8',
    },
    azul: {
        primary: '#3b82f6', primaryHover: '#2563eb', primarySoft: '#eff6ff', text: '#2563eb',
        sidebarBg: '#f0f7ff', sidebarBorder: '#bfdbfe', sidebarText: '#1e40af', sidebarHover: '#dbeafe', sidebarSection: '#3b82f6',
    },
    indigo: {
        primary: '#6366f1', primaryHover: '#4f46e5', primarySoft: '#eef2ff', text: '#4f46e5',
        sidebarBg: '#eef2ff', sidebarBorder: '#c7d2fe', sidebarText: '#3730a3', sidebarHover: '#e0e7ff', sidebarSection: '#6366f1',
    },
    violeta: {
        primary: '#8b5cf6', primaryHover: '#7c3aed', primarySoft: '#f5f3ff', text: '#7c3aed',
        sidebarBg: '#f5f3ff', sidebarBorder: '#ddd6fe', sidebarText: '#5b21b6', sidebarHover: '#ede9fe', sidebarSection: '#8b5cf6',
    },
    esmeralda: {
        primary: '#10b981', primaryHover: '#059669', primarySoft: '#ecfdf5', text: '#059669',
        sidebarBg: '#ecfdf5', sidebarBorder: '#a7f3d0', sidebarText: '#065f46', sidebarHover: '#d1fae5', sidebarSection: '#10b981',
    },
    turquesa: {
        primary: '#06b6d4', primaryHover: '#0891b2', primarySoft: '#ecfeff', text: '#0891b2',
        sidebarBg: '#ecfeff', sidebarBorder: '#a5f3fc', sidebarText: '#155e75', sidebarHover: '#cffafe', sidebarSection: '#06b6d4',
    },
    rosa: {
        primary: '#ec4899', primaryHover: '#db2777', primarySoft: '#fdf2f8', text: '#db2777',
        sidebarBg: '#fdf2f8', sidebarBorder: '#fbcfe8', sidebarText: '#9d174d', sidebarHover: '#fce7f3', sidebarSection: '#ec4899',
    },
    naranja: {
        primary: '#f97316', primaryHover: '#ea580c', primarySoft: '#fff7ed', text: '#ea580c',
        sidebarBg: '#fff7ed', sidebarBorder: '#fed7aa', sidebarText: '#9a3412', sidebarHover: '#ffedd5', sidebarSection: '#f97316',
    },
    rojo: {
        primary: '#ef4444', primaryHover: '#dc2626', primarySoft: '#fef2f2', text: '#dc2626',
        sidebarBg: '#fef2f2', sidebarBorder: '#fecaca', sidebarText: '#991b1b', sidebarHover: '#fee2e2', sidebarSection: '#ef4444',
    },
};

const DARK = {
    sidebarBg: '#1e293b', sidebarBorder: '#334155', sidebarText: '#94a3b8', sidebarHover: '#334155', sidebarSection: '#64748b',
    defaultPrimary: '#60a5fa', defaultText: '#60a5fa', defaultPrimarySoft: 'rgba(59,130,246,0.15)',
};

function getDarkColores(id) {
    const light = COLORES[id] || COLORES.default;
    if (id === 'default') {
        return {
            ...light,
            primary: DARK.defaultPrimary,
            text: DARK.defaultText,
            primarySoft: DARK.defaultPrimarySoft,
            sidebarBg: DARK.sidebarBg,
            sidebarBorder: DARK.sidebarBorder,
            sidebarText: DARK.sidebarText,
            sidebarHover: DARK.sidebarHover,
            sidebarSection: DARK.sidebarSection,
        };
    }
    return {
        ...light,
        sidebarBg: DARK.sidebarBg,
        sidebarBorder: DARK.sidebarBorder,
        sidebarText: DARK.sidebarText,
        sidebarHover: DARK.sidebarHover,
        sidebarSection: DARK.sidebarSection,
    };
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [colorAcento, setColorAcento] = useState(() => window.localStorage.getItem(CLAVE_COLOR) || 'default');
    const [tema, setTema] = useState(() => {
        const t = window.localStorage.getItem(CLAVE_TEMA);
        if (t === 'light' || t === 'dark') return t;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        window.localStorage.setItem(CLAVE_COLOR, colorAcento);
    }, [colorAcento]);

    useEffect(() => {
        window.localStorage.setItem(CLAVE_TEMA, tema);
    }, [tema]);

    const cambiarColor = (nuevoColor) => setColorAcento(nuevoColor);
    const cambiarTema = () => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'));

    const colores = tema === 'dark' ? getDarkColores(colorAcento) : (COLORES[colorAcento] || COLORES.default);

    return (
        <ThemeContext.Provider value={{ colorAcento, cambiarColor, colores, tema, cambiarTema }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTema() {
    return useContext(ThemeContext);
}

export { COLORES };
