const fs = require('fs');
const path = require('path');

const RUTA_CONFIG = path.join(__dirname, '../config/app-version.json');
const PREFIJO_APK_AUTORIZADO = 'https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/';

const validarConfiguracion = (config) => {
    if (!config || typeof config !== 'object') return { error: 'configuración vacía' };
    const { version, versionCode, apkUrl, sha256, obligatoria, notas } = config;
    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) return { error: 'version debe tener el formato X.Y.Z' };
    if (!Number.isInteger(versionCode) || versionCode < 1) return { error: 'versionCode debe ser un entero mayor o igual a 1' };
    if (typeof apkUrl !== 'string' || !apkUrl.startsWith(PREFIJO_APK_AUTORIZADO) || apkUrl.includes('..')) return { error: 'apkUrl no pertenece al origen autorizado' };
    if (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(sha256)) return { error: 'sha256 debe tener 64 caracteres hexadecimales' };
    return { datos: { version, versionCode, apkUrl, sha256: sha256.toLowerCase(), obligatoria: obligatoria === true, notas: typeof notas === 'string' ? notas.trim() : '' } };
};

function obtenerConfiguracion() {
    return validarConfiguracion(JSON.parse(fs.readFileSync(RUTA_CONFIG, 'utf8')));
}

module.exports = { obtenerConfiguracion, validarConfiguracion, PREFIJO_APK_AUTORIZADO };
