#!/usr/bin/env node
// ============================================================
// PREPARA LA PUBLICACIÓN DE UNA VERSIÓN NUEVA DEL APK
// ============================================================
// Uso (desde backend/):
//   node scripts/publicarVersionApp.js --notas "Mejoras y correcciones" [--obligatoria]
//
// 1. Lee version y versionCode de flutter_app/pubspec.yaml (X.Y.Z+N).
// 2. Toma el APK de flutter_app/build/app/outputs/flutter-apk/app-release.apk
//    (o el indicado con --apk) y calcula su SHA-256.
// 3. Exige que el versionCode sea MAYOR que el publicado.
// 4. Copia el APK como libreria-X.Y.Z.apk (nombre que se sube a GitHub).
// 5. Actualiza src/config/app-version.json (validado).
// No sube nada a internet: el APK se sube a mano al Release vX.Y.Z.
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
    validarConfiguracion,
    PREFIJO_APK_AUTORIZADO
} = require('../src/controllers/app.controller');

const RAIZ = path.resolve(__dirname, '../..');
const PUBSPEC = path.join(RAIZ, 'flutter_app/pubspec.yaml');
const APK_POR_DEFECTO = path.join(RAIZ, 'flutter_app/build/app/outputs/flutter-apk/app-release.apk');
const CONFIG = path.join(__dirname, '../src/config/app-version.json');

const args = process.argv.slice(2);
const valor = (nombre) => {
    const i = args.indexOf(nombre);
    return i >= 0 ? args[i + 1] : undefined;
};
const salir = (mensaje) => {
    console.error(`\n✗ ${mensaje}\n`);
    process.exit(1);
};

const notas = valor('--notas');
if (!notas) salir('Indica las notas de la versión: --notas "Mejoras y correcciones"');

const pubspec = fs.readFileSync(PUBSPEC, 'utf8');
const coincide = pubspec.match(/^version:\s*(\d+\.\d+\.\d+)\+(\d+)\s*$/m);
if (!coincide) salir('pubspec.yaml debe tener "version: X.Y.Z+N".');
const version = coincide[1];
const versionCode = Number(coincide[2]);

const actual = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
if (versionCode <= Number(actual.versionCode || 0)) {
    salir(
        `El versionCode ${versionCode} debe ser MAYOR que el publicado (${actual.versionCode}). ` +
        'Sube el número después del "+" en pubspec.yaml y vuelve a compilar.'
    );
}

const apk = path.resolve(valor('--apk') || APK_POR_DEFECTO);
if (!fs.existsSync(apk)) salir(`No existe el APK: ${apk}\nCompila antes con: flutter build apk --release`);

const nombreApk = `libreria-${version}.apk`;
const copia = path.join(path.dirname(apk), nombreApk);
fs.copyFileSync(apk, copia);
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(copia)).digest('hex');

const nueva = {
    version,
    versionCode,
    apkUrl: `${PREFIJO_APK_AUTORIZADO}v${version}/${nombreApk}`,
    sha256,
    obligatoria: args.includes('--obligatoria'),
    notas
};

const { error } = validarConfiguracion(nueva);
if (error) salir(`Configuración inválida: ${error}`);

fs.writeFileSync(CONFIG, `${JSON.stringify(nueva, null, 4)}\n`);

console.log(`
✓ Versión ${version} (versionCode ${versionCode}) preparada.

  APK para subir : ${copia}
  SHA-256        : ${sha256}
  Obligatoria    : ${nueva.obligatoria ? 'sí' : 'no'}

Siguientes pasos:
  1. En GitHub → Releases → "Draft a new release"
     - Tag: v${version}
     - Adjunta el archivo ${nombreApk} (con ese nombre exacto) y publica.
  2. Comprueba que se descarga: ${nueva.apkUrl}
  3. Haz commit y push de backend/src/config/app-version.json.
     Al desplegarse en Render, las apps instaladas verán la actualización.
`);
