// Analizador estático del proyecto C:\libreria. Solo lee código; no modifica nada.
// Uso: node docs/architecture/tools/analizar.mjs <salida.json>
// Normalmente se ejecuta a través de: node docs/architecture/tools/actualizar-mapa.mjs
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = 'C:/libreria';
const leer = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/');
const IGNORAR = new Set(['node_modules', 'build', 'dist', '.dart_tool', '.git', 'coverage', 'uploads', '.vercel', '__preview']);

function listar(dir, filtro, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORAR.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) listar(p, filtro, out);
        else if (filtro(e.name)) out.push(p);
    }
    return out;
}

// Extrae el texto entre el paréntesis/llave que abre en `ini` y su cierre (respetando strings y plantillas).
function bloque(texto, ini) {
    const abre = texto[ini];
    const cierra = abre === '(' ? ')' : abre === '{' ? '}' : ']';
    let prof = 0;
    let cadena = null;
    for (let i = ini; i < texto.length; i++) {
        const c = texto[i];
        if (cadena) {
            if (c === '\\') { i++; continue; }
            if (c === cadena) cadena = null;
            continue;
        }
        if (c === '"' || c === "'" || c === '`') { cadena = c; continue; }
        if (c === '/' && texto[i + 1] === '/') { i = texto.indexOf('\n', i); if (i < 0) break; continue; }
        if (c === abre) prof++;
        else if (c === cierra) { prof--; if (prof === 0) return texto.slice(ini, i + 1); }
    }
    return texto.slice(ini);
}

// Separa argumentos de nivel superior de una llamada "( ... )".
function argumentos(llamada) {
    const interior = llamada.slice(1, -1);
    const args = [];
    let prof = 0, actual = '', cadena = null;
    for (let i = 0; i < interior.length; i++) {
        const c = interior[i];
        if (cadena) { actual += c; if (c === '\\') { actual += interior[++i]; continue; } if (c === cadena) cadena = null; continue; }
        if (c === '"' || c === "'" || c === '`') { cadena = c; actual += c; continue; }
        if ('({['.includes(c)) prof++;
        if (')}]'.includes(c)) prof--;
        if (c === ',' && prof === 0) { args.push(actual.trim()); actual = ''; continue; }
        actual += c;
    }
    if (actual.trim()) args.push(actual.trim());
    return args;
}

// Cuerpos de funciones con nombre: const X = async (...) => {...} | async function X(...) {...} | function X
function funciones(texto) {
    const res = {};
    const re = /(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>\s*\{|(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{|^\s{4}(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/gm;
    let m;
    while ((m = re.exec(texto))) {
        const nombre = m[1] || m[2] || m[3];
        if (['if', 'for', 'while', 'switch', 'catch', 'return'].includes(nombre)) continue;
        const ini = texto.indexOf('{', m.index + m[0].length - 1);
        res[nombre] = bloque(texto, ini);
    }
    return res;
}

// Tablas referenciadas en SQL
// Solo cuentan las tablas que existen en schema.sql y las migraciones (evita falsos positivos como EXTRACT(... FROM columna)).
const DIR_MIG = 'C:/libreria/backend/database/migrations';
const TABLAS_REALES = new Set(
    [...fs.readdirSync(DIR_MIG).map((x) => `${DIR_MIG}/${x}`), 'C:/libreria/backend/database/schema.sql']
        .flatMap((p) => [...fs.readFileSync(p, 'utf8').matchAll(/CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)/gi)].map((m) => m[1].toLowerCase())),
);
function tablas(texto) {
    const t = new Set();
    const re = /\b(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM|TABLE(?:\s+IF\s+(?:NOT\s+)?EXISTS)?)\s+([a-z_][a-z0-9_]*)/gi;
    let m;
    while ((m = re.exec(texto))) {
        const n = m[1].toLowerCase();
        if (TABLAS_REALES.has(n)) t.add(n);
    }
    return [...t].sort();
}

// ─────────────────────────── BACKEND ───────────────────────────
const BACK = `${RAIZ}/backend`;
const server = leer(`${BACK}/server.js`);
const requiresServer = {};
for (const m of server.matchAll(/const\s+(\w+)\s*=\s*require\('\.\/src\/routes\/([\w.]+)'\)/g)) requiresServer[m[1]] = `backend/src/routes/${m[2]}.js`;
const montajes = {};
for (const m of server.matchAll(/app\.use\(\s*'([^']+)',\s*(\w+)\s*\)/g)) if (requiresServer[m[2]]) montajes[requiresServer[m[2]]] = m[1];

const endpointsServer = [];
for (const m of server.matchAll(/app\.(get|post|put|delete|patch)\(\s*'([^']+)'([\s\S]*?)(?:async|\(req)/g)) {
    endpointsServer.push({
        method: m[1].toUpperCase(),
        path: m[2],
        middleware: /verificarToken/.test(m[3]) ? ['JWT', ...(/verificarRol\('(\w+)'\)/.exec(m[3]) ? [`rol:${/verificarRol\('(\w+)'\)/.exec(m[3])[1]}`] : [])] : [],
        routeFile: 'backend/server.js',
        controller: 'inline (server.js)',
        handler: 'inline',
    });
}

function nombreMiddleware(arg) {
    if (arg === 'verificarToken') return 'JWT';
    const rol = /verificarRol\('(\w+)'\)/.exec(arg);
    if (rol) return `rol:${rol[1]}`;
    const up = /(\w+)\.single\('(\w+)'\)/.exec(arg);
    if (up) return `${up[1]}(${up[2]})`;
    if (/express\.(urlencoded|json)/.test(arg)) return arg.replace(/\(.*$/, '');
    return arg;
}

const controladores = {};
const modelos = {};
const ctrlDir = `${BACK}/src/controllers`;
const modDir = `${BACK}/src/models`;

for (const f of fs.readdirSync(modDir)) {
    const txt = leer(`${modDir}/${f}`);
    const fns = funciones(txt);
    modelos[f] = {
        file: `backend/src/models/${f}`,
        tables: tablas(txt),
        functions: Object.fromEntries(Object.entries(fns).map(([n, cuerpo]) => [n, tablas(cuerpo)])),
    };
}

for (const f of fs.readdirSync(ctrlDir)) {
    const txt = leer(`${ctrlDir}/${f}`);
    const alias = {};
    for (const m of txt.matchAll(/const\s+(\w+)\s*=\s*require\('\.\.\/(models|services)\/([\w.]+)'\)/g)) alias[m[1]] = `${m[3]}.js`;
    const utilidades = [...txt.matchAll(/require\('\.\.\/(utils|config|services)\/([\w.]+)'\)/g)].map((m) => `backend/src/${m[1]}/${m[2]}.js`);
    const fns = funciones(txt);
    const detalle = {};
    for (const [n, cuerpo] of Object.entries(fns)) {
        const usos = new Set();
        // Recorre también las funciones auxiliares locales que invoca el handler (resolución transitiva).
        const visitados = new Set([n]);
        const pendientes = [cuerpo];
        let sqlDirecto = [];
        while (pendientes.length) {
            const cu = pendientes.pop();
            for (const m of cu.matchAll(/\b(\w+)\s*\.\s*(\w+)\s*\(/g)) if (alias[m[1]]) usos.add(`${alias[m[1]]}#${m[2]}`);
            if (/\b(pool|conexion|connection|client)\s*\.\s*query\s*\(/.test(cu)) sqlDirecto = [...new Set([...sqlDirecto, ...tablas(cu)])];
            for (const m of cu.matchAll(/\b(\w+)\s*\(/g)) {
                if (Object.hasOwn(fns, m[1]) && typeof fns[m[1]] === 'string' && !visitados.has(m[1])) { visitados.add(m[1]); pendientes.push(fns[m[1]]); }
            }
        }
        detalle[n] = { calls: [...usos].sort(), directSqlTables: sqlDirecto };
    }
    controladores[f] = { file: `backend/src/controllers/${f}`, imports: [...new Set([...Object.values(alias).map((a) => (a.includes('service') ? `backend/src/services/${a}` : `backend/src/models/${a}`)), ...utilidades])], functions: detalle };
}

const endpoints = [...endpointsServer];
for (const f of fs.readdirSync(`${BACK}/src/routes`)) {
    const archivo = `backend/src/routes/${f}`;
    const txt = leer(`${RAIZ}/${archivo}`);
    const base = montajes[archivo] || '?';
    const ctrlDe = {};
    for (const m of txt.matchAll(/const\s+\{([^}]+)\}\s*=\s*require\('\.\.\/controllers\/([\w.]+)'\)/g)) for (const n of m[1].split(',').map((s) => s.trim()).filter(Boolean)) ctrlDe[n] = `${m[2]}.js`;
    for (const m of txt.matchAll(/const\s+(\w+)\s*=\s*require\('\.\.\/controllers\/([\w.]+)'\)/g)) ctrlDe[`${m[1]}.*`] = `${m[2]}.js`;
    const globales = [];
    const re = /router\.(use|get|post|put|delete|patch)\s*\(/g;
    let m;
    while ((m = re.exec(txt))) {
        const llamada = bloque(txt, m.index + m[0].length - 1);
        const args = argumentos(llamada);
        if (m[1] === 'use') { globales.push(...args.map(nombreMiddleware)); continue; }
        const ruta = args[0].replace(/^['"`]|['"`]$/g, '');
        const resto = args.slice(1);
        const ultimo = resto[resto.length - 1] || '';
        let handler, controller, inlineModelo = null;
        if (/^async|=>/.test(ultimo)) {
            handler = 'inline';
            controller = `inline (${f})`;
            const mm = /(\w+Model)\.(\w+)\(/.exec(ultimo);
            if (mm) inlineModelo = `${mm[1].replace('Model', '')}.model.js#${mm[2]}`;
        } else {
            const partes = ultimo.split('.');
            handler = partes.length === 2 ? partes[1] : ultimo;
            controller = partes.length === 2 ? ctrlDe[`${partes[0]}.*`] : ctrlDe[ultimo];
        }
        const ctrl = controller && controladores[controller];
        const det = ctrl && ctrl.functions[handler];
        const llamadas = det ? det.calls : inlineModelo ? [inlineModelo] : [];
        const tablasUsadas = new Set(det ? det.directSqlTables : []);
        for (const c of llamadas) {
            const [mf, fn] = c.split('#');
            const mod = modelos[mf];
            if (mod) (mod.functions[fn] || mod.tables).forEach((t) => tablasUsadas.add(t));
        }
        endpoints.push({
            method: m[1].toUpperCase(),
            path: (base + (ruta === '/' ? '' : ruta)) || base,
            middleware: [...globales, ...resto.slice(0, -1).map(nombreMiddleware)],
            routeFile: archivo,
            controller: controller ? `backend/src/controllers/${controller}`.replace('backend/src/controllers/inline', 'inline') : '?',
            handler,
            calls: llamadas,
            tables: [...tablasUsadas].sort(),
        });
    }
}

// ─────────────────────────── FRONTEND ───────────────────────────
const FRONT = `${RAIZ}/frontend/src`;
const archivosFront = listar(FRONT, (n) => /\.(jsx?|mjs)$/.test(n));
const normalizar = (url) => url.replace(/\$\{[^}]*\}/g, ':param').replace(/\?.*$/, '');
const servicios = {};
for (const p of archivosFront.filter((p) => /Service\.js$|client\.js$/.test(p))) {
    const txt = leer(p);
    const fns = {};
    for (const m of txt.matchAll(/export\s+async\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g)) {
        const cuerpo = bloque(txt, txt.indexOf('{', m.index + m[0].length - 1));
        const llamadas = [...cuerpo.matchAll(/client\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/g)].map((x) => ({ method: x[1].toUpperCase(), path: `/api${normalizar(x[3])}` }));
        const delega = [...cuerpo.matchAll(/(?:return\s+|await\s+)(\w+)\(/g)].map((x) => x[1]).filter((n) => n !== 'datosDe');
        fns[m[1]] = { endpoints: llamadas, delegates: delega };
    }
    for (const m of txt.matchAll(/export\s*\{([^}]+)\}/g)) for (const n of m[1].split(',').map((s) => s.trim()).filter(Boolean)) if (!fns[n]) fns[n] = { reexport: true, endpoints: [], delegates: [] };
    servicios[rel(p)] = fns;
}
// Resolver reexportaciones / delegaciones a otros servicios importados
for (const [archivo, fns] of Object.entries(servicios)) {
    const txt = leer(`${RAIZ}/${archivo}`);
    const origen = {};
    for (const m of txt.matchAll(/(?:import|export)\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
        const destino = rel(path.resolve(path.dirname(`${RAIZ}/${archivo}`), m[2])) + '.js';
        for (const n of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) origen[n] = destino;
    }
    for (const [n, info] of Object.entries(fns)) {
        const extra = [];
        for (const d of [...info.delegates, ...(info.reexport ? [n] : [])]) {
            const dest = origen[d];
            if (dest && servicios[dest]?.[d]) extra.push(...servicios[dest][d].endpoints.map((e) => ({ ...e, via: `${dest}#${d}` })));
            else if (d !== n && fns[d]) extra.push(...fns[d].endpoints.map((e) => ({ ...e, via: `${archivo}#${d}` })));
        }
        info.endpoints.push(...extra);
    }
}

function importsDe(p, txt) {
    const res = [];
    for (const m of txt.matchAll(/import\s+(?:[\w*{}\s,]+\s+from\s+)?'([^']+)'/g)) {
        if (!m[1].startsWith('.')) continue;
        let destino = path.resolve(path.dirname(p), m[1]);
        const candidatos = [destino, `${destino}.js`, `${destino}.jsx`, `${destino}/index.js`, `${destino}/index.jsx`];
        const hallado = candidatos.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
        if (hallado) res.push(rel(hallado));
    }
    for (const m of txt.matchAll(/import\(\s*'([^']+)'\s*\)/g)) {
        const destino = path.resolve(path.dirname(p), m[1]);
        const hallado = [`${destino}.jsx`, `${destino}.js`, destino].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
        if (hallado) res.push(rel(hallado));
    }
    return [...new Set(res)];
}

const grafoFront = {};
const usoServicios = {};
for (const p of archivosFront) {
    const txt = leer(p);
    grafoFront[rel(p)] = importsDe(p, txt);
    for (const m of txt.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+Service|[^']*\/client)'/g)) {
        const destino = rel(path.resolve(path.dirname(p), m[2])) + '.js';
        for (const n of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
            (usoServicios[rel(p)] ||= []).push(`${destino}#${n}`);
        }
    }
}

// Rutas del router
const router = leer(`${FRONT}/routes/AppRouter.jsx`);
const lazys = {};
for (const m of router.matchAll(/const\s+(\w+)\s*=\s*lazyConReintento\(\(\)\s*=>\s*import\('([^']+)'\)\)/g)) lazys[m[1]] = rel(path.resolve(`${FRONT}/routes`, m[2])) + '.jsx';
for (const m of router.matchAll(/import\s+(\w+)\s+from\s+'([^']+)'/g)) if (m[2].startsWith('.')) lazys[m[1]] ||= rel(path.resolve(`${FRONT}/routes`, m[2])) + '.jsx';
const rutasFront = [];
for (const m of router.matchAll(/path:\s*'([^']+)'\s*,\s*element:\s*([^\n]+)/g)) {
    const comp = /<(\w+)/.exec(m[2]);
    rutasFront.push({ path: m[1], element: m[2].trim().replace(/,\s*$/, ''), component: comp ? comp[1] : null, file: comp ? lazys[comp[1]] || null : null });
}

// Endpoints consumidos por cada archivo del frontend (directa o transitivamente vía servicios)
const endpointsPorArchivoFront = {};
for (const [archivo, usos] of Object.entries(usoServicios)) {
    const eps = [];
    for (const u of usos) {
        const [sf, fn] = u.split('#');
        (servicios[sf]?.[fn]?.endpoints || []).forEach((e) => eps.push(`${e.method} ${e.path}`));
    }
    endpointsPorArchivoFront[archivo] = [...new Set(eps)].sort();
}

// ─────────────────────────── FLUTTER ───────────────────────────
const FL = `${RAIZ}/flutter_app/lib`;
const archivosDart = listar(FL, (n) => n.endsWith('.dart'));
const constantes = {};
for (const m of leer(`${FL}/utils/constants.dart`).matchAll(/static const String (\w+Path)\s*=\s*'([^']+)'/g)) constantes[m[1]] = m[2];
const api = leer(`${FL}/services/api_service.dart`);
const metodosApi = {};
const reMet = /^\s{2}Future<[^\n]*?>\s+(\w+)\s*\(/gm;
let mm;
const posiciones = [];
while ((mm = reMet.exec(api))) posiciones.push({ nombre: mm[1], ini: mm.index });
posiciones.forEach((pos, i) => {
    const cuerpo = api.slice(pos.ini, posiciones[i + 1]?.ini ?? api.length);
    const llamadas = [];
    for (const c of cuerpo.matchAll(/_dio\.(get|post|put|delete|patch)<(?:[^<>]|<[^<>]*>)*>\(\s*([^,)\n]+(?:\n[^,)]*)?)/g)) {
        let expr = c[2].trim();
        expr = expr.replace(/Constants\.(\w+Path)/g, (_, k) => constantes[k] ?? k).replace(/'\$\{([^}]+)\}([^']*)'/g, (_, a, b) => a + b);
        expr = expr.replace(/^'|'$/g, '').replace(/\$\{?(\w+)\}?/g, ':$1').replace(/'/g, '');
        llamadas.push({ method: c[1].toUpperCase(), path: `/api${expr.startsWith('/') ? expr : `/${expr}`}` });
    }
    metodosApi[pos.nombre] = llamadas;
    pos.cuerpo = cuerpo;
});
// Métodos que reutilizan otros métodos de ApiService (p. ej. buscarLibros -> obtenerLibros)
for (const pos of posiciones) {
    for (const m of pos.cuerpo.matchAll(/await\s+(\w+)\s*\(/g)) {
        if (m[1] !== pos.nombre && metodosApi[m[1]]?.length) {
            metodosApi[pos.nombre].push(...metodosApi[m[1]].map((e) => ({ ...e, via: m[1] })));
        }
    }
}

const grafoDart = {};
const usoApiDart = {};
for (const p of archivosDart) {
    const txt = leer(p);
    const imps = [];
    for (const m of txt.matchAll(/^import\s+'([^']+)'/gm)) {
        if (m[1].startsWith('package:') || m[1].startsWith('dart:')) continue;
        const destino = path.resolve(path.dirname(p), m[1]);
        if (fs.existsSync(destino)) imps.push(rel(destino));
    }
    grafoDart[rel(p)] = imps;
    const metodos = new Set([...txt.matchAll(/(?:ApiService\.instance|_api|api)\s*\.\s*(\w+)\s*\(/g)].map((m) => m[1]).filter((n) => metodosApi[n]));
    if (metodos.size) usoApiDart[rel(p)] = [...metodos].sort();
}
const paquetesDart = [...new Set(archivosDart.flatMap((p) => [...leer(p).matchAll(/^import\s+'package:(\w+)\//gm)].map((m) => m[1])))].filter((n) => n !== 'libreria_app').sort();

// ─────────────────────────── GRAFO BACKEND + CICLOS ───────────────────────────
const archivosBack = listar(`${BACK}`, (n) => n.endsWith('.js')).filter((p) => !/node_modules/.test(p));
const grafoBack = {};
for (const p of archivosBack) {
    const txt = leer(p);
    const imps = [];
    for (const m of txt.matchAll(/require\(\s*'(\.[^']+)'\s*\)/g)) {
        const destino = path.resolve(path.dirname(p), m[1]);
        const hallado = [destino, `${destino}.js`, `${destino}/index.js`].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
        if (hallado) imps.push(rel(hallado));
    }
    grafoBack[rel(p)] = [...new Set(imps)];
}

function ciclos(grafo) {
    const res = [];
    const estado = {};
    const pila = [];
    const visitar = (n) => {
        estado[n] = 1; pila.push(n);
        for (const v of grafo[n] || []) {
            if (estado[v] === 1) res.push([...pila.slice(pila.indexOf(v)), v]);
            else if (!estado[v]) visitar(v);
        }
        pila.pop(); estado[n] = 2;
    };
    Object.keys(grafo).forEach((n) => { if (!estado[n]) visitar(n); });
    return res;
}

function noUsados(grafo, entradas) {
    const usados = new Set(Object.values(grafo).flat());
    return Object.keys(grafo).filter((f) => !usados.has(f) && !entradas.some((e) => f.includes(e)));
}

const salida = {
    generado: new Date().toISOString(),
    backend: { montajes, endpoints, controladores, modelos, grafo: grafoBack, ciclos: ciclos(grafoBack), archivos: Object.keys(grafoBack).length },
    frontend: { rutas: rutasFront, servicios, usoServicios, endpointsPorArchivo: endpointsPorArchivoFront, grafo: grafoFront, ciclos: ciclos(grafoFront), archivos: archivosFront.length },
    flutter: { constantes, metodosApi, usoApi: usoApiDart, grafo: grafoDart, ciclos: ciclos(grafoDart), paquetes: paquetesDart, archivos: archivosDart.length },
    posiblesNoUsados: {
        backend: noUsados(grafoBack, ['server.js', '/test', 'test-integration', '/scripts/', 'run_migration', '_test_smtp']),
        frontend: noUsados(grafoFront, ['main.jsx']),
        flutter: noUsados(grafoDart, ['main.dart']),
    },
};
fs.writeFileSync(process.argv[2], JSON.stringify(salida, null, 1));
console.log('endpoints backend:', endpoints.length, '| archivos back/front/flutter:', salida.backend.archivos, salida.frontend.archivos, salida.flutter.archivos);
console.log('ciclos back/front/flutter:', salida.backend.ciclos.length, salida.frontend.ciclos.length, salida.flutter.ciclos.length);
