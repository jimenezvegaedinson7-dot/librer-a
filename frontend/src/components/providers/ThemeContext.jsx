import { createContext, useContext, useState, useEffect } from 'react';

const CLAVE_COLOR = 'libreria-color-theme';
const CLAVE_TEMA = 'libreria-admin-theme';

const COLORES = {
    default: {
        primary: '#2563eb', primaryHover: '#1d4ed8', primarySoft: '#dbeafe', text: '#2563eb',
        sidebarBg: '#ffffff', sidebarBorder: '#93c5fd', sidebarText: '#1e40af', sidebarHover: '#eff6ff', sidebarSection: '#3b82f6',
    },
    azul: {
        primary: '#2563eb', primaryHover: '#1d4ed8', primarySoft: '#dbeafe', text: '#1d4ed8',
        sidebarBg: '#dbeafe', sidebarBorder: '#60a5fa', sidebarText: '#1e3a8a', sidebarHover: '#bfdbfe', sidebarSection: '#2563eb',
    },
    indigo: {
        primary: '#4f46e5', primaryHover: '#4338ca', primarySoft: '#e0e7ff', text: '#4338ca',
        sidebarBg: '#e0e7ff', sidebarBorder: '#818cf8', sidebarText: '#312e81', sidebarHover: '#c7d2fe', sidebarSection: '#4f46e5',
    },
    violeta: {
        primary: '#7c3aed', primaryHover: '#6d28d9', primarySoft: '#ede9fe', text: '#6d28d9',
        sidebarBg: '#ede9fe', sidebarBorder: '#a78bfa', sidebarText: '#4c1d95', sidebarHover: '#ddd6fe', sidebarSection: '#7c3aed',
    },
    esmeralda: {
        primary: '#059669', primaryHover: '#047857', primarySoft: '#d1fae5', text: '#047857',
        sidebarBg: '#d1fae5', sidebarBorder: '#34d399', sidebarText: '#064e3b', sidebarHover: '#a7f3d0', sidebarSection: '#059669',
    },
    turquesa: {
        primary: '#0891b2', primaryHover: '#0e7490', primarySoft: '#cffafe', text: '#0e7490',
        sidebarBg: '#cffafe', sidebarBorder: '#22d3ee', sidebarText: '#164e63', sidebarHover: '#a5f3fc', sidebarSection: '#0891b2',
    },
    rosa: {
        primary: '#db2777', primaryHover: '#be185d', primarySoft: '#fce7f3', text: '#be185d',
        sidebarBg: '#fce7f3', sidebarBorder: '#f472b6', sidebarText: '#831843', sidebarHover: '#fbcfe8', sidebarSection: '#db2777',
    },
    naranja: {
        primary: '#ea580c', primaryHover: '#c2410c', primarySoft: '#ffedd5', text: '#c2410c',
        sidebarBg: '#ffedd5', sidebarBorder: '#fb923c', sidebarText: '#7c2d12', sidebarHover: '#fed7aa', sidebarSection: '#ea580c',
    },
    rojo: {
        primary: '#dc2626', primaryHover: '#b91c1c', primarySoft: '#fee2e2', text: '#b91c1c',
        sidebarBg: '#fee2e2', sidebarBorder: '#f87171', sidebarText: '#7f1d1d', sidebarHover: '#fecaca', sidebarSection: '#dc2626',
    },
    amarillo: {
        primary: '#d97706', primaryHover: '#b45309', primarySoft: '#fef3c7', text: '#b45309',
        sidebarBg: '#fef3c7', sidebarBorder: '#fbbf24', sidebarText: '#78350f', sidebarHover: '#fde68a', sidebarSection: '#d97706',
    },
    lima: {
        primary: '#65a30d', primaryHover: '#4d7c0f', primarySoft: '#ecfccb', text: '#4d7c0f',
        sidebarBg: '#ecfccb', sidebarBorder: '#84cc16', sidebarText: '#365314', sidebarHover: '#d9f99d', sidebarSection: '#65a30d',
    },
    cian: {
        primary: '#0891b2', primaryHover: '#0e7490', primarySoft: '#cffafe', text: '#0e7490',
        sidebarBg: '#cffafe', sidebarBorder: '#06b6d4', sidebarText: '#155e75', sidebarHover: '#a5f3fc', sidebarSection: '#0891b2',
    },
    tinto: {
        primary: '#9333ea', primaryHover: '#7e22ce', primarySoft: '#f3e8ff', text: '#7e22ce',
        sidebarBg: '#f3e8ff', sidebarBorder: '#c084fc', sidebarText: '#581c87', sidebarHover: '#e9d5ff', sidebarSection: '#9333ea',
    },
    dorado: {
        primary: '#ca8a04', primaryHover: '#a16207', primarySoft: '#fef9c3', text: '#a16207',
        sidebarBg: '#fef9c3', sidebarBorder: '#facc15', sidebarText: '#713f12', sidebarHover: '#fef08a', sidebarSection: '#ca8a04',
    },
    coral: {
        primary: '#f43f5e', primaryHover: '#e11d48', primarySoft: '#ffe4e6', text: '#e11d48',
        sidebarBg: '#ffe4e6', sidebarBorder: '#fb7185', sidebarText: '#881337', sidebarHover: '#fecdd3', sidebarSection: '#f43f5e',
    },
    ciclum: {
        primary: '#0ea5e9', primaryHover: '#0284c7', primarySoft: '#e0f2fe', text: '#0284c7',
        sidebarBg: '#e0f2fe', sidebarBorder: '#38bdf8', sidebarText: '#0c4a6e', sidebarHover: '#bae6fd', sidebarSection: '#0ea5e9',
    },
};

const DARK = {
    sidebarBg: '#1e293b', sidebarBorder: '#475569', sidebarText: '#cbd5e1', sidebarHover: '#334155', sidebarSection: '#94a3b8',
};

function getDarkColores(id) {
    const light = COLORES[id] || COLORES.default;
    if (id === 'default') {
        return {
            ...light,
            primary: '#60a5fa', text: '#60a5fa', primarySoft: 'rgba(59,130,246,0.2)',
            sidebarBg: DARK.sidebarBg, sidebarBorder: DARK.sidebarBorder,
            sidebarText: DARK.sidebarText, sidebarHover: DARK.sidebarHover, sidebarSection: DARK.sidebarSection,
        };
    }
    return {
        ...light,
        sidebarBg: DARK.sidebarBg, sidebarBorder: DARK.sidebarBorder,
        sidebarText: DARK.sidebarText, sidebarHover: DARK.sidebarHover, sidebarSection: DARK.sidebarSection,
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
