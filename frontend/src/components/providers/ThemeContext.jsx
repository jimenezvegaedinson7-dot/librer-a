import { useState, useEffect } from 'react';

import {
    CLAVE_CUSTOM,
    CLAVE_TEMA,
    COLORES,
    colorSobre,
    ZONAS_IDS,
    getSidebarColors,
    ThemeContext,
} from './tema';

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
                r.removeAttribute(`data-color-${z}`);
                r.style.removeProperty(`--theme-${z}`);
                r.style.removeProperty(`--theme-${z}-hover`);
                r.style.removeProperty(`--theme-${z}-soft`);
                r.style.removeProperty(`--theme-${z}-text`);
                r.style.removeProperty(`--theme-${z}-on`);
                r.style.removeProperty(`--theme-${z}-fondo`);
                return;
            }
            const c = COLORES[colorId] || COLORES.default;
            r.setAttribute(`data-color-${z}`, colorId);
            const botonesMarca = colorId === 'default' && z === 'buttons';
            r.style.setProperty(`--theme-${z}`, botonesMarca ? '#d5a447' : c.primary);
            r.style.setProperty(`--theme-${z}-hover`, botonesMarca ? '#e3b865' : c.primaryHover);
            r.style.setProperty(`--theme-${z}-soft`, c.primarySoft);
            r.style.setProperty(`--theme-${z}-text`, c.text);
            r.style.setProperty(`--theme-${z}-on`, botonesMarca ? '#0a1f31' : colorSobre(c.primary));
            // Fondo: el degradado si el color lo tiene; si no, el sólido.
            r.style.setProperty(`--theme-${z}-fondo`, botonesMarca ? '#d5a447' : (c.fondo || c.primary));
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
