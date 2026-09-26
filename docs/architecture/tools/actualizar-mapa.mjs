// Regenera el mapa de arquitectura de C:\libreria a partir del código real.
// Uso (desde C:\libreria):  node docs/architecture/tools/actualizar-mapa.mjs
// No modifica código fuente: solo reescribe los archivos de docs/architecture.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(AQUI, '..');
const RAIZ = path.resolve(DOCS, '..', '..');
const tmp = path.join(os.tmpdir(), `libreria-hechos-${Date.now()}.json`);
execFileSync(process.execPath, [path.join(AQUI, 'analizar.mjs'), tmp], { stdio: 'inherit' });
const H = JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.unlinkSync(tmp);

const escribir = (nombre, contenido) => {
    const destino = path.join(DOCS, nombre);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, contenido.replace(/\n{3,}/g, '\n\n'));
    console.log('  escrito', path.relative(RAIZ, destino));
};
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const hoy = new Date().toISOString().slice(0, 10);
const corto = (f) => f.replace(/^backend\/src\//, '').replace(/^frontend\/src\//, '').replace(/^flutter_app\/lib\//, '');
const norm = (p) => p.replace(/:[A-Za-z_]+/g, ':x');
// Dependencias de backend/package.json que ningún archivo .js del backend requiere.
const depsBackendSinUso = (() => {
    const deps = Object.keys(JSON.parse(leer('backend/package.json')).dependencies || {});
    const fuentes = [];
    const recorrer = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (['node_modules', '.vercel', 'uploads'].includes(e.name)) continue;
            const ruta = path.join(dir, e.name);
            if (e.isDirectory()) recorrer(ruta);
            else if (e.name.endsWith('.js')) fuentes.push(fs.readFileSync(ruta, 'utf8'));
        }
    };
    recorrer(path.join(RAIZ, 'backend'));
    const todo = fuentes.join('\n');
    return deps.filter((d) => !new RegExp(`require\\(\\s*['"]${d.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(/[^'"]*)?['"]`).test(todo));
})();
const listaDeps = (l) => l.map((d) => `\`${d}\``).join(', ');
const cab = (titulo) => `# ${titulo}\n\n> Generado desde el código real el ${hoy} con \`docs/architecture/tools/actualizar-mapa.mjs\`.\n> No contiene secretos: solo nombres de variables de entorno.\n\n`;

// ─── Índices cruzados ───
const E = H.backend.endpoints;
const claveEp = (e) => `${e.method} ${norm(e.path)}`;
const reactPorEp = {};
for (const [archivo, eps] of Object.entries(H.frontend.endpointsPorArchivo)) {
    for (const ep of eps) {
        const [m, p] = ep.split(' ');
        (reactPorEp[`${m} ${norm(p)}`] ||= new Set()).add(archivo);
    }
}
const reactDeclarado = {};
for (const [archivo, fns] of Object.entries(H.frontend.servicios)) {
    for (const [fn, info] of Object.entries(fns)) {
        for (const e of info.endpoints) (reactDeclarado[`${e.method} ${norm(e.path)}`] ||= new Set()).add(`${corto(archivo)}#${fn}`);
    }
}
const flutterPorEp = {};
const flutterMetodoPorEp = {};
for (const [metodo, eps] of Object.entries(H.flutter.metodosApi)) {
    for (const e of eps) (flutterMetodoPorEp[`${e.method} ${norm(e.path)}`] ||= new Set()).add(metodo);
}
for (const [archivo, metodos] of Object.entries(H.flutter.usoApi)) {
    for (const m of metodos) for (const e of H.flutter.metodosApi[m] || []) (flutterPorEp[`${e.method} ${norm(e.path)}`] ||= new Set()).add(archivo);
}
const auth = (e) => {
    const mw = e.middleware || [];
    if (mw.includes('rol:administrador')) return 'JWT + admin';
    if (mw.includes('JWT')) return 'JWT';
    return 'Pública';
};
const modulo = (ruta) => {
    const m = /\/api\/([a-z-]+)/.exec(ruta);
    return m ? m[1] : 'raíz';
};

// Módulos de negocio: backend ↔ React ↔ Flutter
const MODULOS = [
    ['Autenticación y 2FA', 'auth', 'features/auth', 'login, registro, verificación, 2FA, recuperar/restablecer contraseña'],
    ['Usuarios y perfil', 'usuarios', 'features/usuarios · layout/PerfilAdministrador', 'perfil, editar perfil, foto, contraseña'],
    ['Libros (catálogo)', 'libros', 'features/libros', 'home, libros, detalle de libro'],
    ['Autores', 'autores', 'features/autores', '—'],
    ['Categorías', 'categorias', 'features/categorias', '—'],
    ['Inventario', 'inventario', 'features/inventario', '—'],
    ['Reservas', 'reservas', 'features/reservas', 'detalle de libro (crear), reservas'],
    ['Ventas', 'ventas', 'features/ventas', 'mis compras'],
    ['Pagos (PayU)', 'pagos', 'features/pagos', 'entrega y pago, mis compras'],
    ['Comprobantes', 'comprobantes', 'features/comprobantes · ventas/EmitirComprobanteModal', '—'],
    ['Clientes', 'clientes', 'features/clientes', '—'],
    ['Historial / auditoría', 'historial', 'features/historial · layout/Topbar (notificaciones)', '—'],
    ['Reportes / Resumen', 'reportes', 'features/dashboard (vía reportes/reportesService)', '—'],
    ['Favoritos', 'favoritos', '—', 'favoritos, detalle de libro'],
    ['Ubicaciones (Lima)', 'ubicaciones', 'features/ventas/ubicacionesService', 'entrega y pago'],
    ['Agencias courier', 'agencias', 'features/agencias', 'entrega y pago'],
    ['Empresa (emisor)', 'empresa', 'features/configuracion/EmpresaPage', '—'],
];

// ════════════════════════ 05-API-MAP ════════════════════════
{
    let md = cab('Mapa de API');
    md += `Total de endpoints registrados en el backend: **${E.length}** (incluye 4 definidos directamente en \`server.js\`).\n\n`;
    md += `- **Auth**: \`Pública\` = sin JWT · \`JWT\` = requiere \`Authorization: Bearer\` · \`JWT + admin\` = además rol \`administrador\`.\n`;
    md += `- **React / Flutter**: archivos que llaman al endpoint (directamente o a través de su servicio). \`—\` = ningún cliente lo usa.\n`;
    md += `- Los parámetros se escriben como en el backend (\`:id\`); los clientes los construyen con interpolación.\n\n`;
    md += '| Método | Endpoint | Backend (controlador#función) | Middleware | React | Flutter | Auth |\n|---|---|---|---|---|---|---|\n';
    for (const e of E) {
        const k = claveEp(e);
        const react = [...(reactPorEp[k] || [])].map(corto).join('<br>') || (reactDeclarado[k] ? `declarado en ${[...reactDeclarado[k]].join(', ')} (sin uso)` : '—');
        const fl = [...(flutterPorEp[k] || [])].map(corto).join('<br>') || '—';
        const back = `${e.controller === 'inline (server.js)' || e.controller.startsWith('inline') ? e.controller : `${corto(e.controller)}#${e.handler}`}`;
        md += `| ${e.method} | \`${e.path}\` | ${back} | ${(e.middleware || []).join(' + ') || '—'} | ${react} | ${fl} | ${auth(e)} |\n`;
    }
    const sinCliente = E.filter((e) => !reactDeclarado[claveEp(e)] && !flutterMetodoPorEp[claveEp(e)]);
    const compartidos = E.filter((e) => reactDeclarado[claveEp(e)] && flutterMetodoPorEp[claveEp(e)]);
    md += `\n## Endpoints compartidos por React y Flutter (${compartidos.length})\n\n`;
    md += compartidos.map((e) => `- \`${e.method} ${e.path}\``).join('\n') + '\n';
    md += `\n## Endpoints sin cliente en el código (${sinCliente.length})\n\n`;
    md += 'Ni React ni Flutter los declaran. Algunos son legítimos porque se usan por URL o desde un tercero:\n\n';
    const motivo = {
        'GET /': 'Salud del servidor.',
        'GET /api': 'Salud de la API.',
        'GET /api/test-db': 'Diagnóstico de conexión a BD (solo admin).',
        'GET /api/debug-egress': '⚠️ Diagnóstico de salida SMTP **público, sin JWT**. Posiblemente no utilizado; revisar si debe existir en producción.',
        'GET /api/pagos/checkout/:x': 'Lo abre el navegador con la `checkout_url` que devuelve `POST /api/pagos/crear-orden` (Flutter la lanza con url_launcher).',
        'GET /api/pagos/respuesta/:x': 'Página de retorno (responseUrl) de PayU.',
        'POST /api/pagos/webhook': 'Confirmación de PayU (servidor a servidor).',
    };
    md += sinCliente.map((e) => `- \`${e.method} ${e.path}\` — ${motivo[`${e.method} ${norm(e.path)}`] || 'Posiblemente no utilizado por ningún cliente.'}`).join('\n') + '\n';
    escribir('05-API-MAP.md', md);
}

// ════════════════════════ 02-BACKEND-MAP ════════════════════════
{
    const pkg = JSON.parse(leer('backend/package.json'));
    let md = cab('Mapa del backend (Node.js + Express + PostgreSQL)');
    md += `## Arranque (\`backend/server.js\`)\n\n`;
    md += `1. \`dotenv\` y comprobación obligatoria de \`TWO_FACTOR_ENCRYPTION_KEY\` (≥ 16 caracteres; si falta, el proceso no arranca).
2. \`helmet\` (sin CSP, CORP cross-origin) → \`cors\` con lista blanca \`FRONTEND_ORIGINS\` (por defecto \`http://localhost:5173\`) → \`express.json({ limit: '1mb' })\` → \`baseLimiter\`.
3. Estáticos: \`/uploads\` → \`backend/uploads\` (portadas y fotos locales cuando Cloudinary no está configurado).
4. Endpoints en línea: \`GET /\`, \`GET /api\`, \`GET /api/test-db\` (JWT + admin), \`GET /api/debug-egress\` (público).
5. Montaje de ${Object.keys(H.backend.montajes).length} routers bajo \`/api/*\` → 404 JSON → \`error.middleware\`.
6. \`iniciarJobs()\` (limpieza cada 5 min) y 3 migraciones idempotentes en línea (tabla \`favoritos\`; columnas \`cliente_documento\`/\`cliente_tipo_documento\` en \`ventas\`; \`enviado_por_email\`/\`fecha_envio_email\` en \`comprobantes\`).
7. \`app.listen(PORT || 3000)\`.

## Montaje de routers

| Prefijo | Archivo de rutas |\n|---|---|\n`;
    for (const [archivo, prefijo] of Object.entries(H.backend.montajes).sort((a, b) => a[1].localeCompare(b[1]))) md += `| \`${prefijo}\` | \`${corto(archivo)}\` |\n`;

    md += `\n## Configuración (\`src/config\`)\n
| Archivo | Responsabilidad |\n|---|---|
| \`config/database.js\` | Pool \`pg\` (PostgreSQL). \`DATABASE_URL\` o \`DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_PORT\`; SSL en producción. **Adaptador compatible con mysql2**: convierte \`?\` → \`$n\`, añade \`RETURNING *\` a los INSERT y devuelve \`[rows, fields]\` con \`insertId/affectedRows\`. Expone \`getConnection()\` para transacciones. |
| \`config/payu.js\` | Parámetros de PayU y \`PUBLIC_BASE_URL\` (URLs de checkout/respuesta/webhook). |

## Middlewares (\`src/middlewares\`)

| Archivo | Uso |\n|---|---|
| \`auth.middleware.js\` | \`verificarToken\`: exige \`Authorization: Bearer <jwt>\`, valida con \`jwt.verify\` y deja \`req.usuario\`. |
| \`rol.middleware.js\` | \`verificarRol('administrador')\`: restringe por rol. |
| \`rateLimit.js\` | \`baseLimiter\` (global), \`loginLimiter\`, \`registroLimiter\`, \`verificacionLimiter\`, \`twoFaLimiter\`, \`webhookLimit\`. |
| \`upload.middleware.js\` | Multer en memoria, 5 MB, validación de tipo; sube la portada a Cloudinary si está configurado (\`req.file.cloudinaryUrl\`) o al disco \`/uploads\`. Campo \`portada\`. |
| \`uploadPerfil.middleware.js\` | Igual para fotos de perfil. Campo \`foto\`. |
| \`error.middleware.js\` | Manejador global de errores (después del 404). |

## Utilidades, servicios y jobs

| Archivo | Responsabilidad |\n|---|---|
| \`utils/mailer.js\` | Correo con **nodemailer** (SMTP_*): verificación, reseteo, reserva creada, pedido entregado, comprobantes (PDF con **html-pdf-node**). |
| \`utils/cloudinary.js\` | Subida/eliminación de imágenes en Cloudinary (CLOUDINARY_*), \`publicIdDesdeUrl\`. |
| \`utils/crypto.js\` | Cifrado/descifrado del secreto 2FA con \`TWO_FACTOR_ENCRYPTION_KEY\`. |
| \`utils/transiciones.js\` | Máquinas de estado permitidas de \`VENTA\` y \`RESERVA\` (\`permitirTransicion\`). |
| \`utils/payuStatus.js\` | Traduce estados de PayU a estados de venta. |
| \`utils/validaciones.js\` | \`validarId\`, \`esEmailValido\`, \`esNumeroNoNegativo\`, \`esCantidadPositiva\`, \`esEstadoValido\`… |
| \`utils/fileType.js\` | Detección del tipo real de archivo por firma (uploads). |
| \`utils/numeroALetras.js\` | Importe en letras para comprobantes. |
| \`services/payu.service.js\` | Integración **PayU WebCheckout**: crear orden, formulario de checkout, consulta de orden. |
| \`jobs/limpieza.js\` | Cada 5 min: \`reservaModel.cancelarVencidas()\` y cancelación de ventas abandonadas (ventaModel). |

## Autenticación (JWT + 2FA)

- \`POST /api/auth/login\` → \`usuario.model#buscarPorEmail\` + bcrypt. Si el usuario tiene 2FA activo devuelve \`requires_2fa\` y un **\`two_factor_token\` JWT de 5 min**; si no, el **JWT de sesión (24 h)**.
- \`POST /api/auth/2fa/verify-login\` valida el token temporal y el código TOTP (**otplib**; secreto cifrado con \`utils/crypto\`) y emite el JWT de 24 h.
- \`/2fa/setup\` genera secreto + QR (**qrcode**), \`/2fa/confirm\` lo activa, \`/2fa/disable\` exige contraseña + código.
- Registro con verificación de correo por código; recuperación de contraseña por código (\`solicitar-reseteo\` → \`reestablecer-contrasena\`).

## Endpoints por módulo

Cadena: **MÉTODO RUTA → archivo de rutas → middleware → controlador#función → modelo#función → tablas PostgreSQL**.\n`;
    const grupos = {};
    for (const e of E) (grupos[modulo(e.path)] ||= []).push(e);
    for (const [mod, lista] of Object.entries(grupos)) {
        md += `\n### ${mod === 'raíz' ? 'Rutas en server.js' : `/api/${mod}`}\n\n| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |\n|---|---|---|---|---|---|\n`;
        for (const e of lista) {
            const ctrl = e.controller.startsWith('inline') ? e.controller : `${corto(e.controller)}#${e.handler}`;
            md += `| ${e.method} | \`${e.path}\` | ${(e.middleware || []).join(' + ') || '—'} | ${ctrl} | ${(e.calls || []).map((c) => `\`${c}\``).join('<br>') || '—'} | ${(e.tables || []).join(', ') || '—'} |\n`;
        }
    }
    md += `\n## Modelos y tablas\n\n| Modelo | Tablas que consulta o modifica |\n|---|---|\n`;
    for (const [f, m] of Object.entries(H.backend.modelos)) md += `| \`models/${f}\` | ${m.tables.join(', ') || '—'} |\n`;
    const todas = [...new Set(Object.values(H.backend.modelos).flatMap((m) => m.tables))].sort();
    md += `\nTablas presentes en el código (${todas.length}): ${todas.map((t) => `\`${t}\``).join(', ')}. El esquema está en \`backend/database/schema.sql\` + 22 migraciones en \`backend/database/migrations\`.\n`;
    md += `\n## Integraciones externas\n
| Servicio | Paquete | Dónde | Variables de entorno (sin valores) |\n|---|---|---|---|
| PostgreSQL | \`pg\` | config/database.js | DATABASE_URL o DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT |
| Cloudinary | (API HTTP) | utils/cloudinary.js, upload*.middleware.js | CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET |
| SMTP (correo) | \`nodemailer\`, \`html-pdf-node\` | utils/mailer.js | SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, SMTP_REJECT_UNAUTHORIZED |
| PayU (pagos) | (API HTTP) | services/payu.service.js, config/payu.js | PAYU_ACCOUNT_ID, PAYU_MERCHANT_ID, PAYU_API_LOGIN, PAYU_API_KEY, PAYU_PUBLIC_KEY, PAYU_TEST, PAYU_NOTIFICATION_URL |
| TOTP 2FA | \`otplib\`, \`qrcode\` | controllers/auth2fa.controller.js | TWO_FACTOR_ENCRYPTION_KEY |
| JWT | \`jsonwebtoken\` | auth.middleware.js, auth*.controller.js | JWT_SECRET |

## Observaciones

- ⚠️ \`GET /api/debug-egress\` es **público** (sin JWT) y abre conexiones TCP a los puertos SMTP. Posiblemente no utilizado.
${depsBackendSinUso.length ? `- Dependencias en \`package.json\` que **ningún archivo importa**: ${listaDeps(depsBackendSinUso)}.\n` : ''}- La pasarela de pagos (\`/api/pagos\`) es **PayU**.
- \`GET /api/test-db\` responde "Conexión con MySQL exitosa"; funciona (el adaptador devuelve \`[rows]\`), solo el texto está desactualizado.
- Endpoints sin cliente: ver la sección correspondiente en \`05-API-MAP.md\`.
- Scripts auxiliares (no forman parte del servidor): \`scripts/migrarImagenesCloudinary.js\`, \`scripts/resetearPrecios.js\`, \`run_migration_021.js\`, \`_test_smtp.js\` (sin seguimiento en git).
- Pruebas: \`test/*.test.js\` (node --test) y \`test-integration/http.smoke.test.js\`.
`;
    escribir('02-BACKEND-MAP.md', md);
}

// ════════════════════════ 03-FRONTEND-MAP ════════════════════════
{
    const pkg = JSON.parse(leer('frontend/package.json'));
    const archivos = Object.keys(H.frontend.grafo);
    const conMotion = archivos.filter((f) => /from 'motion\/react'/.test(leer(f)));
    let md = cab('Mapa del frontend (React 19 + Vite + Tailwind 4) — Panel administrativo');
    md += `## Arranque\n
\`index.html\` → \`src/main.jsx\` → \`<ErrorBoundary>\` → \`routes/AppRouter.jsx\`:
\`<ToastProvider>\` → \`<AuthProvider>\` → \`<RouterProvider>\` (react-router ${pkg.dependencies['react-router-dom']}).

- **Cliente HTTP**: \`lib/api/client.js\` (axios). \`baseURL = VITE_API_URL\` (\`.env.production\` apunta a \`https://libreria-api-v9h0.onrender.com/api\`, \`.env.development\` a \`http://localhost:3000/api\`). Interceptor de petición añade \`Bearer <token>\`; el de respuesta devuelve \`response.data\` y ante **401** limpia la sesión y redirige a \`/\`.
- **Sesión**: \`features/auth/AuthContext.jsx\` + \`lib/storage/index.js\` (\`localStorage\`: \`token\`, \`usuario\`, \`ultimoHistorialVisto\`). Solo entra el rol \`administrador\` (validado en \`LoginPage\`).
- **Guard**: \`routes/RutaProtegida.jsx\` redirige a \`/\` si no hay token.
- **Layout**: \`features/layout/AdminLayout.jsx\` (ThemeProvider, Sidebar, Topbar, Breadcrumbs, transición de página con Framer Motion).
- **Tema**: \`components/providers/ThemeContext.jsx\` (modo claro/oscuro y colores por zona en \`localStorage\`). Estilos globales: \`src/index.css\` → \`src/styles/theme.css\` (tokens de marca, dark mode, componentes).
- **Despliegue**: Vercel (\`frontend/vercel.json\` reescribe todo a \`index.html\`).

## Rutas

| Ruta | Componente | Archivo |\n|---|---|---|\n`;
    for (const r of H.frontend.rutas) md += `| \`${r.path}\` | ${r.component || '—'} | ${r.file ? `\`${corto(r.file)}\`` : r.element.includes('Navigate') ? `redirección: \`${r.element}\`` : '—'} |\n`;
    md += `\nTodas excepto \`/\` y \`/verificar-email\` cuelgan de \`<RutaProtegida><AdminLayout/></RutaProtegida>\`. \`/reportes\` redirige a \`/dashboard\` (Reportes se integró en el Resumen).\n`;

    md += `\n## Cadena página → servicio → endpoint\n\nArchivos que importan funciones de servicio y los endpoints que alcanzan (el componente puede ser una página, un formulario o un modal):\n\n| Archivo | Endpoints |\n|---|---|\n`;
    for (const [archivo, eps] of Object.entries(H.frontend.endpointsPorArchivo).sort()) if (eps.length) md += `| \`${corto(archivo)}\` | ${eps.map((e) => `\`${e}\``).join('<br>')} |\n`;

    md += `\n## Servicios (\`features/*/*Service.js\`)\n\n| Servicio | Función | Endpoint |\n|---|---|---|\n`;
    for (const [archivo, fns] of Object.entries(H.frontend.servicios)) {
        for (const [fn, info] of Object.entries(fns)) {
            if (!info.endpoints.length) continue;
            md += `| \`${corto(archivo)}\` | \`${fn}\` | ${info.endpoints.map((e) => `\`${e.method} ${e.path}\`${e.via ? ` (vía ${corto(e.via)})` : ''}`).join('<br>')} |\n`;
        }
    }
    md += `\n## Componentes compartidos (\`components/\`)\n\n| Archivo | Usado por (nº de archivos) |\n|---|---|\n`;
    const usadoPor = {};
    for (const [f, imps] of Object.entries(H.frontend.grafo)) for (const i of imps) (usadoPor[i] ||= []).push(f);
    for (const f of archivos.filter((f) => f.includes('/components/')).sort()) md += `| \`${corto(f)}\` | ${(usadoPor[f] || []).length} |\n`;
    md += `\n## Hooks y utilidades\n\n${archivos.filter((f) => /\/lib\//.test(f)).map((f) => `- \`${corto(f)}\``).join('\n')}\n`;
    md += `\n## Framer Motion (\`motion/react\`) — ${conMotion.length} archivos\n\n${conMotion.map((f) => `- \`${corto(f)}\``).join('\n')}\n`;
    md += `\n## Módulo Dashboard (Resumen)\n
\`DashboardPage.jsx\` carga en paralelo \`/api/reportes/{resumen, libros-mas-vendidos, ventas-por-estado, reservas-por-estado, ventas-por-mes, ventas-por-dia, indicadores-ventas, stock-bajo}\` y \`GET /api/libros\` (los tres últimos de reportes con \`.catch\` para no bloquear). Componentes: \`StatCard\`/\`MiniStat\`, \`MejorRegistro\`, \`SalesChart\` (30 días / 12 meses, métrica, tabla), \`TopBooks\`, \`StatusDonut\` (barra apilada de estados), \`StockBajo\`, \`RecentBooks\`; utilidades en \`graficoUtils.js\`.
`;
    escribir('03-FRONTEND-MAP.md', md);
}

// ════════════════════════ 04-FLUTTER-MAP ════════════════════════
{
    const pub = leer('flutter_app/pubspec.yaml');
    const archivos = Object.keys(H.flutter.grafo);
    const grupo = (seg) => archivos.filter((f) => f.includes(`/lib/${seg}/`)).sort();
    let md = cab('Mapa de la app Flutter (Android / clientes)');
    md += `## Arranque y navegación\n
- \`lib/main.dart\` → \`LibreriaApp\` (\`MaterialApp\` con \`navigatorKey\` global y \`TemaController\`) → \`SplashScreen\`.
- \`SplashScreen\` comprueba la sesión (\`StorageService\`) y valida el token con \`GET /api/usuarios/perfil\`.
- Navegación imperativa con \`Navigator\` / \`MaterialPageRoute\`; \`services/navigation.dart\` expone \`navigatorKey\`, \`constructorLogin\` (lo registra \`main.dart\`) e \`irALogin()\` para navegar sin contexto (lo usa el interceptor 401).
- Barra inferior: \`widgets/app_bottom_navigation.dart\`.

## Configuración de API (\`utils/constants.dart\`)

- \`apiBaseUrl = serverBaseUrl + '/api'\`. Selector \`_usarApiProduccion\` (actualmente **true** → \`https://libreria-api-v9h0.onrender.com\`); en desarrollo usa \`10.0.2.2:3000\` (emulador), una IP LAN (celular) o \`localhost\`.
- Todas las rutas del backend están centralizadas como constantes \`*Path\`. Imágenes: \`buildPortadaUrl\` (\`/uploads/portadas/\`) y \`buildPerfilUrl\` (\`/uploads/perfiles/\`), o URL absoluta (Cloudinary).

## Servicios

| Archivo | Responsabilidad |\n|---|---|
| \`services/api_service.dart\` | Cliente **Dio** singleton. Interceptor añade \`Bearer\`; ante **401** limpia la sesión y llama a \`irALogin()\`. Normaliza errores en \`ApiException\`. Gestiona la **clave de idempotencia** del checkout y recuerda \`checkout_url\` por venta. |
| \`services/storage_service.dart\` | Token JWT en **flutter_secure_storage**; usuario y preferencias en **shared_preferences** (migra el token legado). ⚠️ Su comentario dice que también guarda el carrito, pero no hay código que lo haga. |
| \`services/carrito_service.dart\` | Carrito y "guardar para después" **solo en memoria** (\`ChangeNotifier\`): se pierde al cerrar la app. **Sin endpoint propio**: los ítems se envían en \`POST /api/pagos/crear-orden\`. |
| \`services/tema_controller.dart\` | Tema de color del perfil (\`ChangeNotifier\`). |
| \`services/navigation.dart\` | \`navigatorKey\` + \`irALogin()\`. |

## Métodos de ApiService → endpoints

| Método | Endpoint(s) |\n|---|---|\n`;
    for (const [m, eps] of Object.entries(H.flutter.metodosApi)) md += `| \`${m}\` | ${eps.map((e) => `\`${e.method} ${e.path}\`${e.via ? ` (vía \`${e.via}\`)` : ''}`).join('<br>')} |\n`;
    md += `\n## Pantalla → ApiService → endpoint\n\n| Pantalla / widget | Métodos | Endpoints |\n|---|---|---|\n`;
    for (const [f, metodos] of Object.entries(H.flutter.usoApi).sort()) {
        const eps = [...new Set(metodos.flatMap((m) => (H.flutter.metodosApi[m] || []).map((e) => `${e.method} ${e.path}`)))];
        md += `| \`${corto(f)}\` | ${metodos.map((m) => `\`${m}\``).join(', ')} | ${eps.map((e) => `\`${e}\``).join('<br>')} |\n`;
    }
    const sinApi = grupo('screens').filter((f) => !H.flutter.usoApi[f]);
    md += `\nPantallas sin llamadas directas a la API: ${sinApi.map((f) => `\`${corto(f)}\``).join(', ')} (carrito local, documentos legales, etc.).\n`;
    md += `\n## Funcionalidades clave\n
| Funcionalidad | Pantallas | Endpoints |\n|---|---|---|
| Catálogo | home, libros, detalle_libro | \`GET /api/libros\`, \`GET /api/libros/:id\` (búsqueda filtrada en local) |
| Favoritos | favoritos, detalle_libro | \`/api/favoritos\` (GET, GET/POST/DELETE \`/:idLibro\`) |
| Carrito | carrito (local) | — |
| Compra + PayU | entrega_y_pago, mis_compras | \`GET /api/ubicaciones/provincias(/:id/distritos)\`, \`GET /api/agencias/activas\`, \`POST /api/pagos/crear-orden\` → abre \`checkout_url\` con **url_launcher** → \`GET /api/pagos/:orderId\`; \`GET /api/ventas/mis-ventas\`, \`GET /api/ventas/:id/pago\` |
| Reservas | detalle_libro (crear), reservas | \`POST /api/reservas\`, \`GET /api/reservas/mis-reservas\`, \`DELETE /api/reservas/:id\` |
| Perfil | perfil, editar_perfil, cambiar_password | \`/api/usuarios/perfil\` (GET/PUT), \`PUT /api/usuarios/foto\` (**image_picker**), \`PUT /api/usuarios/password\` |
| 2FA | two_factor_setup/verify/disable | \`/api/auth/2fa/*\` |
| Registro y cuenta | registro, verificacion_email, recuperar/reestablecer_contrasena | \`/api/auth/{registro, verificar-email, reenviar-codigo, solicitar-reseteo, reestablecer-contrasena}\` |

Nota: la app es **solo para clientes**; \`login\` rechaza el rol administrador.

## Archivos\n`;
    for (const seg of ['models', 'screens', 'widgets', 'services', 'utils']) md += `\n**${seg}/** — ${grupo(seg).map((f) => `\`${corto(f).replace(`${seg}/`, '')}\``).join(', ')}\n`;
    md += `\n## Paquetes (pubspec.yaml)\n\n\`\`\`yaml\n${(/dependencies:[\s\S]*?(?=\n\w|\nflutter:)/.exec(pub) || [''])[0].trim()}\n\`\`\`\n`;
    escribir('04-FLUTTER-MAP.md', md);
}

// ════════════════════════ 06-DATA-FLOW ════════════════════════
{
    const ep = (m, p) => E.find((e) => e.method === m && e.path === p) || { calls: [], tables: [] };
    const linea = (m, p) => { const e = ep(m, p); return `\`${m} ${p}\` → ${(e.calls || []).map((c) => `\`${c}\``).join(', ') || e.controller} → tablas: ${(e.tables || []).join(', ') || '—'}`; };
    let md = cab('Flujos de datos');
    md += `## Arquitectura general\n
\`\`\`
                PostgreSQL (16 tablas)
                       ↑
          Backend Node/Express (Render)
         /api/*  ·  JWT  ·  PayU  ·  SMTP  ·  Cloudinary
               ↗                        ↖
   React Admin (Vercel)            Flutter Android (clientes)
   rol administrador               rol cliente
\`\`\`

## 1. Login (React y Flutter)
1. Cliente → ${linea('POST', '/api/auth/login')}.
2. Sin 2FA: respuesta \`{ token (24 h), data }\`. React guarda en \`localStorage\` (AuthContext); Flutter en **flutter_secure_storage**.
3. Con 2FA: respuesta \`{ requires_2fa, two_factor_token (5 min) }\` → ${linea('POST', '/api/auth/2fa/verify-login')}.
4. React exige \`rol === 'administrador'\`; Flutter rechaza administradores.
5. Cualquier 401 posterior: React limpia sesión y va a \`/\`; Flutter limpia sesión y \`irALogin()\`.

## 2. Recuperar contraseña
${linea('POST', '/api/auth/solicitar-reseteo')} (envía código por correo con \`utils/mailer\`) → ${linea('POST', '/api/auth/reestablecer-contrasena')}.

## 3. Venta desde el panel (React, administrador)
1. \`VentaForm\` → ${linea('POST', '/api/ventas')}.
2. Cambio de estado: \`VentaEstadoModal\` → ${linea('PUT', '/api/ventas/:id/estado')} (transiciones validadas en \`utils/transiciones.js\`; al entregar se envía correo).
3. Comprobante: \`EmitirComprobanteModal\` → ${linea('POST', '/api/ventas/:id/comprobante')}; envío: ${linea('POST', '/api/comprobantes/:id/enviar-email')}.

## 4. Compra desde la app (Flutter, cliente) con PayU
1. Carrito local (\`CarritoService\`) → \`EntregaYPagoScreen\` obtiene provincias/distritos y agencias activas.
2. ${linea('POST', '/api/pagos/crear-orden')} con clave de **idempotencia**; devuelve \`checkout_url\`.
3. La app abre \`checkout_url\` (${linea('GET', '/api/pagos/checkout/:externalReference')}) que auto-envía el formulario a PayU.
4. PayU notifica: ${linea('POST', '/api/pagos/webhook')}. Retorno del navegador: \`GET /api/pagos/respuesta/:externalReference\`.
5. La app consulta ${linea('GET', '/api/pagos/:orderId')} y lista ${linea('GET', '/api/ventas/mis-ventas')}.
6. El job \`jobs/limpieza.js\` cancela ventas abandonadas cada 5 min.

## 5. Reservas
- Cliente (Flutter) crea: ${linea('POST', '/api/reservas')}; cancela: ${linea('DELETE', '/api/reservas/:id')}.
- Administrador (React) cambia estado: ${linea('PUT', '/api/reservas/:id/estado')}.
- El job cancela reservas vencidas cada 5 min (\`reservaModel.cancelarVencidas\`).

## 6. Catálogo e inventario
- Lectura pública compartida: ${linea('GET', '/api/libros')}.
- Alta de libro (React): ${linea('POST', '/api/libros')} (multer + Cloudinary/disco).
- Inventario (React): ${linea('PUT', '/api/inventario/libro/:id')}; kardex: ${linea('GET', '/api/inventario/movimientos')}.

## 7. Resumen / reportes (React)
\`DashboardPage\` → 8 endpoints \`/api/reportes/*\` + \`GET /api/libros\` → \`reporte.model\` (consultas agregadas sobre ventas, detalle_venta, reservas, inventario, libros…).

## 8. Auditoría
Las operaciones de escritura registran en \`historial_operaciones\` (\`historial.model#crear\`). El panel lo lee con \`GET /api/historial\` (página Historial y notificaciones del Topbar cada 30 s).
`;
    escribir('06-DATA-FLOW.md', md);
}

// ════════════════════════ 07-DEPENDENCIES ════════════════════════
{
    const pb = JSON.parse(leer('backend/package.json'));
    const pf = JSON.parse(leer('frontend/package.json'));
    const tabla = (deps) => Object.entries(deps || {}).map(([n, v]) => `| \`${n}\` | ${v} |`).join('\n');
    const aristas = (g) => Object.values(g).reduce((a, l) => a + l.length, 0);
    let md = cab('Dependencias');
    md += `## Paquetes npm\n\n### Backend\n\n| Paquete | Versión |\n|---|---|\n${tabla(pb.dependencies)}\n\nDev: ${Object.keys(pb.devDependencies || {}).join(', ')}.\n\n${depsBackendSinUso.length ? `⚠️ No se importan en ningún archivo (posiblemente no utilizados): ${listaDeps(depsBackendSinUso)}.` : 'Todas las dependencias se importan en algún archivo.'}\n\n### Frontend\n\n| Paquete | Versión |\n|---|---|\n${tabla(pf.dependencies)}\n\nDev: ${Object.keys(pf.devDependencies || {}).join(', ')}.\n`;
    md += `\n## Paquetes Flutter (\`flutter pub deps --style=compact\`)\n
- **Directos**: cupertino_icons, dio, flutter, flutter_secure_storage, google_fonts, image_picker, shared_preferences, url_launcher.
- **Dev**: flutter_launcher_icons, flutter_lints, flutter_test.
- El resto (archive, http, crypto, *_platform_interface, plugins por plataforma…) son **transitivos**.
- Paquetes importados en \`lib/\`: ${H.flutter.paquetes.map((p) => `\`${p}\``).join(', ')}.
`;
    md += `\n## Dependencias internas (imports del propio código)\n
| Proyecto | Archivos | Imports internos | Ciclos |\n|---|---|---|---|
| Backend (\`require\`) | ${H.backend.archivos} | ${aristas(H.backend.grafo)} | ${H.backend.ciclos.length} (confirmado con **madge**: ninguno) |
| Frontend (\`import\`) | ${H.frontend.archivos} | ${aristas(H.frontend.grafo)} | ${H.frontend.ciclos.length} (confirmado con **madge**: ninguno) |
| Flutter (\`import\` relativos) | ${H.flutter.archivos} | ${aristas(H.flutter.grafo)} | ${H.flutter.ciclos.length} caminos cíclicos |

### Ciclos en Flutter

Corregido el ciclo entre capas: \`services/navigation.dart\` ya no importa \`LoginScreen\`; \`main.dart\` registra \`constructorLogin\` y el interceptor 401 lo usa. Ningún servicio, modelo o utilidad importa pantallas.

Los ${H.flutter.ciclos.length} caminos restantes son de **navegación entre pantallas** (p. ej. Login → Inicio → Perfil → cerrar sesión → Login). Son habituales con \`Navigator\` imperativo y no acoplan capas; se eliminarían con rutas con nombre si hiciera falta.

Ejemplos de caminos:\n\n${H.flutter.ciclos.slice(0, 4).map((c) => `- ${c.map(corto).join(' → ')}`).join('\n')}\n`;
    md += `\n## Posiblemente no utilizado\n
- Flutter: ${H.posiblesNoUsados.flutter.map((f) => `\`${corto(f)}\` (ningún archivo lo importa)`).join(', ') || 'ninguno'}.
- React: funciones de servicio no importadas: \`agenciasService#obtenerAgencia\`, \`ubicacionesService#listarProvincias\`/\`listarDistritos\` (se usan solo internamente por \`listarDistritosParaEnvio\`).
- Backend: ${depsBackendSinUso.length ? `dependencias ${listaDeps(depsBackendSinUso)}; ` : ''}endpoints \`GET /api/historial/mi-historial\`, \`POST /api/historial\`, \`GET /api/inventario/stock-bajo\`, \`PUT /api/inventario/libro/:id/stock\`, \`GET /api/debug-egress\` (sin cliente).
- Estilos: \`frontend/src/styles/theme.css\` conserva clases de la antigua página Reportes (\`reporte-card\`, \`reporte-grafico\`, \`reporte-tooltip\`, \`reporte-encabezado\`) que ya no usa ningún componente.
`;
    escribir('07-DEPENDENCIES.md', md);
}

// ════════════════════════ 08-CODE-INDEX.json ════════════════════════
{
    const indice = [];
    const invertir = (g) => { const r = {}; for (const [f, imps] of Object.entries(g)) for (const i of imps) (r[i] ||= []).push(f); return r; };
    const usoBack = invertir(H.backend.grafo);
    const usoFront = invertir(H.frontend.grafo);
    const usoDart = invertir(H.flutter.grafo);
    const epsPorArchivoBack = {};
    for (const e of E) {
        const k = `${e.method} ${e.path}`;
        for (const f of [e.routeFile, e.controller.startsWith('inline') ? null : e.controller, ...(e.calls || []).map((c) => `backend/src/${c.includes('service') ? 'services' : 'models'}/${c.split('#')[0]}`)]) if (f) (epsPorArchivoBack[f] ||= new Set()).add(k);
    }
    const resp = (f) => {
        const n = path.basename(f).replace(/\.(js|jsx|dart|mjs)$/, '');
        if (f === 'backend/server.js') return 'Punto de entrada Express: middlewares globales, montaje de routers, jobs y migraciones en línea';
        if (/\/routes\//.test(f)) return `Rutas Express de ${n.replace('.routes', '')} (prefijo ${H.backend.montajes[f] || '?'})`;
        if (/\/controllers\//.test(f)) return `Controlador HTTP de ${n.replace('.controller', '')}`;
        if (/\/models\//.test(f)) return `Acceso a datos SQL de ${n.replace('.model', '')}; tablas: ${(H.backend.modelos[path.basename(f)]?.tables || []).join(', ')}`;
        if (/\/middlewares\//.test(f)) return `Middleware ${n}`;
        if (/\/utils\//.test(f) && f.startsWith('backend')) return `Utilidad backend ${n}`;
        if (/\/services\//.test(f) && f.startsWith('backend')) return `Servicio de integración ${n}`;
        if (/\/config\//.test(f) && f.startsWith('backend')) return `Configuración ${n}`;
        if (/\/jobs\//.test(f)) return 'Tareas periódicas de limpieza (reservas vencidas, ventas abandonadas)';
        if (/Service\.js$/.test(f)) return `Servicio HTTP del panel (${n})`;
        if (/Page\.jsx$/.test(f)) return `Página del panel: ${n.replace('Page', '')}`;
        if (/Modal\.jsx$/.test(f)) return `Modal: ${n}`;
        if (/Form\.jsx$/.test(f)) return `Formulario: ${n}`;
        if (/\/components\/ui\//.test(f)) return `Componente UI compartido ${n}`;
        if (/\/providers\//.test(f)) return `Provider de contexto ${n}`;
        if (/\/layout\//.test(f)) return `Layout del panel: ${n}`;
        if (/\/lib\//.test(f)) return `Utilidad frontend ${n}`;
        if (/_screen\.dart$/.test(f)) return `Pantalla Flutter ${n}`;
        if (/\/widgets\//.test(f)) return `Widget Flutter ${n}`;
        if (/\/models\//.test(f)) return `Modelo de datos Flutter ${n}`;
        if (/\/services\//.test(f)) return `Servicio Flutter ${n}`;
        if (/\/utils\//.test(f)) return `Utilidad Flutter ${n}`;
        return n;
    };
    const modOf = (f) => {
        const m = /features\/(\w+)/.exec(f) || /(?:routes|controllers|models)\/(\w+)\./.exec(f) || /screens\/(?:security\/|legal\/)?(\w+?)_screen/.exec(f) || /lib\/(\w+)\//.exec(f);
        return m ? m[1] : path.basename(path.dirname(f));
    };
    const relevantesBack = Object.keys(H.backend.grafo).filter((f) => /^backend\/(server\.js|src\/)/.test(f));
    for (const f of relevantesBack) {
        const base = path.basename(f).split('.')[0];
        const relacionados = Object.keys(H.backend.grafo).filter((o) => o !== f && /src\/(routes|controllers|models)\//.test(o) && path.basename(o).split('.')[0] === base);
        indice.push({ file: f, module: modOf(f), responsibility: resp(f), imports: H.backend.grafo[f], usedBy: usoBack[f] || [], endpoints: [...(epsPorArchivoBack[f] || [])], relatedFiles: relacionados });
    }
    for (const f of Object.keys(H.frontend.grafo)) {
        const ruta = H.frontend.rutas.find((r) => r.file === f);
        indice.push({ file: f, module: modOf(f), responsibility: resp(f) + (ruta ? ` (ruta ${ruta.path})` : ''), imports: H.frontend.grafo[f], usedBy: usoFront[f] || [], endpoints: H.frontend.endpointsPorArchivo[f] || (H.frontend.servicios[f] ? [...new Set(Object.values(H.frontend.servicios[f]).flatMap((i) => i.endpoints.map((e) => `${e.method} ${e.path}`)))] : []), relatedFiles: (H.frontend.grafo[f] || []).filter((i) => /Service\.js$/.test(i)) });
    }
    for (const f of Object.keys(H.flutter.grafo)) {
        const metodos = H.flutter.usoApi[f] || [];
        const eps = f.endsWith('api_service.dart') ? Object.values(H.flutter.metodosApi).flat().map((e) => `${e.method} ${e.path}`) : metodos.flatMap((m) => (H.flutter.metodosApi[m] || []).map((e) => `${e.method} ${e.path}`));
        indice.push({ file: f, module: modOf(f), responsibility: resp(f), imports: H.flutter.grafo[f], usedBy: usoDart[f] || [], endpoints: [...new Set(eps)], relatedFiles: metodos.length ? ['flutter_app/lib/services/api_service.dart'] : [] });
    }
    const salida = {
        generated: hoy,
        howToUse: 'Buscar por "file", "module" o "endpoints". Verificar siempre el archivo real antes de modificar.',
        stats: { backendFiles: H.backend.archivos, frontendFiles: H.frontend.archivos, flutterFiles: H.flutter.archivos, endpoints: E.length },
        routeMounts: H.backend.montajes,
        frontendRoutes: H.frontend.rutas.map((r) => ({ path: r.path, component: r.component, file: r.file })),
        files: indice,
    };
    // Una entrada por línea: compacto y fácil de buscar con grep.
    const { files, ...cabecera } = salida;
    const cuerpo = JSON.stringify(cabecera, null, 1).replace(/\n}$/, ',\n "files": [\n');
    escribir('08-CODE-INDEX.json', `${cuerpo}${files.map((x) => `  ${JSON.stringify(x)}`).join(',\n')}\n ]\n}\n`);
}

// ════════════════════════ 01-PROJECT-MAP ════════════════════════
{
    let md = cab('Mapa del proyecto C:\\libreria');
    md += `## Visión general

| Parte | Carpeta | Stack | Usuarios | Despliegue |
|---|---|---|---|---|
| API | \`backend/\` | Node.js · Express 5 · PostgreSQL (\`pg\`) · JWT · PayU · SMTP · Cloudinary | ambos clientes | Render (\`libreria-api-v9h0.onrender.com\`) |
| Panel admin | \`frontend/\` | React 19 · Vite · Tailwind 4 · axios · react-router 7 · Framer Motion (\`motion\`) | rol **administrador** | Vercel |
| App móvil | \`flutter_app/\` | Flutter · Dio · flutter_secure_storage · shared_preferences · url_launcher · image_picker | rol **cliente** | Android (también web/windows) |

Otras carpetas: \`web/\` (build web de Flutter publicado), \`ios_swift_app/\`, \`backups/\`, scripts \`*.ps1\` de utilidades locales.

## Cifras (análisis ${hoy})

- Backend: **${H.backend.archivos}** archivos JS (incluye tests y scripts) · **${E.length}** endpoints · ${Object.keys(H.backend.montajes).length} routers · ${Object.keys(H.backend.controladores).length} controladores · ${Object.keys(H.backend.modelos).length} modelos · 16 tablas.
- Frontend: **${H.frontend.archivos}** archivos JS/JSX · ${H.frontend.rutas.length} rutas · ${Object.keys(H.frontend.servicios).length} archivos de servicio.
- Flutter: **${H.flutter.archivos}** archivos Dart · ${Object.keys(H.flutter.metodosApi).length} métodos en ApiService · ${Object.keys(H.flutter.usoApi).length} pantallas/widgets con llamadas a la API.

## Módulos de negocio

| Módulo | Backend (\`/api/...\`) | React | Flutter |
|---|---|---|---|
${MODULOS.map(([n, b, r, f]) => `| ${n} | \`/api/${b}\` | ${r} | ${f} |`).join('\n')}

## Dónde buscar

| Necesito… | Archivo del mapa |
|---|---|
| Qué endpoint existe, quién lo usa y qué auth pide | \`05-API-MAP.md\` |
| Cadena ruta → controlador → modelo → tabla | \`02-BACKEND-MAP.md\` |
| Página/servicio del panel que llama a un endpoint | \`03-FRONTEND-MAP.md\` |
| Pantalla Flutter que llama a un endpoint | \`04-FLUTTER-MAP.md\` |
| Flujos completos (login, venta, pago, reserva) | \`06-DATA-FLOW.md\` |
| Paquetes, ciclos y código posiblemente no usado | \`07-DEPENDENCIES.md\` |
| Índice por archivo (imports, usado por, endpoints) | \`08-CODE-INDEX.json\` |
| Diagramas Mermaid | \`graphs/*.mmd\` |

## Mantener el mapa actualizado

\`\`\`bash
node docs/architecture/tools/actualizar-mapa.mjs
\`\`\`
Regenera todos los archivos a partir del código (solo lectura del código). Si cambia una ruta, un servicio, una pantalla o un import importante, vuelve a ejecutarlo.

## Inconsistencias detectadas (resumen)

Ver detalle en \`05-API-MAP.md\` y \`07-DEPENDENCIES.md\`.
- Ningún cliente llama a un endpoint inexistente.
- \`GET /api/debug-egress\` público y sin uso.
${depsBackendSinUso.length ? `- Dependencias npm sin uso en backend: ${listaDeps(depsBackendSinUso)}.\n` : ''}- Endpoints de backend sin cliente: historial (mi-historial, POST), inventario (stock-bajo, PUT stock).
- Flutter: solo quedan ciclos de navegación entre pantallas (sin ciclo servicios ↔ pantallas).
`;
    escribir('01-PROJECT-MAP.md', md);
}

// ════════════════════════ GRAFOS MERMAID ════════════════════════
{
    const id = (s) => s.replace(/[^A-Za-z0-9]/g, '_');
    const G = (n, c) => escribir(`graphs/${n}.mmd`, `%% Generado ${hoy} desde el código real (actualizar-mapa.mjs)\n${c}\n`);

    G('general-architecture', `flowchart TB
    DB[("PostgreSQL · 16 tablas")]
    subgraph API["Backend Node/Express (Render)"]
        direction TB
        MW["helmet · cors · rate limit · JWT · roles"]
        R["${Object.keys(H.backend.montajes).length} routers /api/*"]
        C["${Object.keys(H.backend.controladores).length} controladores"]
        M["${Object.keys(H.backend.modelos).length} modelos SQL"]
        MW --> R --> C --> M
    end
    M --> DB
    EXT1["PayU WebCheckout"]
    EXT2["SMTP (nodemailer)"]
    EXT3["Cloudinary"]
    C --> EXT1 & EXT2 & EXT3
    EXT1 -. webhook .-> R
    REACT["React Admin (Vercel)<br/>rol administrador"] -->|"axios + Bearer"| MW
    FLUTTER["Flutter Android<br/>rol cliente"] -->|"Dio + Bearer"| MW`);

    let b = 'flowchart LR\n';
    for (const [archivo, prefijo] of Object.entries(H.backend.montajes)) {
        const nr = path.basename(archivo, '.js');
        b += `    ${id(nr)}["${prefijo}<br/>${nr}"]\n`;
        const ctrls = [...new Set(E.filter((e) => e.routeFile === archivo && !e.controller.startsWith('inline')).map((e) => path.basename(e.controller, '.js')))];
        for (const c of ctrls) b += `    ${id(nr)} --> ${id(c)}["${c}"]\n`;
    }
    for (const [f, c] of Object.entries(H.backend.controladores)) {
        const nc = path.basename(f, '.js');
        const mods = [...new Set(Object.values(c.functions).flatMap((x) => x.calls.map((k) => k.split('#')[0].replace('.js', ''))))];
        for (const m of mods) b += `    ${id(nc)} --> ${id(m)}[("${m}")]\n`;
    }
    for (const [f, m] of Object.entries(H.backend.modelos)) for (const t of m.tables) b += `    ${id(f.replace('.js', ''))} -.-> T_${t}[/"${t}"/]\n`;
    G('backend', b);

    let fr = 'flowchart LR\n';
    for (const r of H.frontend.rutas.filter((r) => r.file)) {
        const pagina = id(path.basename(r.file, '.jsx'));
        fr += `    ${pagina}["${r.path}<br/>${path.basename(r.file, '.jsx')}"]\n`;
        const servs = new Set();
        const pila = [r.file];
        const vistos = new Set();
        while (pila.length) {
            const a = pila.pop();
            if (vistos.has(a)) continue;
            vistos.add(a);
            for (const i of H.frontend.grafo[a] || []) {
                if (/Service\.js$/.test(i)) servs.add(i);
                else if (/\/features\//.test(i) && i.includes(r.file.split('/')[3])) pila.push(i);
            }
        }
        for (const s of servs) fr += `    ${pagina} --> ${id(path.basename(s, '.js'))}(["${path.basename(s, '.js')}"])\n`;
    }
    for (const [archivo, fns] of Object.entries(H.frontend.servicios)) {
        const prefijos = [...new Set(Object.values(fns).flatMap((i) => i.endpoints.map((e) => e.path.split('/').slice(0, 3).join('/'))))];
        for (const p of prefijos) fr += `    ${id(path.basename(archivo, '.js'))} --> ${id(p)}{{"${p}"}}\n`;
    }
    G('frontend', fr);

    let fl = 'flowchart LR\n    API(["ApiService (Dio)"])\n';
    for (const [f, metodos] of Object.entries(H.flutter.usoApi)) {
        const n = path.basename(f, '.dart');
        fl += `    ${id(n)}["${n}"] --> API\n`;
    }
    const prefFl = [...new Set(Object.values(H.flutter.metodosApi).flat().map((e) => e.path.split('/').slice(0, 3).join('/')))];
    for (const p of prefFl) fl += `    API --> ${id(p)}{{"${p}"}}\n`;
    fl += '    STORE(["StorageService<br/>secure storage + prefs"])\n    API --> STORE\n    CARRITO(["CarritoService<br/>(local)"])\n';
    G('flutter', fl);

    let ac = 'flowchart LR\n    subgraph React\n';
    const prefijosComunes = {};
    for (const e of E) {
        const k = claveEp(e);
        const p = `/api/${modulo(e.path)}`;
        if (reactDeclarado[k]) (prefijosComunes[p] ||= { r: false, f: false }).r = true;
        if (flutterMetodoPorEp[k]) (prefijosComunes[p] ||= { r: false, f: false }).f = true;
    }
    for (const p of Object.keys(prefijosComunes)) if (prefijosComunes[p].r) ac += `        R_${id(p)}["${p.replace('/api/', '')}"]\n`;
    ac += '    end\n    subgraph Flutter\n';
    for (const p of Object.keys(prefijosComunes)) if (prefijosComunes[p].f) ac += `        F_${id(p)}["${p.replace('/api/', '')}"]\n`;
    ac += '    end\n';
    for (const [p, v] of Object.entries(prefijosComunes)) {
        const ctrls = [...new Set(E.filter((e) => `/api/${modulo(e.path)}` === p && !e.controller.startsWith('inline')).map((e) => path.basename(e.controller, '.js')))];
        ac += `    E_${id(p)}(("${p}")) --> ${ctrls.map((c) => `C_${id(c)}["${c}"]`).join(' & ')}\n`;
        if (v.r) ac += `    R_${id(p)} --> E_${id(p)}\n`;
        if (v.f) ac += `    F_${id(p)} --> E_${id(p)}\n`;
    }
    ac += '    DB[("PostgreSQL")]\n';
    for (const c of [...new Set(E.filter((e) => !e.controller.startsWith('inline')).map((e) => path.basename(e.controller, '.js')))]) ac += `    C_${id(c)} --> DB\n`;
    G('api-connections', ac);

    G('auth-flow', `sequenceDiagram
    autonumber
    participant C as Cliente (React / Flutter)
    participant A as POST /api/auth/login
    participant U as usuario.model
    participant DB as PostgreSQL (usuarios)
    participant V as POST /api/auth/2fa/verify-login
    C->>A: email + password
    A->>U: buscarPorEmail
    U->>DB: SELECT usuarios
    A-->>A: bcrypt.compare
    alt sin 2FA
        A-->>C: token JWT (24 h) + data
    else con 2FA
        A-->>C: requires_2fa + two_factor_token (5 min)
        C->>V: two_factor_token + código TOTP
        V->>U: buscarPorIdConPassword / obtenerSecreto2FA
        V-->>V: descifrar secreto + otplib.verify
        V-->>C: token JWT (24 h)
    end
    Note over C: React guarda en localStorage (solo rol administrador)<br/>Flutter en flutter_secure_storage (solo rol cliente)
    Note over C: Peticiones siguientes: Authorization Bearer → verificarToken (+ verificarRol)`);

    G('sales-flow', `sequenceDiagram
    autonumber
    participant P as React · VentaForm / VentasPage
    participant V as /api/ventas (venta.controller)
    participant VM as venta.model
    participant H as historial.model
    participant CM as comprobante.model
    participant DB as PostgreSQL
    P->>V: POST /api/ventas (JWT + admin)
    V->>VM: crear (transacción)
    VM->>DB: ventas, detalle_venta, inventario (transacción)
    V->>H: crear (historial_operaciones)
    P->>V: PUT /api/ventas/:id/estado
    V->>VM: obtenerPorId + actualizarEstado (utils/transiciones)
    V-->>V: correo "pedido entregado" (mailer) si corresponde
    P->>V: POST /api/ventas/:id/comprobante
    V->>CM: generarComprobante
    CM->>DB: comprobantes
    P->>V: POST /api/comprobantes/:id/enviar-email
    Note over P: Flutter solo lee: GET /api/ventas/mis-ventas y GET /api/ventas/:id/pago`);

    G('reservations-flow', `sequenceDiagram
    autonumber
    participant F as Flutter · detalle_libro / reservas
    participant R as React · ReservasPage
    participant API as /api/reservas (reserva.controller)
    participant RM as reserva.model
    participant DB as PostgreSQL
    participant J as jobs/limpieza (cada 5 min)
    F->>API: POST /api/reservas (JWT)
    API->>RM: validarFechaVencimiento + crear
    RM->>DB: reservas, inventario
    API-->>F: correo de reserva creada (mailer)
    F->>API: GET /api/reservas/mis-reservas
    F->>API: DELETE /api/reservas/:id (cancelar, solo dueño)
    R->>API: GET /api/reservas (admin)
    R->>API: PUT /api/reservas/:id/estado (admin, utils/transiciones)
    API->>RM: actualizarEstado
    J->>RM: cancelarVencidas()`);

    G('payments-flow', `sequenceDiagram
    autonumber
    participant F as Flutter · entrega_y_pago
    participant API as /api/pagos (pago.controller)
    participant VM as venta.model
    participant P as PayU (payu.service)
    participant B as Navegador (url_launcher)
    participant DB as PostgreSQL
    F->>API: GET /api/ubicaciones/provincias(/:id/distritos), GET /api/agencias/activas
    F->>API: POST /api/pagos/crear-orden (JWT, clave de idempotencia)
    API->>VM: crear venta pendiente
    VM->>DB: ventas, detalle_venta, inventario
    API->>P: crearOrden
    API-->>F: checkout_url
    F->>B: abrir checkout_url
    B->>API: GET /api/pagos/checkout/:externalReference
    API-->>B: formulario auto-enviado a PayU
    P->>API: POST /api/pagos/webhook (confirmación)
    API->>VM: actualizarDatosPago + actualizarEstado
    B->>API: GET /api/pagos/respuesta/:externalReference
    F->>API: GET /api/pagos/:orderId (estado)
    F->>API: GET /api/ventas/mis-ventas
    Note over API: React (admin) lee: GET /api/pagos y GET /api/pagos/resumen`);
}
console.log('Mapa actualizado.');
