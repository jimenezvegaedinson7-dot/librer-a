import { createContext, useContext } from 'react';

export const CLAVE_CUSTOM = 'libreria-theme-customization';
export const CLAVE_TEMA = 'libreria-admin-theme';

export const ZONAS_IDS = ['sidebar', 'topbar', 'buttons', 'inputs', 'tables', 'modals', 'badges', 'icons', 'links', 'charts'];
// Al aplicar un color se marcan todas las zonas: así cambia todo el sistema.
export const ZONAS_DEFAULT = [...ZONAS_IDS];

// Paleta del panel. Los sólidos llevan su color; los degradados además un
// `fondo` (linear-gradient) y un `primary` intermedio para bordes, textos y
// el cálculo de contraste.
export const COLORES = {
    default: { primary: '#0d2940', primaryHover: '#16395a', primarySoft: '#f4ebdd', text: '#0d2940' },
    zafiro: { primary: '#1e4fa3', primaryHover: '#173f85', primarySoft: '#e3ebf8', text: '#173f85' },
    indigo: { primary: '#4f46e5', primaryHover: '#4338ca', primarySoft: '#e8e7fc', text: '#3730a3' },
    lavanda: { primary: '#7c6bc4', primaryHover: '#6655ad', primarySoft: '#eeebf8', text: '#54469a' },
    ciruela: { primary: '#6d2e6b', primaryHover: '#58245a', primarySoft: '#f3e6f2', text: '#58245a' },
    vino: { primary: '#8b1e3f', primaryHover: '#721832', primarySoft: '#f7e3e9', text: '#721832' },
    rosa: { primary: '#c2577a', primaryHover: '#a84466', primarySoft: '#fbe9ef', text: '#9a3a5b' },
    terracota: { primary: '#b5502b', primaryHover: '#9a4122', primarySoft: '#f9e7df', text: '#8a3a1f' },
    cobre: { primary: '#a8643a', primaryHover: '#8e532f', primarySoft: '#f6ebe3', text: '#7a4627' },
    ambar: { primary: '#c88a12', primaryHover: '#dca02a', primarySoft: '#fbf1dc', text: '#7a520b' },
    dorado: { primary: '#b88400', primaryHover: '#d29b08', primarySoft: '#fff0c2', text: '#725100' },
    oliva: { primary: '#6b7a2a', primaryHover: '#586523', primarySoft: '#eef1df', text: '#4c571e' },
    bosque: { primary: '#2f6b4f', primaryHover: '#255840', primarySoft: '#e2f0e9', text: '#22513b' },
    esmeralda: { primary: '#0f8a6a', primaryHover: '#0b7258', primarySoft: '#dcf4ec', text: '#0a6550' },
    petroleo: { primary: '#0f5e6e', primaryHover: '#0c4c59', primarySoft: '#ddeef1', text: '#0c4c59' },
    turquesa: { primary: '#0e9aa7', primaryHover: '#0b7f8a', primarySoft: '#d9f4f6', text: '#0a6f78' },
    pizarra: { primary: '#475d78', primaryHover: '#3a4d64', primarySoft: '#e8edf3', text: '#3a4d64' },
    grafito: { primary: '#374151', primaryHover: '#2b333f', primarySoft: '#eceef1', text: '#2b333f' },
    // Degradados combinados.
    atardecer: { primary: '#e2513f', primaryHover: '#c9402f', primarySoft: '#fde8e2', text: '#a8352a', fondo: 'linear-gradient(135deg, #f97316 0%, #db2777 100%)' },
    aurora: { primary: '#3b6bc9', primaryHover: '#2f58a8', primarySoft: '#e3ecfa', text: '#2f4f99', fondo: 'linear-gradient(135deg, #0ea5a4 0%, #6d28d9 100%)' },
    oceano: { primary: '#155e8c', primaryHover: '#104c72', primarySoft: '#ddeef7', text: '#104c72', fondo: 'linear-gradient(135deg, #0e7490 0%, #1e3a8a 100%)' },
    vino_oro: { primary: '#8f3a32', primaryHover: '#76302a', primarySoft: '#f6e6e1', text: '#76302a', fondo: 'linear-gradient(135deg, #7f1d3a 0%, #b8862b 100%)' },
    noche: { primary: '#1e2a6b', primaryHover: '#182257', primarySoft: '#e4e7f6', text: '#1e2a6b', fondo: 'linear-gradient(135deg, #0f172a 0%, #4338ca 100%)' },
    bosque_niebla: { primary: '#165f4a', primaryHover: '#124f3e', primarySoft: '#dff0ea', text: '#124f3e', fondo: 'linear-gradient(135deg, #14532d 0%, #0f766e 100%)' },
    durazno: { primary: '#e0614d', primaryHover: '#c9503d', primarySoft: '#fdeae5', text: '#a8402f', fondo: 'linear-gradient(135deg, #fb923c 0%, #f472b6 100%)' },
    lavanda_cielo: { primary: '#5b6fe0', primaryHover: '#4a5bc4', primarySoft: '#e8ebfb', text: '#3e4da8', fondo: 'linear-gradient(135deg, #8b5cf6 0%, #38bdf8 100%)' },
    marino_oro: { primary: '#0d2940', primaryHover: '#16395a', primarySoft: '#f4ebdd', text: '#0d2940', fondo: 'linear-gradient(135deg, #0d2940 0%, #0d2940 45%, #b08a3e 100%)' },
    grafito_plata: { primary: '#374151', primaryHover: '#2b333f', primarySoft: '#eceef1', text: '#2b333f', fondo: 'linear-gradient(135deg, #1f2937 0%, #64748b 100%)' },
};

// Nombres y grupos para la página de Personalización.
export const OPCIONES_COLOR = [
    ['default', 'Azul marino · web'], ['zafiro', 'Zafiro'], ['indigo', 'Índigo'], ['lavanda', 'Lavanda'], ['ciruela', 'Ciruela'],
    ['vino', 'Vino'], ['rosa', 'Rosa palo'], ['terracota', 'Terracota'], ['cobre', 'Cobre'], ['ambar', 'Ámbar'], ['dorado', 'Dorado'],
    ['oliva', 'Oliva'], ['bosque', 'Bosque'], ['esmeralda', 'Esmeralda'], ['petroleo', 'Petróleo'], ['turquesa', 'Turquesa'],
    ['pizarra', 'Pizarra'], ['grafito', 'Grafito'],
    ['atardecer', 'Atardecer'], ['aurora', 'Aurora'], ['oceano', 'Océano'], ['vino_oro', 'Vino y oro'], ['noche', 'Noche'],
    ['bosque_niebla', 'Bosque y niebla'], ['durazno', 'Durazno'], ['lavanda_cielo', 'Lavanda y cielo'], ['marino_oro', 'Marino y oro'], ['grafito_plata', 'Grafito y plata'],
].map(([id, nombre]) => ({ id, nombre, hex: COLORES[id].primary, fondo: COLORES[id].fondo || COLORES[id].primary, degradado: Boolean(COLORES[id].fondo) }));

// El texto sobre colores sólidos se calcula para mantener el contraste.
export function colorSobre(hex) {
    const luminancia = (color) => {
        const c = color.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16) / 255)
            .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    };
    const fondo = luminancia(hex);
    const claro = (1.05) / (fondo + 0.05);
    const oscuro = (fondo + 0.05) / (luminancia('#0a1f31') + 0.05);
    if (claro >= 4.5 && claro >= oscuro) return '#ffffff';
    return oscuro >= 4.5 ? '#0a1f31' : '#000000';
}

// Menú izquierdo sin amarillo: marca marino y texto/iconos blancos.
const SIDEBAR_MARCA = {
    light: { bg: '#0d2940', border: 'rgba(255, 255, 255, 0.20)' },
    dark: { bg: '#0a1f31', border: 'rgba(255, 255, 255, 0.16)' },
};

export function getSidebarColors(colorId, tema) {
    const isDark = tema === 'dark';
    const c = COLORES[colorId] || COLORES.default;
    if (!COLORES[colorId] || ['default', 'dorado', 'ambar'].includes(colorId)) {
        const marca = SIDEBAR_MARCA[isDark ? 'dark' : 'light'];
        return {
            primary: '#ffffff',
            primarySoft: '#16395a',
            sidebarBg: marca.bg,
            sidebarBorder: marca.border,
            sidebarText: '#ffffff',
            sidebarHover: '#16395a',
            sidebarSection: '#d6e5f5',
            brandTitle: '#ffffff',
            oscuro: true,
        };
    }
    const texto = colorSobre(c.primary);
    return {
        primary: texto,
        primarySoft: c.primaryHover,
        sidebarBg: c.primary,
        sidebarFondo: c.fondo || c.primary,
        sidebarBorder: texto + '40',
        sidebarText: texto,
        sidebarHover: c.primaryHover,
        sidebarSection: texto,
        brandTitle: texto,
        oscuro: true,
    };
}

export const ThemeContext = createContext(null);

export function useTema() {
    return useContext(ThemeContext);
}
