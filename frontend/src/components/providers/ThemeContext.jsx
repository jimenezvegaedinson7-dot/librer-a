import { createContext, useContext, useState, useEffect } from 'react';

const CLAVE_CUSTOM = 'libreria-theme-customization';
const CLAVE_TEMA = 'libreria-admin-theme';

const ZONAS_IDS = ['sidebar', 'topbar', 'buttons', 'inputs', 'tables', 'modals', 'badges', 'icons', 'links', 'charts'];
const ZONAS_DEFAULT = ['sidebar', 'topbar', 'buttons', 'icons'];

const COLORES = {
    default: { primary: '#2563eb', primaryHover: '#1d4ed8', primarySoft: '#dbeafe', text: '#1d4ed8' },
    azul: { primary: '#2563eb', primaryHover: '#1d4ed8', primarySoft: '#dbeafe', text: '#1d4ed8' },
    indigo: { primary: '#4f46e5', primaryHover: '#4338ca', primarySoft: '#e0e7ff', text: '#4338ca' },
    violeta: { primary: '#7c3aed', primaryHover: '#6d28d9', primarySoft: '#ede9fe', text: '#6d28d9' },
    tinto: { primary: '#9333ea', primaryHover: '#7e22ce', primarySoft: '#f3e8ff', text: '#7e22ce' },
    cian: { primary: '#0891b2', primaryHover: '#0e7490', primarySoft: '#cffafe', text: '#0e7490' },
    esmeralda: { primary: '#059669', primaryHover: '#047857', primarySoft: '#d1fae5', text: '#047857' },
    lima: { primary: '#65a30d', primaryHover: '#4d7c0f', primarySoft: '#ecfccb', text: '#4d7c0f' },
    turquesa: { primary: '#06b6d4', primaryHover: '#0891b2', primarySoft: '#cffafe', text: '#0891b2' },
    ciclum: { primary: '#0ea5e9', primaryHover: '#0284c7', primarySoft: '#e0f2fe', text: '#0284c7' },
    rosa: { primary: '#db2777', primaryHover: '#be185d', primarySoft: '#fce7f3', text: '#be185d' },
    coral: { primary: '#f43f5e', primaryHover: '#e11d48', primarySoft: '#ffe4e6', text: '#e11d48' },
    naranja: { primary: '#ea580c', primaryHover: '#c2410c', primarySoft: '#ffedd5', text: '#c2410c' },
    amarillo: { primary: '#d97706', primaryHover: '#b45309', primarySoft: '#fef3c7', text: '#b45309' },
    dorado: { primary: '#ca8a04', primaryHover: '#a16207', primarySoft: '#fef9c3', text: '#a16207' },
    rojo: { primary: '#dc2626', primaryHover: '#b91c1c', primarySoft: '#fee2e2', text: '#b91c1c' },
};

const SIDEBAR_BG = { light: '#ffffff', dark: '#1e293b' };
const SIDEBAR_BORDER = { light: '#E2E8F0', dark: '#475569' };
const SIDEBAR_TEXT = { light: '#475569', dark: '#cbd5e1' };
const SIDEBAR_HOVER = { light: '#f8fafc', dark: '#334155' };
const SIDEBAR_SECTION = { light: '#94a3b8', dark: '#94a3b8' };

function getSidebarColors(colorId, tema) {
    const isDark = tema === 'dark';
    const c = COLORES[colorId] || COLORES.default;
    if (colorId === 'default') {
        return {
            sidebarBg: isDark ? SIDEBAR_BG.dark : SIDEBAR_BG.light,
            sidebarBorder: isDark ? SIDEBAR_BORDER.dark : SIDEBAR_BORDER.light,
            sidebarText: isDark ? SIDEBAR_TEXT.dark : SIDEBAR_TEXT.light,
            sidebarHover: isDark ? SIDEBAR_HOVER.dark : SIDEBAR_HOVER.light,
            sidebarSection: SIDEBAR_SECTION[tema],
        };
    }
    const soft = isDark ? 'rgba(255,255,255,0.08)' : c.primarySoft;
    return {
        sidebarBg: isDark ? SIDEBAR_BG.dark : c.primarySoft,
        sidebarBorder: isDark ? SIDEBAR_BORDER.dark : c.primary + '40',
        sidebarText: isDark ? SIDEBAR_TEXT.dark : c.text,
        sidebarHover: isDark ? SIDEBAR_HOVER.dark : c.primarySoft,
        sidebarSection: isDark ? SIDEBAR_SECTION.dark : c.primary,
    };
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [config, setConfig] = useState(() => {
        try {
            const raw = window.localStorage.getItem(CLAVE_CUSTOM);
            if (raw) return JSON.parse(raw);
        } catch {}
        return { zonas: {} };
    });

    const [tema, setTema] = useState(() => {
        const t = window.localStorage.getItem(CLAVE_TEMA);
        if (t === 'light' || t === 'dark') return t;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        window.localStorage.setItem(CLAVE_TEMA, tema);
    }, [tema]);

    useEffect(() => {
        window.localStorage.setItem(CLAVE_CUSTOM, JSON.stringify(config));
        const r = document.documentElement;
        ZONAS_IDS.forEach((z) => {
            const colorId = config.zonas[z];
            if (!colorId) {
                r.style.removeProperty(`--theme-${z}`);
                r.style.removeProperty(`--theme-${z}-hover`);
                r.style.removeProperty(`--theme-${z}-soft`);
                r.style.removeProperty(`--theme-${z}-text`);
                return;
            }
            const c = COLORES[colorId] || COLORES.default;
            r.style.setProperty(`--theme-${z}`, c.primary);
            r.style.setProperty(`--theme-${z}-hover`, c.primaryHover);
            r.style.setProperty(`--theme-${z}-soft`, c.primarySoft);
            r.style.setProperty(`--theme-${z}-text`, c.text);
        });
    }, [config, tema]);

    const aplicarColor = (colorId, zonasSeleccionadas) => {
        setConfig((prev) => {
            const nuevas = { ...prev.zonas };
            zonasSeleccionadas.forEach((z) => { nuevas[z] = colorId; });
            return { ...prev, zonas: nuevas };
        });
    };

    const restaurarZonas = (zonas) => {
        setConfig((prev) => {
            const nuevas = { ...prev.zonas };
            zonas.forEach((z) => { delete nuevas[z]; });
            return { ...prev, zonas: nuevas };
        });
    };

    const restaurarTodo = () => {
        setConfig({ zonas: {} });
    };

    const cambiarTema = () => setTema((t) => (t === 'dark' ? 'light' : 'dark'));

    const getColorZona = (zona) => {
        const colorId = config.zonas[zona];
        return colorId ? (COLORES[colorId] || COLORES.default) : null;
    };

    const getSidebarColores = (zona) => {
        const colorId = config.zonas[zona];
        return getSidebarColors(colorId || 'default', tema);
    };

    return (
        <ThemeContext.Provider value={{
            config, tema, cambiarTema,
            aplicarColor, restaurarZonas, restaurarTodo,
            getColorZona, getSidebarColores,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTema() {
    return useContext(ThemeContext);
}

export { COLORES, ZONAS_IDS, ZONAS_DEFAULT };
