// Regenera el mapa de arquitectura y el cerebro Graphify (graph.json,
// GRAPH_REPORT.md, graph.html y MAPA-CEREBRO.html) siguiendo los pasos de
// graphify-out/LEEME.md. Lo usa el vigilante (vigilar-grafo.mjs) y también
// se puede ejecutar a mano desde la raíz:  node docs/architecture/tools/actualizar-grafo.mjs
// Solo lee el código local: no usa .env, credenciales ni datos de producción.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SALIDA = path.join(RAIZ, 'graphify-out');
const CANDADO = path.join(SALIDA, '.actualizando');
const REGISTRO = path.join(SALIDA, 'actualizacion.log');

function registrar(texto) {
    const linea = `[${new Date().toLocaleString('es-PE')}] ${texto}\n`;
    fs.appendFileSync(REGISTRO, linea);
    process.stdout.write(linea);
}

function ejecutar(nombre, comando, argumentos) {
    const r = spawnSync(comando, argumentos, {
        cwd: RAIZ,
        encoding: 'utf8',
        env: { ...process.env, GRAPHIFY_NO_AUTO_REFRESH: '1', PYTHONIOENCODING: 'utf-8' },
        maxBuffer: 64 * 1024 * 1024,
    });
    if (r.status !== 0) {
        const detalle = (r.stderr || r.stdout || String(r.error || '')).trim().split('\n').slice(-5).join(' | ');
        throw new Error(`${nombre} falló: ${detalle}`);
    }
}

export function actualizarGrafo() {
    fs.mkdirSync(SALIDA, { recursive: true });
    // Un candado de más de 15 minutos se considera abandonado.
    if (fs.existsSync(CANDADO) && Date.now() - fs.statSync(CANDADO).mtimeMs < 15 * 60 * 1000) {
        registrar('Ya hay una actualización en curso; se omite esta.');
        return false;
    }
    fs.writeFileSync(CANDADO, String(process.pid));
    const inicio = Date.now();
    try {
        const python = fs.readFileSync(path.join(SALIDA, '.graphify_python'), 'utf8').trim();
        if (!fs.existsSync(python)) throw new Error(`No existe el Python de Graphify registrado en .graphify_python (${python})`);
        const herramientas = 'docs/architecture/tools';
        ejecutar('Mapa de arquitectura', process.execPath, [`${herramientas}/actualizar-mapa.mjs`]);
        ejecutar('Detección', python, [`${herramientas}/generar-grafo-graphify.py`, '--detectar']);
        ejecutar('Grafo', python, [`${herramientas}/generar-grafo-graphify.py`]);
        ejecutar('Visor del grafo', python, ['-m', 'graphify', 'export', 'html']);
        ejecutar('Mapa jerárquico', python, ['-m', 'graphify', 'tree', '--output', 'graphify-out/MAPA-CEREBRO.html', '--label', 'Librería del Saber · Mapa del proyecto']);
        ejecutar('Visores sin conexión', python, [`${herramientas}/preparar-visores-graphify.py`]);
        ejecutar('Verificación', python, [`${herramientas}/verificar-grafo-graphify.py`]);
        registrar(`Grafo actualizado en ${Math.round((Date.now() - inicio) / 1000)} s.`);
        return true;
    } catch (error) {
        registrar(`ERROR: ${error.message}`);
        return false;
    } finally {
        fs.rmSync(CANDADO, { force: true });
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = actualizarGrafo() ? 0 : 1;
}
