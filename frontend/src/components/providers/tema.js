import { createContext, useContext } from 'react';

export const CLAVE_CUSTOM = 'libreria-theme-customization';
export const CLAVE_TEMA = 'libreria-admin-theme';

export const ZONAS_IDS = ['sidebar', 'topbar', 'buttons', 'inputs', 'tables', 'modals', 'badges', 'icons', 'links', 'charts'];
// Al aplicar un color se marcan todas las zonas: así cambia todo el sistema.
export const ZONAS_DEFAULT = [...ZONAS_IDS];

// ---------- Paleta del panel ----------
// Mezcla de colores para derivar tonos (hover, fondo suave, texto).
const aRgb = (hex) => hex.replace('#', '').match(/../g).map((v) => parseInt(v, 16));
const aHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mezclar = (a, b, t) => aHex(aRgb(a).map((v, i) => v + (aRgb(b)[i] - v) * t));
// Color sólido a partir de un tono (y opcionalmente su hover).
const solido = (primary, hover) => ({
    primary, primaryHover: hover || mezclar(primary, '#000000', 0.16),
    primarySoft: mezclar(primary, '#ffffff', 0.86), text: mezclar(primary, '#000000', 0.3),
});
// Degradado: `fondo` con todos sus colores y un tono medio para bordes y contraste.
const degradado = (...colores) => {
    const medio = colores.length === 3 ? colores[1] : mezclar(colores[0], colores[colores.length - 1], 0.5);
    const paradas = colores.map((c, i) => `${c} ${Math.round((i / (colores.length - 1)) * 100)}%`).join(', ');
    return { ...solido(medio), fondo: `linear-gradient(135deg, ${paradas})` };
};

// Gema o vidrio oscuro: degradado profundo con un brillo de luz arriba a la
// izquierda y un reflejo diagonal, como una piedra pulida o un cristal.
const gema = (...colores) => {
    const base = degradado(...colores);
    const brillo = 'radial-gradient(120% 70% at 15% 0%, rgba(255, 255, 255, 0.30), rgba(255, 255, 255, 0.06) 45%, transparent 60%)';
    const reflejo = 'linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.10) 50%, transparent 60%)';
    return { ...base, primary: colores[1] || colores[0], fondo: `${brillo}, ${reflejo}, ${base.fondo}` };
};

// Los ids antiguos se conservan con su mismo color: lo ya guardado en cada
// navegador se sigue viendo igual.
export const COLORES = {
    default: { primary: '#0d2940', primaryHover: '#16395a', primarySoft: '#f4ebdd', text: '#0d2940' },
    // Intensos: tonos de paneles como Metronic, Vuexy y Materio, y los de siempre.
    celeste: solido('#0ea5e9', '#0284c7'),
    azure: solido('#3e97ff', '#2884ef'),
    ciclum: { primary: '#007ccc', primaryHover: '#1697e8', primarySoft: '#d3edff', text: '#0063a3' },
    azul: { primary: '#0057ff', primaryHover: '#0042cc', primarySoft: '#dbe6ff', text: '#0042cc' },
    indigo: { primary: '#4338ff', primaryHover: '#3024d4', primarySoft: '#e0ddff', text: '#3024d4' },
    lila: solido('#7367f0', '#5e50ee'),
    violeta: { primary: '#7c1dff', primaryHover: '#6510d8', primarySoft: '#edddff', text: '#6510d8' },
    purpura: solido('#9155fd', '#7e3ff2'),
    fucsia: solido('#c026d3', '#a21caf'),
    rosa: { primary: '#d90070', primaryHover: '#b4005d', primarySoft: '#ffdaed', text: '#b4005d' },
    coral: { primary: '#e62b48', primaryHover: '#ff3d59', primarySoft: '#ffdae1', text: '#a8122b' },
    rojo: { primary: '#e01929', primaryHover: '#bb0e1c', primarySoft: '#ffdbdf', text: '#bb0e1c' },
    naranja: { primary: '#e64900', primaryHover: '#ff681f', primarySoft: '#ffdecf', text: '#a93200' },
    amarillo: { primary: '#f2c400', primaryHover: '#ffdb26', primarySoft: '#fff5bd', text: '#765c00' },
    lima: { primary: '#4c9500', primaryHover: '#61b300', primarySoft: '#e2ffc4', text: '#356800' },
    esmeralda: { primary: '#00874b', primaryHover: '#006b3b', primarySoft: '#ccffe3', text: '#006b3b' },
    turquesa: { primary: '#008f9c', primaryHover: '#00a6b5', primarySoft: '#caffff', text: '#00616b' },
    cian: { primary: '#007ea8', primaryHover: '#006486', primarySoft: '#d0f3ff', text: '#006486' },
    tinto: { primary: '#9f1239', primaryHover: '#7f0c2c', primarySoft: '#ffe0e9', text: '#7f0c2c' },
    // Oscuros: tonos profundos.
    negro: solido('#0b0b0c', '#1f1f22'),
    carbon: solido('#1c1c1e', '#2e2e32'),
    grafito_oscuro: solido('#23272f', '#343a45'),
    marron_oscuro: solido('#3b2418', '#553424'),
    chocolate: solido('#4a2c1d', '#62402c'),
    cafe: solido('#5a3a22', '#704b2f'),
    vino_oscuro: solido('#4a0d1f', '#651530'),
    granate: solido('#5c1018', '#781a24'),
    berenjena: solido('#3a1638', '#52224f'),
    purpura_oscuro: solido('#2e1065', '#40198a'),
    azul_noche: solido('#0b1437', '#16224f'),
    azul_marino_oscuro: solido('#071a2c', '#0f2a44'),
    petroleo_oscuro: solido('#062f36', '#0b434c'),
    verde_bosque: solido('#0f2e1f', '#1a432f'),
    verde_oliva_oscuro: solido('#2f3416', '#434a21'),
    pizarra_oscura: solido('#1e293b', '#334155'),
    // Degradados oscuros.
    negro_dorado: degradado('#0b0b0c', '#3a2d12'),
    cafe_noche: degradado('#2b1a12', '#5a3a22'),
    vino_negro: degradado('#1a0509', '#5c1018'),
    noche_profunda: degradado('#020617', '#1e1b4b'),
    bosque_oscuro: degradado('#03140c', '#14532d'),
    // Gemas y vidrio oscuro.
    gema_zafiro: gema('#020b2e', '#0f2f8f', '#04123f'),
    lapislazuli: gema('#0a1640', '#1d3fa3', '#0b1a4d'),
    agua_profunda: gema('#021a2b', '#0a5c7a', '#03253a'),
    aguamarina: gema('#03262b', '#0b6b73', '#042f35'),
    gema_esmeralda: gema('#02200f', '#0b6b3a', '#03291a'),
    jade: gema('#0b2a22', '#1f6b55', '#0c3027'),
    rubi: gema('#2a0208', '#8f0f2a', '#3a0610'),
    granate_gema: gema('#24040c', '#6e1426', '#2e0710'),
    amatista: gema('#1a0833', '#5b2a9e', '#220b42'),
    turmalina: gema('#1f0626', '#7a1f6b', '#2a0a33'),
    topacio_ahumado: gema('#1f1206', '#6b4316', '#2a1808'),
    onix: gema('#050506', '#2a2a30', '#0b0b0e'),
    obsidiana: gema('#03040a', '#1c2240', '#06070f'),
    vidrio_ahumado: gema('#0e1418', '#3a4a55', '#121a20'),
    // Sobrios.
    zafiro: { primary: '#1e4fa3', primaryHover: '#173f85', primarySoft: '#e3ebf8', text: '#173f85' },
    lavanda: { primary: '#7c6bc4', primaryHover: '#6655ad', primarySoft: '#eeebf8', text: '#54469a' },
    ciruela: { primary: '#6d2e6b', primaryHover: '#58245a', primarySoft: '#f3e6f2', text: '#58245a' },
    vino: { primary: '#8b1e3f', primaryHover: '#721832', primarySoft: '#f7e3e9', text: '#721832' },
    rosa_palo: { primary: '#c2577a', primaryHover: '#a84466', primarySoft: '#fbe9ef', text: '#9a3a5b' },
    terracota: { primary: '#b5502b', primaryHover: '#9a4122', primarySoft: '#f9e7df', text: '#8a3a1f' },
    cobre: { primary: '#a8643a', primaryHover: '#8e532f', primarySoft: '#f6ebe3', text: '#7a4627' },
    ambar: { primary: '#c88a12', primaryHover: '#dca02a', primarySoft: '#fbf1dc', text: '#7a520b' },
    dorado: { primary: '#b88400', primaryHover: '#d29b08', primarySoft: '#fff0c2', text: '#725100' },
    oliva: { primary: '#6b7a2a', primaryHover: '#586523', primarySoft: '#eef1df', text: '#4c571e' },
    bosque: { primary: '#2f6b4f', primaryHover: '#255840', primarySoft: '#e2f0e9', text: '#22513b' },
    petroleo: { primary: '#0f5e6e', primaryHover: '#0c4c59', primarySoft: '#ddeef1', text: '#0c4c59' },
    pizarra: { primary: '#475d78', primaryHover: '#3a4d64', primarySoft: '#e8edf3', text: '#3a4d64' },
    grafito: { primary: '#374151', primaryHover: '#2b333f', primarySoft: '#eceef1', text: '#2b333f' },
    // Degradados de uiGradients (github.com/ghosh/uiGradients).
    instagram: degradado('#833ab4', '#fd1d1d', '#fcb045'),
    cool_blues: degradado('#2193b0', '#6dd5ed'),
    blue_raspberry: degradado('#00b4db', '#0083b0'),
    aqua_marine: degradado('#1a2980', '#26d0ce'),
    rainbow_blue: degradado('#00f260', '#0575e6'),
    azur_lane: degradado('#7f7fd5', '#86a8e7', '#91eae4'),
    sublime_vivid: degradado('#fc466b', '#3f5efb'),
    purple_love: degradado('#cc2b5e', '#753a88'),
    celestial: degradado('#c33764', '#1d2671'),
    purplin: degradado('#6a3093', '#a044ff'),
    kye_meh: degradado('#8360c3', '#2ebf91'),
    quepal: degradado('#11998e', '#38ef7d'),
    lush: degradado('#56ab2f', '#a8e063'),
    bloody_mary: degradado('#ff512f', '#dd2476'),
    flare: degradado('#f12711', '#f5af19'),
    sweet_morning: degradado('#ff5f6d', '#ffc371'),
    citrus_peel: degradado('#fdc830', '#f37335'),
    witching_hour: degradado('#c31432', '#240b36'),
    frost: degradado('#000428', '#004e92'),
    moonlit: degradado('#0f2027', '#203a43', '#2c5364'),
    // Degradados propios.
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
const GRUPO_COLORES = {
    gemas: [['gema_zafiro', 'Zafiro'], ['lapislazuli', 'Lapislázuli'], ['agua_profunda', 'Agua profunda'], ['aguamarina', 'Aguamarina'],
        ['gema_esmeralda', 'Esmeralda'], ['jade', 'Jade'], ['rubi', 'Rubí'], ['granate_gema', 'Granate'], ['amatista', 'Amatista'],
        ['turmalina', 'Turmalina'], ['topacio_ahumado', 'Topacio ahumado'], ['onix', 'Ónix'], ['obsidiana', 'Obsidiana'], ['vidrio_ahumado', 'Vidrio ahumado']],
    oscuros: [['negro', 'Negro'], ['carbon', 'Carbón'], ['grafito_oscuro', 'Grafito oscuro'], ['marron_oscuro', 'Marrón oscuro'],
        ['chocolate', 'Chocolate'], ['cafe', 'Café'], ['vino_oscuro', 'Vino oscuro'], ['granate', 'Granate'], ['berenjena', 'Berenjena'],
        ['purpura_oscuro', 'Púrpura oscuro'], ['azul_noche', 'Azul noche'], ['azul_marino_oscuro', 'Marino oscuro'], ['petroleo_oscuro', 'Petróleo oscuro'],
        ['verde_bosque', 'Verde bosque'], ['verde_oliva_oscuro', 'Oliva oscuro'], ['pizarra_oscura', 'Pizarra oscura'],
        ['negro_dorado', 'Negro y oro'], ['cafe_noche', 'Café y noche'], ['vino_negro', 'Vino y negro'], ['noche_profunda', 'Noche profunda'], ['bosque_oscuro', 'Bosque oscuro']],
    vivos: [['celeste', 'Celeste'], ['azure', 'Azure'], ['ciclum', 'Ciclum'], ['azul', 'Azul'], ['indigo', 'Índigo'], ['lila', 'Lila'],
        ['violeta', 'Violeta'], ['purpura', 'Púrpura'], ['fucsia', 'Fucsia'], ['rosa', 'Rosa'], ['coral', 'Coral'], ['rojo', 'Rojo'],
        ['naranja', 'Naranja'], ['amarillo', 'Amarillo'], ['lima', 'Lima'], ['esmeralda', 'Esmeralda'], ['turquesa', 'Turquesa'], ['cian', 'Cian'], ['tinto', 'Tinto']],
    degradados: [['instagram', 'Instagram'], ['cool_blues', 'Cool Blues'], ['blue_raspberry', 'Blue Raspberry'], ['aqua_marine', 'Aqua Marine'],
        ['rainbow_blue', 'Rainbow Blue'], ['azur_lane', 'Azur Lane'], ['sublime_vivid', 'Sublime Vivid'], ['purple_love', 'Purple Love'],
        ['celestial', 'Celestial'], ['purplin', 'Purplin'], ['kye_meh', 'Kye Meh'], ['quepal', 'Quepal'], ['lush', 'Lush'],
        ['bloody_mary', 'Bloody Mary'], ['flare', 'Flare'], ['sweet_morning', 'Sweet Morning'], ['citrus_peel', 'Citrus Peel'],
        ['witching_hour', 'Witching Hour'], ['frost', 'Frost'], ['moonlit', 'Moonlit'],
        ['atardecer', 'Atardecer'], ['aurora', 'Aurora'], ['oceano', 'Océano'], ['vino_oro', 'Vino y oro'], ['noche', 'Noche'],
        ['bosque_niebla', 'Bosque y niebla'], ['durazno', 'Durazno'], ['lavanda_cielo', 'Lavanda y cielo'], ['marino_oro', 'Marino y oro'], ['grafito_plata', 'Grafito y plata']],
    sobrios: [['default', 'Azul marino · web'], ['zafiro', 'Zafiro'], ['lavanda', 'Lavanda'], ['ciruela', 'Ciruela'], ['vino', 'Vino'],
        ['rosa_palo', 'Rosa palo'], ['terracota', 'Terracota'], ['cobre', 'Cobre'], ['ambar', 'Ámbar'], ['dorado', 'Dorado'],
        ['oliva', 'Oliva'], ['bosque', 'Bosque'], ['petroleo', 'Petróleo'], ['pizarra', 'Pizarra'], ['grafito', 'Grafito']],
};
export const OPCIONES_COLOR = Object.entries(GRUPO_COLORES).flatMap(([grupo, lista]) => lista.map(([id, nombre]) => ({
    id, nombre, grupo, hex: COLORES[id].primary, fondo: COLORES[id].fondo || COLORES[id].primary, degradado: Boolean(COLORES[id].fondo),
})));

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
    if (!COLORES[colorId] || ['default', 'dorado', 'ambar', 'amarillo'].includes(colorId)) {
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
