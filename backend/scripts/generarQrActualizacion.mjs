import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { SITIO } from '../../frontend/src/public-site/config/site.js';

const require = createRequire(import.meta.url);
const QRCode = require('qrcode');
const destino = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/src/public-site/assets/qr-actualizar.png');
// URL estable: la página consulta /api/app/version y abre el APK vigente.
const url = new URL('/descargar?actualizar=1', SITIO.url).href;
await QRCode.toFile(destino, url, {
    width: 512, margin: 4, errorCorrectionLevel: 'M',
    color: { dark: '#004d43', light: '#ffffff' },
});
console.log(`QR de actualización generado: ${url}`);
