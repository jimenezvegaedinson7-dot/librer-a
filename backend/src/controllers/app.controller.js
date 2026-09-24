const fs = require('fs');
const path = require('path');

// ========================================
// VERSIÓN PUBLICADA DE LA APP ANDROID (APK FUERA DE GOOGLE PLAY)
// La información vive en src/config/app-version.json (versionado en Git).
// Para publicar una versión nueva se actualiza ese archivo; ver
// docs de publicación. Solo se aceptan APK alojados en los Releases
// del repositorio oficial y siempre por HTTPS.
// ========================================
const RUTA_CONFIG = path.join(__dirname, '../config/app-version.json');

const PREFIJO_APK_AUTORIZADO =
    'https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/';

// Devuelve { datos } si la configuración es válida o { error } si no.
const validarConfiguracion = (config) => {
    if (!config || typeof config !== 'object') {
        return { error: 'configuración vacía' };
    }

    const { version, versionCode, apkUrl, sha256, obligatoria, notas } = config;

    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
        return { error: 'version debe tener el formato X.Y.Z' };
    }
    if (!Number.isInteger(versionCode) || versionCode < 1) {
        return { error: 'versionCode debe ser un entero mayor o igual a 1' };
    }
    if (
        typeof apkUrl !== 'string' ||
        !apkUrl.startsWith(PREFIJO_APK_AUTORIZADO) ||
        apkUrl.includes('..')
    ) {
        return { error: 'apkUrl no pertenece al origen autorizado' };
    }
    if (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(sha256)) {
        return { error: 'sha256 debe tener 64 caracteres hexadecimales' };
    }

    return {
        datos: {
            version,
            versionCode,
            apkUrl,
            sha256: sha256.toLowerCase(),
            obligatoria: obligatoria === true,
            notas: typeof notas === 'string' ? notas.trim() : ''
        }
    };
};

const leerConfiguracion = () =>
    JSON.parse(fs.readFileSync(RUTA_CONFIG, 'utf8'));

// ========================================
// GET /api/app/version (público)
// ========================================
const obtenerVersion = (_req, res) => {
    try {
        const { datos, error } = validarConfiguracion(leerConfiguracion());

        if (error) {
            console.error('[app-version] Configuración inválida:', error);
            return res.status(503).json({
                success: false,
                mensaje: 'Información de versión no disponible'
            });
        }

        // Sin caché: la app debe ver la versión nueva en cuanto se publica.
        res.set('Cache-Control', 'no-store');
        return res.status(200).json(datos);

    } catch (error) {
        console.error('[app-version] Error al leer la versión:', error.message);
        return res.status(503).json({
            success: false,
            mensaje: 'Información de versión no disponible'
        });
    }
};

module.exports = {
    obtenerVersion,
    validarConfiguracion,
    PREFIJO_APK_AUTORIZADO
};
