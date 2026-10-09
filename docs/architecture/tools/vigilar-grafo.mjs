// Vigilante del cerebro Graphify: cuando cambia el código (backend, panel,
// tienda web o app Flutter), espera a que pasen unos segundos sin cambios
// y regenera el grafo con actualizar-grafo.mjs. Así el mapa se mantiene al
// día sin importar quién edite (Claude Code, OpenCode o el editor).
//   node docs/architecture/tools/vigilar-grafo.mjs
// Se inicia solo al entrar a Windows (ver graphify-out/LEEME.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { actualizarGrafo } from './actualizar-grafo.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ESPERA_MS = 15_000;
const CARPETAS = ['backend/src', 'backend/database', 'frontend/src', 'flutter_app/lib'];
const EXTENSIONES = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx', '.css', '.dart', '.sql', '.json']);
// Lo que el propio proceso reescribe o no es código fuente: se ignora para no
// entrar en un ciclo de actualizaciones.
const IGNORAR = /(^|[\\/])(node_modules|graphify-out|\.dart_tool|build|dist)([\\/]|$)/;

let temporizador = null;
let ocupado = false;
let pendiente = false;

function programar(archivo) {
    pendiente = true;
    clearTimeout(temporizador);
    temporizador = setTimeout(correr, ESPERA_MS);
    if (archivo) console.log(`[vigilante] cambio: ${archivo}`);
}

function correr() {
    if (ocupado) return;
    ocupado = true;
    pendiente = false;
    try {
        actualizarGrafo();
    } finally {
        ocupado = false;
        // Si hubo cambios mientras se actualizaba, se vuelve a programar.
        if (pendiente) programar();
    }
}

for (const carpeta of CARPETAS) {
    const ruta = path.join(RAIZ, carpeta);
    if (!fs.existsSync(ruta)) continue;
    fs.watch(ruta, { recursive: true }, (_evento, nombre) => {
        if (!nombre || IGNORAR.test(nombre) || !EXTENSIONES.has(path.extname(nombre))) return;
        programar(`${carpeta}/${nombre.replaceAll('\\', '/')}`);
    });
}
console.log(`[vigilante] Observando ${CARPETAS.join(', ')}. El grafo se actualiza ${ESPERA_MS / 1000} s después del último cambio.`);
