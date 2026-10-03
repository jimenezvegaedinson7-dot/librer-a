import { createContext, useContext } from 'react';

export const CLAVE_CUSTOM = 'libreria-theme-customization';
export const CLAVE_TEMA = 'libreria-admin-theme';

export const ZONAS_IDS = ['sidebar', 'topbar', 'buttons', 'inputs', 'tables', 'modals', 'badges', 'icons', 'links', 'charts'];
export const ZONAS_DEFAULT = ['sidebar', 'topbar', 'buttons', 'icons'];

export const COLORES = {
    default: { primary: '#0d2940', primaryHover: '#16395a', primarySoft: '#f4ebdd', text: '#0d2940' },
    azul: { primary: '#0057ff', primaryHover: '#0042cc', primarySoft: '#dbe6ff', text: '#0042cc' },
    indigo: { primary: '#4338ff', primaryHover: '#3024d4', primarySoft: '#e0ddff', text: '#3024d4' },
    violeta: { primary: '#7c1dff', primaryHover: '#6510d8', primarySoft: '#edddff', text: '#6510d8' },
    tinto: { primary: '#9f1239', primaryHover: '#7f0c2c', primarySoft: '#ffe0e9', text: '#7f0c2c' },
    cian: { primary: '#007ea8', primaryHover: '#006486', primarySoft: '#d0f3ff', text: '#006486' },
    esmeralda: { primary: '#00874b', primaryHover: '#006b3b', primarySoft: '#ccffe3', text: '#006b3b' },
    lima: { primary: '#4c9500', primaryHover: '#61b300', primarySoft: '#e2ffc4', text: '#356800' },
    turquesa: { primary: '#008f9c', primaryHover: '#00a6b5', primarySoft: '#caffff', text: '#00616b' },
    ciclum: { primary: '#007ccc', primaryHover: '#1697e8', primarySoft: '#d3edff', text: '#0063a3' },
    rosa: { primary: '#d90070', primaryHover: '#b4005d', primarySoft: '#ffdaed', text: '#b4005d' },
    coral: { primary: '#e62b48', primaryHover: '#ff3d59', primarySoft: '#ffdae1', text: '#a8122b' },
    naranja: { primary: '#e64900', primaryHover: '#ff681f', primarySoft: '#ffdecf', text: '#a93200' },
    amarillo: { primary: '#f2c400', primaryHover: '#ffdb26', primarySoft: '#fff5bd', text: '#765c00' },
    dorado: { primary: '#b88400', primaryHover: '#d29b08', primarySoft: '#fff0c2', text: '#725100' },
    rojo: { primary: '#e01929', primaryHover: '#bb0e1c', primarySoft: '#ffdbdf', text: '#bb0e1c' },
};

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
    if (!COLORES[colorId] || ['default', 'amarillo', 'dorado'].includes(colorId)) {
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
