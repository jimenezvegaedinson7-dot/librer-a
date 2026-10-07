// ============================================================
// DESCARGAS DE LA APP — fuente única para toda la web pública.
// Para cambiar de canal basta con editar este archivo:
//   Android: tipo 'apk' → 'playstore' (url = ficha de Google Play).
//   iOS:     tipo 'preparacion' → 'ipa' | 'testflight' | 'appstore'.
// Una plataforma con habilitado: false no se muestra.
// ============================================================

export const DESCARGAS = {
    android: {
        habilitado: true,
        tipo: 'apk',
        version: '1.0.10',
        // APK firmado: métodos de PayU sin refrescar y seguimiento alineado.
        url: 'https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/v1.0.10/libreria-1.0.10.apk',
        tamano: '55.3 MB',
        actualizado: '2026-10-07',
    },
    ios: {
        habilitado: true,
        tipo: 'preparacion',
        version: null,
        url: null,
        actualizado: null,
    },
};

// Cómo se presenta cada canal. El componente solo lee esto.
export const CANALES = {
    apk: {
        formato: 'Archivo APK',
        accion: 'Descargar para Android',
        nota: 'Al abrir el archivo, Android te pedirá permitir la instalación desde esta fuente.',
    },
    playstore: {
        formato: 'Google Play',
        accion: 'Descargar en Google Play',
        nota: null,
    },
    preparacion: {
        formato: 'En preparación',
        accion: null,
        nota: 'Estamos preparando la versión para iPhone. Mientras tanto, la app está disponible para Android.',
    },
    ipa: {
        formato: 'Archivo IPA · versión de prueba',
        accion: 'Descargar versión de prueba',
        nota: 'Solo se instala en iPhone autorizados para esta distribución de pruebas.',
    },
    testflight: {
        formato: 'TestFlight · beta',
        accion: 'Unirme a la beta en TestFlight',
        nota: 'Necesitas la app TestFlight de Apple.',
    },
    appstore: {
        formato: 'App Store',
        accion: 'Descargar en el App Store',
        nota: null,
    },
};

export const plataformaDisponible = (clave) => {
    const p = DESCARGAS[clave];
    return Boolean(p?.habilitado && p.url && CANALES[p.tipo]?.accion);
};
