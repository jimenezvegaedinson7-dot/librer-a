import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function montar({ fallaLectura = false } = {}) {
    const codigo = readFileSync(new URL('../src/public-site/asistente/useMemoriaAsistente.js', import.meta.url), 'utf8')
        .replace(/^import .*;\r?\n/gm, '').replace('export function useMemoriaAsistente', 'function useMemoriaAsistente') + '\nthis.hook=useMemoriaAsistente;';
    const slots = [], efectos = [], timers = new Map(), escrituras = [];
    let cursor = 0, numero = 0;
    let cuenta = { usuario: { id_usuario: 101 }, sesion: { usuario: { id_usuario: 101 }, token: 'fixture-A' } };
    const entorno = {
        structuredClone, sessionStorage: { getItem: () => null, setItem: () => {} },
        useTienda: () => cuenta, firmaSesion: s => s ? `${s.usuario.id_usuario}:${s.token}` : 'invitado',
        useRef: inicial => { const i = cursor++; return slots[i] || (slots[i] = { current: inicial }); },
        useCallback: fn => { cursor++; return fn; },
        useEffect: (fn, deps) => { const i = cursor++, anterior = slots[i]; if (!anterior || deps.some((v, j) => v !== anterior.deps[j])) efectos.push(() => { anterior?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
        setTimeout: fn => { const id = ++numero; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
        clienteApi: {
            memoriaAsistente: s => fallaLectura ? Promise.reject(new Error('fixture-offline')) : s.usuario.id_usuario === 101 ? Promise.resolve({ data: { apodo: 'Cuenta A' } }) : new Promise(() => {}),
            guardarMemoriaAsistente: (datos, sesion) => { escrituras.push({ datos, propietario: sesion.usuario.id_usuario }); return Promise.resolve({}); },
            borrarMemoriaAsistente: async () => {},
        },
    };
    entorno.useLayoutEffect = entorno.useEffect;
    vm.createContext(entorno); vm.runInContext(codigo, entorno);
    const render = () => { cursor = 0; const api = entorno.hook(); while (efectos.length) efectos.shift()(); return api; };
    return { render, escrituras, cambiar: () => { cuenta = { usuario: { id_usuario: 202 }, sesion: { usuario: { id_usuario: 202 }, token: 'fixture-B' } }; }, vencer: () => { const pendientes = [...timers.values()]; timers.clear(); pendientes.forEach(fn => fn()); } };
}
const resolver = () => new Promise(resolve => setImmediate(resolve));
test('el guardado pendiente de A se cancela al cambiar a B', async () => {
    const app = montar(); const a = app.render(); await resolver();
    a.recordar({ apodo: 'Actualización A' }); app.cambiar(); app.render(); app.vencer();
    assert.equal(app.escrituras.length, 0);
});
test('una lectura fallida no sobrescribe la memoria del servidor', async () => {
    const app = montar({ fallaLectura: true }); const api = app.render(); await resolver();
    api.contarVisita(); app.vencer(); assert.equal(app.escrituras.length, 0);
});
test('un guardado normal conserva el propietario y una instantánea de datos', async () => {
    const app = montar(); const api = app.render(); await resolver();
    api.recordar({ apodo: 'Nombre fixture' }); app.vencer();
    assert.equal(app.escrituras[0].propietario, 101);
    assert.equal(app.escrituras[0].datos.apodo, 'Nombre fixture');
});
