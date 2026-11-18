import fs from 'node:fs';
import path from 'node:path';
import { argumentos, bloque } from './extraer-relaciones.mjs';

export function endpointsSwift(texto, archivo = '') {
    return [...texto.matchAll(/method:\s*\.(get|post|put|delete)\s*,\s*pathComponents:\s*\[([^\]]+)\]/g)].map(m => {
        const componentes = argumentos(`(${m[2]})`).map(value => {
            const literal = /^"([^"]+)"$/.exec(value);
            if (literal) return literal[1];
            const parametro = /(?:String\()?([A-Za-z_]\w*)\)?$/.exec(value);
            return ':' + (parametro?.[1] || 'param');
        });
        const llamada = bloque(texto, texto.lastIndexOf('(', m.index));
        return { method: m[1].toUpperCase(), path: '/' + componentes.join('/'), file: archivo, line: texto.slice(0, m.index).split('\n').length, requiresAuthorization: !/requiresAuthorization:\s*false/.test(llamada) };
    });
}

export function analizarSwift(raiz) {
    const base = path.join(raiz, 'ios_swift_app');
    const relativo = file => path.relative(raiz, file).split(path.sep).join('/');
    const listar = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listar(path.join(dir, e.name)) : e.name.endsWith('.swift') ? [path.join(dir, e.name)] : []);
    const carpetas = ['App','Components','Content','Core','Design','Models','Services','Utilities','ViewModels','Views'];
    const fuentes = new Map(carpetas.flatMap(dir => listar(path.join(base, dir))).map(file => [relativo(file), fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')]));
    const simbolos = new Map();
    const registrar = (nombre, archivo) => {
        if (!simbolos.has(nombre)) simbolos.set(nombre, new Set());
        simbolos.get(nombre).add(archivo);
    };
    for (const [file,text] of fuentes) {
        for (const m of text.matchAll(/\b(?:struct|class|enum|actor|protocol|typealias)\s+(\w+)/g)) registrar(m[1],file);
        for (const m of text.matchAll(/^(?:(?:public|private|internal)\s+)?func\s+(\w+)/gm)) registrar(m[1],file);
        if (/\bextension\s+View\b/.test(text)) for (const m of text.matchAll(/\bfunc\s+(\w+)/g)) registrar(m[1],file);
    }
    const grafo = {};
    for (const [file,text] of fuentes) {
        const deps = new Set();
        for (const token of new Set(text.match(/\b[A-Za-z_]\w*\b/g) || [])) for (const target of simbolos.get(token) || []) if (target !== file) deps.add(target);
        grafo[file] = [...deps];
    }
    for (const [file,text] of fuentes) for (const m of text.matchAll(/\bextension\s+(\w+)/g)) for (const target of simbolos.get(m[1]) || []) if (target !== file) grafo[target].push(file);
    for (const file of Object.keys(grafo)) grafo[file] = [...new Set(grafo[file])].sort();
    const entradas = [...fuentes].filter(([,text]) => /@main\b/.test(text)).map(([file]) => file);
    const usados = new Set(), pendientes = [...entradas];
    while (pendientes.length) { const file = pendientes.pop(); if (usados.has(file)) continue; usados.add(file); pendientes.push(...(grafo[file] || [])); }
    const main = fuentes.get('ios_swift_app/App/MainView.swift') || '';
    return {
        archivos: fuentes.size,
        pruebas: listar(path.join(base, 'Tests')).map(relativo),
        entradas,
        navegacion: [...main.matchAll(/\.tabItem\s*\{\s*Label\("([^"]+)"/g)].map(m => m[1]),
        endpoints: [...fuentes].flatMap(([file,text]) => endpointsSwift(text,file)),
        grafo,
        posiblesNoUsados: [...fuentes.keys()].filter(file => !usados.has(file)),
        metodo: 'Referencias estáticas aproximadas por símbolos y extensiones Swift; no equivale a imports por archivo ni a una compilación de Xcode.'
    };
}
