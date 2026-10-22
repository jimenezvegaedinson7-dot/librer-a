// Analizador estático del proyecto C:\libreria. Solo lee código; no modifica nada.
// Uso: node docs/architecture/tools/analizar.mjs <salida.json>
// Normalmente se ejecuta a través de: node docs/architecture/tools/actualizar-mapa.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { argumentos, bloque, cuerposMetodosDart, dependenciasPubspec, endpointsFetchApi, endpointsPeticionCliente, metodosUsadosDart, miembrosObjeto, propagarEndpoints, resolverMiddlewares, tablasDeclaradas } from './extraer-relaciones.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
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
const DIR_MIG = path.join(RAIZ, 'backend/database/migrations');
const archivosMigraciones = fs.readdirSync(DIR_MIG).filter(f => f.endsWith('.sql')).map(f => path.join(DIR_MIG, f));
const fuentesTablas = ['backend/database/schema.sql', ...archivosMigraciones.map(rel), 'backend/src/config/migraciones.js'];
const fuentesPorTabla = {};
for (const fuente of fuentesTablas) for (const tabla of tablasDeclaradas(leer(path.join(RAIZ, fuente)))) {
    (fuentesPorTabla[tabla] ||= []).push(fuente);
}
const tablasEsquema = tablasDeclaradas(leer(path.join(RAIZ, 'backend/database/schema.sql')));
const TABLAS_REALES = new Set(
    Object.keys(fuentesPorTabla),
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
        line: server.slice(0, m.index).split('\n').length,
        controller: 'inline (server.js)',
        handler: 'inline',
    });
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

// Las integraciones aisladas pueden interponer un servicio entre controlador
// y modelo. Detenerse en el primer modelo evita atribuir consultas de módulos
// importados solo por constantes SQL (por ejemplo, PRECIO_FINAL_SQL).
function tablasDeServicio(nombre, vistos = new Set()) {
    if (vistos.has(nombre)) return [];
    vistos.add(nombre);
    const archivo = path.join(BACK, 'src/services', nombre);
    if (!fs.existsSync(archivo)) return [];
    const resultado = new Set();
    for (const m of leer(archivo).matchAll(/require\(['"]\.\.\/(models|services)\/([\w.]+)['"]\)/g)) {
        const destino = m[2].endsWith('.js') ? m[2] : `${m[2]}.js`;
        const usadas = m[1] === 'models' ? modelos[destino]?.tables || [] : tablasDeServicio(destino, vistos);
        usadas.forEach(t => resultado.add(t));
    }
    return [...resultado];
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
    const expandirMiddlewares = resolverMiddlewares(txt);
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
        if (m[1] === 'use') { globales.push(...expandirMiddlewares(args)); continue; }
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
            else if (mf.includes('.service.')) tablasDeServicio(mf).forEach(t => tablasUsadas.add(t));
        }
        endpoints.push({
            method: m[1].toUpperCase(),
            path: (base + (ruta === '/' ? '' : ruta)) || base,
            middleware: [...new Set([...globales, ...expandirMiddlewares(resto.slice(0, -1))])],
            routeFile: archivo,
            line: txt.slice(0, m.index).split('\n').length,
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
for (const p of archivosFront.filter((p) => /Service\.js$|client\.js$|clienteApi\.js$|useApiPublica\.js$|useCarrusel\.js$/.test(p))) {
    const txt = leer(p);
    const fns = {};
    for (const m of txt.matchAll(/export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g)) {
        const cuerpo = bloque(txt, txt.indexOf('{', m.index + m[0].length - 1));
        const llamadas = [...cuerpo.matchAll(/client\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/g)].map((x) => ({ method: x[1].toUpperCase(), path: `/api${normalizar(x[3])}` }));
        llamadas.push(...endpointsPeticionCliente(cuerpo, normalizar));
        if (/useCarrusel\.js$/.test(p)) llamadas.push(...[...cuerpo.matchAll(/fetch\(\s*`\$\{[^}]+\}([^`]+)`/g)].map(x=>({method:'GET',path:`/api${normalizar(x[1])}`})));
        // Los hooks públicos usan fetch sin JWT mediante obtener().
        if (/useApiPublica\.js$/.test(p)) {
            llamadas.push(...[...cuerpo.matchAll(/\bobtener\s*\(\s*(['"`])([^'"`]+)\1/g)]
                .map(x => ({ method: 'GET', path: `/api${normalizar(x[2])}` })));
        }
        const delega = [...cuerpo.matchAll(/(?:return\s+|await\s+)(\w+)\(/g)].map((x) => x[1]).filter((n) => n !== 'datosDe');
        fns[m[1]] = { endpoints: llamadas, delegates: delega };
    }
    if (/clienteApi\.js$/.test(p)) {
        for (const [nombre, cuerpo] of Object.entries(miembrosObjeto(txt, 'clienteApi'))) {
            fns[nombre] = { endpoints: endpointsPeticionCliente(cuerpo, normalizar), delegates: [] };
        }
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
    for (const m of txt.matchAll(/import\s+(\w+)\s+from\s*'([^']*\/useCarrusel)'/g)) {
        (usoServicios[rel(p)] ||= []).push(`${rel(path.resolve(path.dirname(p),m[2]))}.js#${m[1]}`);
    }
    for (const m of txt.matchAll(/import\s*\{[^}]*\bclienteApi\b[^}]*\}\s*from\s*'([^']+)'/g)) {
        const destino = rel(path.resolve(path.dirname(p),m[1])) + '.js';
        for (const llamada of txt.matchAll(/clienteApi\.(\w+)\(/g)) {
            (usoServicios[rel(p)] ||= []).push(`${destino}#${llamada[1]}`);
        }
    }
    for (const m of txt.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+Service|[^']*\/client|[^']*\/useApiPublica)'/g)) {
        const destino = rel(path.resolve(path.dirname(p), m[2])) + '.js';
        for (const n of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
            (usoServicios[rel(p)] ||= []).push(`${destino}#${n}`);
        }
    }
}

// Rutas del router
const ROUTER = `${FRONT}/app/router/AppRouter.jsx`;
const router = leer(ROUTER);
const routerDir = path.dirname(ROUTER);
const lazys = {};
for (const m of router.matchAll(/const\s+(\w+)\s*=\s*lazyConReintento\(\(\)\s*=>\s*import\('([^']+)'\)\)/g)) lazys[m[1]] = rel(path.resolve(routerDir, m[2])) + '.jsx';
for (const m of router.matchAll(/import\s+(\w+)\s+from\s+'([^']+)'/g)) if (m[2].startsWith('.')) lazys[m[1]] ||= rel(path.resolve(routerDir, m[2])) + '.jsx';
// Exportaciones con nombre cargadas en diferido: import('...').then((m) => ({ default: m.X }))
for (const m of router.matchAll(/const\s+(\w+)\s*=\s*lazyConReintento\(\(\)\s*=>\s*import\('([^']+)'\)\.then/g)) lazys[m[1]] ||= rel(path.resolve(routerDir, m[2])) + '.jsx';
const rutasFront = [];
for (const m of router.matchAll(/path:\s*'([^']+)'\s*,\s*element:\s*([^\n]+)/g)) {
    // El primer componente que no sea un envoltorio <Suspense>.
    const comp = /<(?!Suspense\b|TiendaProvider\b|RutaProtegida\b|RutaPorRol\b)(\w+)/.exec(m[2]);
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
for (const p of archivosFront) {
    const directos = endpointsFetchApi(leer(p), normalizar).map(e => `${e.method} ${e.path}`);
    if (directos.length) endpointsPorArchivoFront[rel(p)] = [...new Set([...(endpointsPorArchivoFront[rel(p)] || []), ...directos])].sort();
}

// ─────────────────────────── FLUTTER ───────────────────────────
const FL = `${RAIZ}/flutter_app/lib`;
const archivosDart = listar(FL, (n) => n.endsWith('.dart'));
const constantes = {};
for (const m of leer(`${FL}/utils/constants.dart`).matchAll(/static const String (\w+Path)\s*=\s*'([^']+)'/g)) constantes[m[1]] = m[2];
const api = leer(`${FL}/services/api_service.dart`);
const cuerposApi = cuerposMetodosDart(api);
const endpointsDirectos = {};
for (const [nombre, cuerpo] of Object.entries(cuerposApi)) {
    const llamadas = [];
    for (const c of cuerpo.matchAll(/_dio\.(get|post|put|delete|patch)<(?:[^<>]|<[^<>]*>)*>\(\s*([^,)\n]+(?:\n[^,)]*)?)/g)) {
        let expr = c[2].trim();
        expr = expr.replace(/Constants\.(\w+Path)/g, (_, k) => constantes[k] ?? k).replace(/'\$\{([^}]+)\}([^']*)'/g, (_, a, b) => a + b);
        expr = expr.replace(/^'|'$/g, '').replace(/\$\{?(\w+)\}?/g, ':$1').replace(/'/g, '');
        llamadas.push({ method: c[1].toUpperCase(), path: `/api${expr.startsWith('/') ? expr : `/${expr}`}` });
    }
    endpointsDirectos[nombre] = llamadas;
}
const delegadosApi = Object.fromEntries(Object.entries(cuerposApi).map(([nombre, cuerpo]) => [nombre,
    [...new Set([...cuerpo.matchAll(/(?<![\w.])(\w+)\s*\(/g)].map(m => m[1]).filter(n => n !== nombre && Object.hasOwn(cuerposApi, n)))],
]));
const metodosApi = propagarEndpoints(endpointsDirectos, delegadosApi);

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
    const metodos = metodosUsadosDart(txt, metodosApi);
    if (metodos.length) usoApiDart[rel(p)] = metodos;
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
    backend: { montajes, endpoints, controladores, modelos, grafo: grafoBack, ciclos: ciclos(grafoBack), archivos: Object.keys(grafoBack).length,
        tablasEsquema, tablasDeclaradas: [...TABLAS_REALES].sort(), fuentesPorTabla, migraciones: archivosMigraciones.map(rel) },
    frontend: { rutas: rutasFront, servicios, usoServicios, endpointsPorArchivo: endpointsPorArchivoFront, grafo: grafoFront, ciclos: ciclos(grafoFront), archivos: archivosFront.length },
    flutter: { constantes, metodosApi, usoApi: usoApiDart, grafo: grafoDart, ciclos: ciclos(grafoDart), paquetes: paquetesDart, archivos: archivosDart.length,
        dependencias: dependenciasPubspec(leer(path.join(FL, '../pubspec.yaml')), 'dependencies'), devDependencias: dependenciasPubspec(leer(path.join(FL, '../pubspec.yaml')), 'dev_dependencies') },
    posiblesNoUsados: {
        backend: noUsados(grafoBack, ['server.js', '/test', 'test-integration', '/scripts/', 'run_migration', '_test_smtp']),
        frontend: noUsados(grafoFront, ['main.jsx']),
        flutter: noUsados(grafoDart, ['main.dart']),
    },
};
fs.writeFileSync(process.argv[2], JSON.stringify(salida, null, 1));
console.log('endpoints backend:', endpoints.length, '| archivos back/front/flutter:', salida.backend.archivos, salida.frontend.archivos, salida.flutter.archivos);
console.log('ciclos back/front/flutter:', salida.backend.ciclos.length, salida.frontend.ciclos.length, salida.flutter.ciclos.length);
