// Extractores locales y deterministas: no ejecutan código de la aplicación.
export function tablasDeclaradas(texto) {
    const sql = texto.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return [...new Set([...sql.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?!IF\b)([a-z_]\w*)/gi)].map(m => m[1].toLowerCase()))].sort();
}

export function bloque(texto, ini) {
    const abre = texto[ini], cierra = { '(': ')', '{': '}', '[': ']' }[abre];
    let profundidad = 0, cadena = null;
    for (let i = ini; i < texto.length; i++) {
        const c = texto[i];
        if (cadena) {
            if (c === '\\') i++;
            else if (c === cadena) cadena = null;
            continue;
        }
        if ('"\'`'.includes(c)) { cadena = c; continue; }
        if (c === '/' && texto[i + 1] === '/') { i = texto.indexOf('\n', i); if (i < 0) break; continue; }
        if (c === '/' && texto[i + 1] === '*') { const fin = texto.indexOf('*/', i + 2); if (fin < 0) break; i = fin + 1; continue; }
        if (c === abre) profundidad++;
        else if (c === cierra && --profundidad === 0) return texto.slice(ini, i + 1);
    }
    return texto.slice(ini);
}

export function argumentos(llamada) {
    const interior = llamada.slice(1, -1), args = [];
    let profundidad = 0, actual = '', cadena = null;
    for (let i = 0; i < interior.length; i++) {
        const c = interior[i];
        if (cadena) { actual += c; if (c === '\\') actual += interior[++i]; else if (c === cadena) cadena = null; continue; }
        if ('"\'`'.includes(c)) { cadena = c; actual += c; continue; }
        if ('({['.includes(c)) profundidad++;
        if (')}]'.includes(c)) profundidad--;
        if (c === ',' && profundidad === 0) { args.push(actual.trim()); actual = ''; }
        else actual += c;
    }
    if (actual.trim()) args.push(actual.trim());
    return args;
}

export function nombreMiddleware(arg) {
    if (arg === 'verificarToken') return 'JWT';
    const roles = /^verificarRol\(\s*(?:['"](\w+)['"]|ROLES\.(\w+))\s*\)$/.exec(arg);
    if (roles) return `rol:${(roles[1] || roles[2]).toLowerCase()}`;
    const upload = /(\w+)\.single\(['"](\w+)['"]\)/.exec(arg);
    if (upload) return `${upload[1]}(${upload[2]})`;
    if (/express\.(urlencoded|json)/.test(arg)) return arg.replace(/\(.*$/, '');
    return arg;
}

export function resolverMiddlewares(texto) {
    const arrays = {};
    for (const m of texto.matchAll(/(?:const|let)\s+(\w+)\s*=\s*\[/g)) {
        const contenido = bloque(texto, m.index + m[0].length - 1);
        arrays[m[1]] = argumentos(`(${contenido.slice(1, -1)})`);
    }
    const expandir = (arg, vistos = new Set()) => {
        const nombre = arg.trim().replace(/^\.\.\.\s*/, '');
        if (!Object.hasOwn(arrays, nombre) || vistos.has(nombre)) return [nombreMiddleware(arg.trim())];
        return arrays[nombre].flatMap(item => expandir(item, new Set([...vistos, nombre])));
    };
    return args => [...new Set(args.flatMap(arg => expandir(arg)))];
}

export function endpointsPeticionCliente(cuerpo, normalizar) {
    const endpoints = [];
    for (const m of cuerpo.matchAll(/\bpeticionCliente\s*\(/g)) {
        const args = argumentos(bloque(cuerpo, m.index + m[0].length - 1));
        const ruta = /^(['"`])([\s\S]*)\1$/.exec(args[0] || '');
        if (!ruta) continue;
        const method = /\bmethod\s*:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/.exec(args[1] || '')?.[1] || 'GET';
        endpoints.push({ method, path: `/api${normalizar(ruta[2])}` });
    }
    return endpoints;
}

// Fetch público directo, también dentro de componentes/hooks locales. Solo
// reconoce la base configurada de la API, no imágenes ni hosts arbitrarios.
export function endpointsFetchApi(cuerpo, normalizar) {
    const endpoints = [];
    for (const m of cuerpo.matchAll(/\bfetch\s*\(/g)) {
        const args = argumentos(bloque(cuerpo, m.index + m[0].length - 1));
        const ruta = /^`\$\{env\.apiUrl\}(\/[^`]+)`$/.exec(args[0] || '');
        if (!ruta) continue;
        const opciones = args[1] || '';
        const method = /\bmethod\s*:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/.exec(opciones)?.[1];
        if (!method && /\bmethod\s*[:},]/.test(opciones)) continue;
        endpoints.push({ method: method || 'GET', path: `/api${normalizar(ruta[1])}` });
    }
    return endpoints;
}

export function miembrosObjeto(texto, nombre) {
    const inicio = new RegExp(`\\b${nombre}\\s*=\\s*\\{`).exec(texto);
    if (!inicio) return {};
    const cuerpo = bloque(texto, inicio.index + inicio[0].length - 1);
    const miembros = {};
    for (const item of argumentos(`(${cuerpo.slice(1, -1)})`)) {
        const limpio = item.replace(/^\s*(?:(?:\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)\s*)+/, '').trim();
        const match = /^(\w+)\s*:\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>\s*([\s\S]+)$/.exec(limpio);
        if (match) miembros[match[1]] = match[2];
    }
    return miembros;
}

export function cuerposMetodosDart(texto) {
    const cuerpos = {};
    for (const m of texto.matchAll(/^\s{2}Future<[^\n]+?>\s+(\w+)\s*\(/gm)) {
        const apertura = m.index + m[0].length - 1;
        const finParametros = apertura + bloque(texto, apertura).length;
        const resto = texto.slice(finParametros);
        const cuerpo = /^\s*(?:async\s*)?(\{|=>)/.exec(resto);
        if (!cuerpo) continue;
        const ini = finParametros + cuerpo[0].length - cuerpo[1].length;
        cuerpos[m[1]] = cuerpo[1] === '{' ? bloque(texto, ini) : texto.slice(ini + 2, texto.indexOf(';', ini));
    }
    return cuerpos;
}

export function propagarEndpoints(directos, delegados) {
    const resolver = (nombre, visitados = new Set()) => {
        if (visitados.has(nombre)) return [];
        const vistos = new Set([...visitados, nombre]);
        const endpoints = new Map((directos[nombre] || []).map(e => [`${e.method} ${e.path}`, e]));
        for (const delegado of delegados[nombre] || []) {
            for (const e of resolver(delegado, vistos)) {
                const clave = `${e.method} ${e.path}`;
                if (!endpoints.has(clave)) endpoints.set(clave, { ...e, via: delegado });
            }
        }
        return [...endpoints.values()];
    };
    return Object.fromEntries(Object.keys(directos).map(n => [n, resolver(n)]));
}

export function metodosUsadosDart(texto, metodos) {
    const receptor = /(?:ApiService\.instance|_api|\bapi|\(\s*widget\.api\s*\?\?\s*ApiService\.instance\s*\))\s*\.\s*(\w+)\s*\(/g;
    return [...new Set([...texto.matchAll(receptor)].map(m => m[1]).filter(n => Object.hasOwn(metodos, n)))].sort();
}

export function dependenciasPubspec(texto, seccion) {
    const bloqueSeccion = new RegExp(`^${seccion}:\\s*\\n([\\s\\S]*?)(?=^\\S|$(?![\\s\\S]))`, 'm').exec(texto)?.[1] || '';
    return [...bloqueSeccion.matchAll(/^ {2}([a-zA-Z_]\w*):/gm)].map(m => m[1]).sort();
}
