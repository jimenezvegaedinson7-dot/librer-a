import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cuerposMetodosDart, dependenciasPubspec, endpointsFetchApi, endpointsPeticionCliente, metodosUsadosDart, miembrosObjeto, propagarEndpoints, resolverMiddlewares, tablasDeclaradas } from './extraer-relaciones.mjs';

test('expande middleware compartido y reconoce el rol cliente sin declararlo público', () => {
    const resolver = resolverMiddlewares("const autenticada=[verificarToken]; const soloCliente=[limite,...autenticada,verificarRol(ROLES.CLIENTE)];");
    assert.deepEqual(resolver(['...soloCliente']), ['limite', 'JWT', 'rol:cliente']);
    assert.deepEqual(resolver(["verificarRol('administrador')"]), ['rol:administrador']);
});

test('detecta llamadas de Dart con transporte inyectado y delegación sin await', () => {
    const texto = `class ApiService {
  Future<void> crear({String? correo}) { return _preparar(); }
  Future<void> _preparar() { return _enviar(); }
  Future<void> _enviar() async { await _dio.post<dynamic>(Constants.crearPath); }
}`;
    const cuerpos = cuerposMetodosDart(texto);
    assert.equal(Object.keys(cuerpos).length, 3);
    assert.match(cuerpos.crear, /return _preparar/);
    const eps = propagarEndpoints({ crear: [], _preparar: [], _enviar: [{ method: 'POST', path: '/api/pagos/crear-orden' }] }, { crear: ['_preparar'], _preparar: ['_enviar'], _enviar: ['crear'] });
    assert.equal(eps.crear[0].path, '/api/pagos/crear-orden');
    assert.deepEqual(metodosUsadosDart('await (widget.api ?? ApiService.instance).crear(correo: email);', eps), ['crear']);
});

test('indexa transportes cliente y métodos de objetos multilínea con comentarios', () => {
    const texto = `export const clienteApi = {
        // Consulta pública
        relacionados: async (id) => { return peticionCliente(\`/libros/\${id}/relacionados\`, {autenticada:false}); },
        registrar: datos => peticionCliente('/reclamaciones', { method: 'POST', body: datos }),
    };`;
    const metodos = miembrosObjeto(texto, 'clienteApi');
    const normalizar = s => s.replace(/\$\{[^}]+\}/g, ':param');
    assert.deepEqual(endpointsPeticionCliente(metodos.relacionados, normalizar), [{ method: 'GET', path: '/api/libros/:param/relacionados' }]);
    assert.deepEqual(endpointsPeticionCliente(metodos.registrar, normalizar), [{ method: 'POST', path: '/api/reclamaciones' }]);
});

test('obtiene dependencias declaradas de pubspec, sin clasificar crypto como transitivo', () => {
    const pub = 'dependencies:\n  flutter:\n    sdk: flutter\n  crypto: ^3.0.7\n  audioplayers: ^6.8.1\n\ndev_dependencies:\n  flutter_test:\n    sdk: flutter\n';
    assert.deepEqual(dependenciasPubspec(pub, 'dependencies'), ['audioplayers', 'crypto', 'flutter']);
    assert.deepEqual(dependenciasPubspec(pub, 'dev_dependencies'), ['flutter_test']);
});

test('fetch de la portada se reconoce sin confundir imágenes o métodos dinámicos', () => {
    const texto = 'fetch(`${env.apiUrl}/anuncios/protagonista`, {signal, headers:{Accept:"application/json"}}); fetch(`${env.apiUrl}/ejemplo`, {method:"PUT"}); fetch(`${env.apiUrl}/otra`, {method}); fetch("https://images.test/libro.jpg");';
    assert.deepEqual(endpointsFetchApi(texto, s => s), [{ method: 'GET', path: '/api/anuncios/protagonista' }, { method: 'PUT', path: '/api/ejemplo' }]);
});

test('una declaración SQL multilínea no crea una tabla fantasma llamada IF', () => {
    const sql = 'CREATE TABLE IF NOT EXISTS\n favoritos (id INT);\ncreate table\n migraciones_datos (nombre TEXT);\n-- CREATE TABLE tabla_de_ejemplo\n';
    assert.deepEqual(tablasDeclaradas(sql), ['favoritos', 'migraciones_datos']);
});

test('el analizador refleja permisos, conexiones y tablas del código real', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const salida = path.join('C:/Users/Edinson/AppData/Local/Temp/opencode', `mapa-regresion-${process.pid}.json`);
    assert.ok(fs.existsSync(path.dirname(salida)));
    try {
        execFileSync(process.execPath, [path.join(dir, 'analizar.mjs'), salida], { stdio: 'pipe' });
        const h = JSON.parse(fs.readFileSync(salida, 'utf8'));
        const memoria = h.backend.endpoints.filter(e => e.path === '/api/asistente/memoria');
        assert.equal(memoria.length, 3);
        for (const e of memoria) { assert.ok(e.middleware.includes('JWT')); assert.ok(e.middleware.includes('rol:cliente')); }
        assert.ok(h.flutter.usoApi['flutter_app/lib/screens/verificacion_email_screen.dart'].includes('verificarEmail'));
        assert.ok(h.flutter.metodosApi.crearOrdenPago.some(e => e.method === 'POST' && e.path === '/api/pagos/crear-orden'));
        assert.ok(h.frontend.servicios['frontend/src/panel/reclamaciones/reclamacionesService.js'].registrarReclamacion.endpoints.some(e => e.method === 'POST' && e.path === '/api/reclamaciones'));
        assert.ok(h.frontend.servicios['frontend/src/web/tienda/clienteApi.js'].relacionados.endpoints.some(e => e.path === '/api/libros/:param/relacionados'));
        assert.equal(h.backend.tablasEsquema.length, 22);
        assert.ok(h.backend.tablasEsquema.includes('portada_config'));
        assert.ok(h.frontend.endpointsPorArchivo['frontend/src/web/secciones/portada3d/PortadaEspacial.jsx'].includes('GET /api/anuncios/protagonista'));
        assert.ok(h.backend.tablasDeclaradas.includes('migraciones_datos'));
        assert.equal(h.backend.tablasDeclaradas.length, 23);
        assert.ok(!h.backend.tablasDeclaradas.includes('if'));
        assert.ok(h.flutter.dependencias.includes('webview_flutter'));
    } finally { if (fs.existsSync(salida)) fs.unlinkSync(salida); }
});
