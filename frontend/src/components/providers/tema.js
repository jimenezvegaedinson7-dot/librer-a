import { createContext, useContext } from 'react';

export const CLAVE_CUSTOM = 'libreria-theme-customization';
export const CLAVE_TEMA = 'libreria-admin-theme';

export const ZONAS_IDS = ['sidebar', 'topbar', 'buttons', 'inputs', 'tables', 'modals', 'badges', 'icons', 'links', 'charts'];
export const ZONAS_DEFAULT = ['sidebar', 'topbar', 'buttons', 'icons'];

export const COLORES = {
    default: { primary: '#004d43', primaryHover: '#013a33', primarySoft: '#dfeee9', text: '#004d43' },
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

const SIDEBAR_BG = { light: '#ffffff', dark: '#1d1a17' };
const SIDEBAR_BORDER = { light: '#e6e0d7', dark: '#403831' };
const SIDEBAR_TEXT = { light: '#5c544b', dark: '#d8cfc2' };
const SIDEBAR_HOVER = { light: '#faf8f5', dark: '#2d2824' };
const SIDEBAR_SECTION = { light: '#a39a8e', dark: '#a89e91' };

// Sidebar de marca: tinta cálida con filete dorado, igual en ambos temas
const SIDEBAR_MARCA = {
    light: { bg: '#013a33', border: 'rgba(223, 230, 221, 0.12)' },
    dark: { bg: '#01241f', border: 'rgba(223, 230, 221, 0.08)' },
};

export function getSidebarColors(colorId, tema) {
    const isDark = tema === 'dark';
    const c = COLORES[colorId] || COLORES.default;
    if (colorId === 'default') {
        const marca = SIDEBAR_MARCA[isDark ? 'dark' : 'light'];
        return {
            primary: '#f0c866',
            primarySoft: 'rgba(240, 200, 102, 0.14)',
            sidebarBg: marca.bg,
            sidebarBorder: marca.border,
            sidebarText: '#d3e0db',
            sidebarHover: 'rgba(223, 230, 221, 0.10)',
            sidebarSection: '#8fb1a7',
            brandTitle: '#ffffff',
            oscuro: true,
        };
    }
    return {
        primary: c.primary,
        primarySoft: isDark ? 'rgba(255,255,255,0.08)' : c.primarySoft,
        sidebarBg: isDark ? SIDEBAR_BG.dark : c.primarySoft,
        sidebarBorder: isDark ? SIDEBAR_BORDER.dark : c.primary + '40',
        sidebarText: isDark ? SIDEBAR_TEXT.dark : c.text,
        sidebarHover: isDark ? SIDEBAR_HOVER.dark : c.primarySoft,
        sidebarSection: isDark ? SIDEBAR_SECTION.dark : c.primary,
    };
}

export const ThemeContext = createContext(null);

export function useTema() {
    return useContext(ThemeContext);
}
