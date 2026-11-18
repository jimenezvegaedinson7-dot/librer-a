import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cuerposMetodosDart, dependenciasPubspec, endpointsFetchApi, endpointsPeticionCliente, metodosUsadosDart, miembrosObjeto, propagarEndpoints, resolverMiddlewares, rutasReact, tablasDeclaradas } from './extraer-relaciones.mjs';
import { endpointsSwift } from './extraer-swift.mjs';

test('resuelve rutas anidadas, index y redirecciones sin ejecutar JSX', () => {
    const router = `const router = createBrowserRouter([
        { element: <AdminLayout />, children: [
            // Sección común con tres vistas.
            { path: '/ventas', element: para(ADMIN, <GestionVentasPage />), children: [
                { index: true, element: cargar(<VentasPage incrustado />) },
                { path: 'pedidos', element: cargar(<PedidosPage incrustado />) },
                { path: 'comprobantes', element: cargar(<ComprobantesPage incrustado />) },
            ] },
            { path: '/pagos', element: <Navigate to='/ventas' replace /> },
        ] },
        { path: '*', element: <Navigate to='/' /> },
    ]);`;
    assert.deepEqual(rutasReact(router).map(r => r.path), ['/ventas', '/ventas', '/ventas/pedidos', '/ventas/comprobantes', '/pagos', '*']);
    assert.match(rutasReact(router)[1].element, /VentasPage/);
});

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

test('Swift conserva método, parámetros y autorización de cada declaración de endpoint', () => {
    const source = 'static func libro(id: Int) -> Self { .init(method: .get, pathComponents: ["api", "libros", String(id)]) }\nstatic func acceso(body: LoginRequest) -> Self { .init(method: .post, pathComponents: ["api", "auth", "login"], body: AnyEncodable(body), requiresAuthorization: false) }';
    const endpoints = endpointsSwift(source, 'Ejemplo.swift');
    assert.deepEqual(endpoints.map(e => [e.method, e.path, e.requiresAuthorization]), [['GET','/api/libros/:id',true],['POST','/api/auth/login',false]]);
});

test('el analizador refleja permisos, conexiones y tablas del código real', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const salida = path.join(os.tmpdir(), `mapa-regresion-${process.pid}.json`);
    assert.ok(fs.existsSync(path.dirname(salida)));
    try {
        execFileSync(process.execPath, [path.join(dir, 'analizar.mjs'), salida], { stdio: 'pipe' });
        const h = JSON.parse(fs.readFileSync(salida, 'utf8'));
        assert.equal(h.backend.endpoints.length, 122);
        assert.equal(h.backend.montajes['backend/src/routes/sistema.routes.js'], '/');
        const diagnostico = h.backend.endpoints.find(e => e.method === 'GET' && e.path === '/api/test-db');
        assert.equal(diagnostico.controller, 'backend/src/controllers/sistema.controller.js');
        assert.ok(diagnostico.middleware.includes('JWT') && diagnostico.middleware.includes('rol:administrador'));
        assert.ok(h.backend.grafo['backend/src/jobs/limpieza.js'].includes('backend/src/services/pago.service.js'));
        assert.ok(!h.backend.grafo['backend/src/jobs/limpieza.js'].some(f => f.includes('/controllers/')));
        assert.ok(h.frontend.rutas.some(r => r.path === '/ventas/pedidos' && r.component === 'PedidosPage'));
        assert.ok(h.frontend.rutas.some(r => r.path === '/ventas' && r.component === 'VentasPage'));
        const memoria = h.backend.endpoints.filter(e => e.path === '/api/asistente/memoria');
        assert.equal(memoria.length, 3);
        for (const e of memoria) { assert.ok(e.middleware.includes('JWT')); assert.ok(e.middleware.includes('rol:cliente')); }
        assert.ok(h.flutter.usoApi['flutter_app/lib/screens/verificacion_email_screen.dart'].includes('verificarEmail'));
        assert.ok(h.flutter.metodosApi.crearOrdenPago.some(e => e.method === 'POST' && e.path === '/api/pagos/crear-orden'));
        assert.ok(h.frontend.servicios['frontend/src/services/panel/reclamaciones/reclamacionesService.js'].registrarReclamacion.endpoints.some(e => e.method === 'POST' && e.path === '/api/reclamaciones'));
        assert.ok(h.frontend.servicios['frontend/src/services/web/tienda/clienteApi.js'].relacionados.endpoints.some(e => e.path === '/api/libros/:param/relacionados'));
        const recomendaciones = h.backend.endpoints.find(e => e.method === 'GET' && e.path === '/api/libros/recomendados');
        assert.ok(recomendaciones.middleware.includes('JWT') && recomendaciones.middleware.includes('rol:cliente'));
        for (const tabla of ['libros', 'ventas', 'detalle_venta', 'inventario']) assert.ok(recomendaciones.tables.includes(tabla));
        assert.ok(h.frontend.endpointsPorArchivo['frontend/src/components/web/tienda/RecomendacionesCompra.jsx'].includes('GET /api/libros/recomendados'));
        const ga4 = h.frontend.integraciones.find(i => i.provider === 'Google Analytics 4');
        assert.deepEqual(ga4.environmentVariables, ['VITE_GA4_DEBUG', 'VITE_GA4_ID']);
        assert.ok(ga4.events.includes('purchase') && ga4.events.includes('view_item_list'));
        assert.ok(ga4.consumers.includes('frontend/src/components/web/tienda/TiendaProvider.jsx'));
        assert.equal(h.backend.tablasEsquema.length, 22);
        assert.ok(h.backend.tablasEsquema.includes('portada_config'));
        assert.ok(h.frontend.endpointsPorArchivo['frontend/src/hooks/web/useLibroProtagonista.js'].includes('GET /api/anuncios/protagonista'));
        assert.ok(h.frontend.grafo['frontend/src/components/web/secciones/PortadaDiferida.jsx'].includes('frontend/src/hooks/web/useLibroProtagonista.js'));
        assert.ok(!h.frontend.endpointsPorArchivo['frontend/src/components/web/secciones/portada3d/PortadaEspacial.jsx']?.includes('GET /api/anuncios/protagonista'));
        assert.ok(h.backend.tablasDeclaradas.includes('migraciones_datos'));
        assert.equal(h.backend.tablasDeclaradas.length, 23);
        assert.ok(!h.backend.tablasDeclaradas.includes('if'));
        assert.ok(h.flutter.dependencias.includes('webview_flutter'));
        assert.ok(!h.flutter.dependencias.includes('cupertino_icons'));
        assert.deepEqual(h.swift.navegacion, ['Inicio','Catálogo','Carrito','Mis compras','Perfil']);
        assert.ok(h.swift.endpoints.some(e => e.path === '/api/ventas/mis-ventas'));
        assert.ok(h.swift.endpoints.every(e => !e.path.includes('/reservas') && !e.path.includes('/ubicaciones')));
        assert.ok(h.swift.grafo['ios_swift_app/Views/Account/AccountView.swift'].includes('ios_swift_app/Views/Account/ProfilePhotoActions.swift'));
        assert.deepEqual(h.swift.posiblesNoUsados, []);
    } finally { if (fs.existsSync(salida)) fs.unlinkSync(salida); }
});
