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
    if (mw.includes('rol:administrador') || mw.includes('verificarPanel') ||
        mw.includes('soloAdmin') || mw.some(m => m.includes('ROLES.ADMINISTRADOR'))) return 'JWT + admin';
    if (mw.includes('JWT') && mw.includes('rol:cliente')) return 'JWT + cliente';
    if (mw.includes('JWT')) return 'JWT';
    return 'Pública';
};
const definidos = new Set(E.map(claveEp));
const declaradosCliente = new Set([
    ...Object.keys(reactDeclarado),
    ...Object.keys(flutterMetodoPorEp),
]);
const endpointsClienteSinRuta = [...declaradosCliente].filter(k => !definidos.has(k)).sort();
const modulo = (ruta) => {
    const m = /\/api\/([a-z-]+)/.exec(ruta);
    return m ? m[1] : 'raíz';
};

// Módulos de negocio: backend ↔ React ↔ Flutter
const MODULOS = [
    ['Autenticación y 2FA', 'auth', 'features/auth (admin) · public-site/tienda/CuentaPage (cliente)', 'login, registro, verificación, 2FA, recuperar/restablecer contraseña'],
    ['Usuarios y perfil', 'usuarios', 'features/usuarios · layout/PerfilAdministrador', 'perfil, editar perfil, foto, contraseña'],
    ['Libros (catálogo)', 'libros', 'features/libros · public-site/pages/CatalogoPage · public-site/tienda/LibroPage', 'home, libros, detalle de libro'],
    ['Autores', 'autores', 'features/autores', '—'],
    ['Categorías', 'categorias', 'features/categorias', '—'],
    ['Inventario', 'inventario', 'features/inventario', '—'],
    ['Pedidos', 'pedidos', 'features/pedidos', '—'],
    ['Ventas', 'ventas', 'features/ventas · public-site/tienda/MisComprasPage', 'mis compras'],
    ['Pagos (PayU)', 'pagos', 'features/pagos · public-site/tienda/CheckoutPage', 'entrega y pago, mis compras'],
    ['Comprobantes', 'comprobantes', 'features/comprobantes · ventas/EmitirComprobanteModal', '—'],
    ['Clientes', 'clientes', 'features/clientes', '—'],
    ['Historial / auditoría', 'historial', 'features/historial · layout/Topbar (notificaciones)', '—'],
    ['Reportes / Resumen', 'reportes', 'features/dashboard (vía reportes/reportesService)', '—'],
    ['Favoritos', 'favoritos', 'public-site/tienda/AccionesLibro (cliente)', 'favoritos, detalle de libro'],
    ['Cobertura Pallasca', 'zonas-delivery', 'features/tarifas', 'entrega y pago, mis compras'],
    ['Ubicaciones (Lima, legacy)', 'ubicaciones', 'datos de ubicación en historial', 'nombres conservados en Venta; sin selector ni consultas de provincias/distritos'],
    ['Agencias courier (legacy)', 'agencias', 'ruta redirigida; features/agencias sin ruta activa', '—'],
    ['Empresa (emisor)', 'empresa', 'features/configuracion/EmpresaPage', '—'],
    ['Reclamaciones', 'reclamaciones', 'features/reclamaciones (formulario público y gestión admin)', 'libro_reclamaciones_screen (formulario nativo)'],
];

// ════════════════════════ 05-API-MAP ════════════════════════
{
    let md = cab('Mapa de API');
    md += `Total de endpoints registrados en el backend: **${E.length}** (incluye 4 definidos directamente en \`server.js\`).\n\n`;
    md += `- **Auth**: \`Pública\` = sin JWT · \`JWT\` = requiere \`Authorization: Bearer\` · \`JWT + admin\` / \`JWT + cliente\` = además el rol indicado. Los arrays de middleware compartidos se expanden desde el router real.\n`;
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
        'GET /api/debug-egress': 'Diagnóstico manual SMTP (JWT + administrador). DNS, TCP y salida HTTPS; sin consumidor en React/Flutter.',
        'GET /api/pagos/checkout/:x': 'Lo abre el navegador web o la WebView de Flutter con la `checkout_url` que devuelve `POST /api/pagos/crear-orden`.',
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
2. \`helmet\` (sin CSP, CORP cross-origin) → \`config/cors.js\` con lista \`FRONTEND_ORIGINS\` y patrón \`FRONTEND_ORIGINS_REGEX\` (regex inválida desactiva previews y conserva lista explícita) → \`express.json({ limit: '1mb' })\` → \`baseLimiter\`.
3. Estáticos: \`/uploads\` → \`backend/uploads\` (portadas y fotos locales cuando Cloudinary no está configurado).
4. Endpoints en línea: \`GET /\`, \`GET /api\`, \`GET /api/test-db\` y \`GET /api/debug-egress\` (ambos JWT + admin).
5. Montaje de ${Object.keys(H.backend.montajes).length} routers bajo \`/api/*\` → 404 JSON → \`error.middleware\`.
6. \`iniciarJobs()\` programa limpieza cada 5 min. \`iniciar()\` espera \`aplicarMigraciones\` y \`aplicarMigracionesDatos\` antes de aceptar tráfico; en test se usa el esquema preparado por el runner. Un fallo en producción aborta el arranque.
7. \`app.listen(PORT || 3000)\` después de comprobar el esquema. Las migraciones base e incrementales están en \`config/migraciones.js\`; los backfills se registran en \`migraciones_datos\`.

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
| \`rol.middleware.js\` | \`verificarRol(...roles)\`: **401** sin usuario y **403** sin permiso. \`verificarPanel\` y el bypass anti-IDOR \`esPersonalInterno\` admiten solo administrador. Roles centralizados en \`utils/roles.js\`. |
| \`rateLimit.js\` | \`baseLimiter\` (global), \`loginLimiter\`, \`registroLimiter\`, \`verificacionLimiter\`, \`twoFaLimiter\`, \`webhookLimit\`. |
| \`upload.middleware.js\` | Multer en memoria, 5 MB, validación de tipo; sube la portada a Cloudinary si está configurado (\`req.file.cloudinaryUrl\`) o al disco \`/uploads\`. Campo \`portada\`. |
| \`uploadPerfil.middleware.js\` | Igual para fotos de perfil. Campo \`foto\`. |
| \`error.middleware.js\` | Manejador global de errores (después del 404). |

## Utilidades, servicios y jobs

| Archivo | Responsabilidad |\n|---|---|
| \`utils/mailer.js\` | Correo con **nodemailer** (SMTP_*): verificación, reseteo y avisos comerciales. Comprobantes adjuntos PDF, renderizados con **Playwright Chromium** por \`utils/pdf.js\`. |
| \`utils/cloudinary.js\` | Subida/eliminación de imágenes en Cloudinary (CLOUDINARY_*), \`publicIdDesdeUrl\`. |
| \`utils/crypto.js\` | Cifrado/descifrado del secreto 2FA con \`TWO_FACTOR_ENCRYPTION_KEY\`. |
| \`utils/transiciones.js\` | Máquinas de estado de \`VENTA\` y \`ENTREGA\`; los marcadores de origen retirado permanecen de solo lectura. |
| \`utils/payuStatus.js\` | Traduce estados de PayU a estados de venta. |
| \`utils/validaciones.js\` | \`validarId\`, \`esEmailValido\`, \`esNumeroNoNegativo\`, \`esCantidadPositiva\`, \`esEstadoValido\`… |
| \`utils/roles.js\` | Dominio actual: \`ADMINISTRADOR\` y \`CLIENTE\`. Exporta \`ROLES\`, \`ROLES_PANEL\`, \`ROLES_ASIGNABLES\`, \`normalizar\`, \`esRolValido\` y \`esPersonalInterno\`. \`usuarios.rol\` solo admite \`cliente\`/\`administrador\`; la migración \`029_retirar_rol_obsoleto.sql\` conserva las cuentas del rol retirado como clientes inactivos, sin cambiar IDs ni compras. |
| \`utils/fileType.js\` | Detección del tipo real de archivo por firma (uploads). |
| \`utils/numeroALetras.js\` | Importe en letras para comprobantes. |
| \`services/payu.service.js\` | Integración **PayU WebCheckout**: crear orden, formulario de checkout, consulta de orden. |
| \`services/aiAssistant.service.js\` | Asistente público: búsqueda PostgreSQL tolerante, recomendaciones verificadas y fallback local. No modifica libros ni inventario. |
| \`services/geminiAssistant.service.js\` | Gemini REST, una llamada como máximo con 8 libros, timeout de 8 s, salida estructurada validada y pausa ante errores/cuota. |
| \`services/asistenteContexto.service.js\` | Contexto firmado temporal, 6 entradas de historial y expiración a los 20 min; sin tabla de conversaciones. |
| \`jobs/limpieza.js\` | Cada 5 min: reconciliación PayU y cancelación de ventas abandonadas (ventaModel). |

## Respaldo y recuperación

- \`backend/scripts/respaldarPostgres.js\`: export PostgreSQL custom con snapshot de solo lectura, conteos por tabla, SHA-256 y lectura completa del archivo mediante \`pg_restore\`.
- \`backend/scripts/respaldarPostgresWindows.ps1\`: conexión DPAPI del usuario y tarea diaria local, al iniciar sesión y con recuperación de ejecuciones pendientes. Requiere el equipo encendido y conexión; conserva 7 copias diarias y 4 semanas.
- Archivos y credencial protegida en \`backups/postgresql/\`, excluidos de Git. Procedimiento y restauración en \`backend/scripts/README-respaldos.md\`.
- La base pagada de Render proporciona PITR adicional; no se recupera sobre la base principal durante una comprobación de respaldo.

## Autenticación (JWT + 2FA)

- \`POST /api/auth/login\` → \`usuario.model#buscarPorEmail\` + bcrypt. Si el usuario tiene 2FA activo devuelve \`requires_2fa\` y un **\`two_factor_token\` JWT de 5 min**; si no, el **JWT de sesión (24 h)**.
- \`POST /api/auth/2fa/verify-login\` valida el token temporal y el código TOTP (**otplib**; secreto cifrado con \`utils/crypto\`) y emite el JWT de 24 h.
- \`/2fa/setup\` genera secreto + QR (**qrcode**), \`/2fa/confirm\` lo activa, \`/2fa/disable\` exige contraseña + código.
- Registro con verificación de correo por código. Recuperación en dos pasos: \`solicitar-reseteo\` → \`verificar-reseteo\` → \`reestablecer-contrasena\` con permiso \`reset_token\` de 5 min; se conserva la entrada legacy \`codigo + password\`.

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
    md += `\nTablas consultadas por los modelos (${todas.length}): ${todas.map((t) => `\`${t}\``).join(', ')}. Este subconjunto no es el total del esquema.\n\n`;
    md += `Esquema canónico: **${H.backend.tablasEsquema.length} tablas** en \`backend/database/schema.sql\`. Declaraciones en esquema, migraciones SQL y arranque: **${H.backend.tablasDeclaradas.length} tablas**, incluidas las auxiliares de migración. Hay ${H.backend.migraciones.length} archivos SQL de migración; solo la lista explícita de \`config/migraciones.js\` se ejecuta automáticamente. Estos recuentos proceden del código, no de una conexión a producción.\n`;
    md += `\n## Integraciones externas\n
| Servicio | Paquete | Dónde | Variables de entorno (sin valores) |\n|---|---|---|---|
| PostgreSQL | \`pg\` | config/database.js | DATABASE_URL o DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT |
| Cloudinary | (API HTTP) | utils/cloudinary.js, upload*.middleware.js | CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET |
| SMTP (correo) y PDF | \`nodemailer\`, \`playwright\` | utils/mailer.js, utils/pdf.js | SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, SMTP_REJECT_UNAUTHORIZED, PDF_CHROME_PATH |
| PayU (pagos) | (API HTTP) | services/payu.service.js, config/payu.js | PAYU_ACCOUNT_ID, PAYU_MERCHANT_ID, PAYU_API_LOGIN, PAYU_API_KEY, PAYU_PUBLIC_KEY, PAYU_TEST, PAYU_NOTIFICATION_URL |
| Gemini (asistente) | REST con fetch de Node | services/geminiAssistant.service.js | GEMINI_API_KEY, GEMINI_MODEL (solo backend; configuración manual) |
| TOTP 2FA | \`otplib\`, \`qrcode\` | controllers/auth2fa.controller.js | TWO_FACTOR_ENCRYPTION_KEY |
| JWT | \`jsonwebtoken\` | auth.middleware.js, auth*.controller.js | JWT_SECRET |

## Observaciones

- \`GET /api/debug-egress\` es un diagnóstico manual **JWT + admin**, con conexiones TCP acotadas y timeout HTTPS.
${depsBackendSinUso.length ? `- Dependencias en \`package.json\` que **ningún archivo importa**: ${listaDeps(depsBackendSinUso)}.\n` : ''}- La pasarela de pagos (\`/api/pagos\`) es **PayU**.
- \`GET /api/test-db\` verifica PostgreSQL con \`SELECT 1\`, protegido por JWT + administrador.
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
    const personalizable = /ThemeProvider|useTema/.test(leer('frontend/src/features/layout/AdminLayout.jsx'));
    let md = cab('Mapa del frontend (React 19 + Vite + Tailwind 4) — Panel y tienda web');
    md += `## Arranque\n
\`index.html\` → \`src/main.jsx\` → \`<ErrorBoundary>\` → \`routes/AppRouter.jsx\`:
\`<ToastProvider>\` → \`<AuthProvider>\` → \`<RouterProvider>\` (react-router ${pkg.dependencies['react-router-dom']}).

- **Cliente HTTP**: \`lib/api/client.js\` (axios). \`baseURL = VITE_API_URL\`; los valores se configuran por entorno. El interceptor añade \`Bearer <token>\`, devuelve \`response.data\` y ante **401 de sesión** limpia la sesión y redirige a \`/admin/login\`. Los 401 de credencial incorrecta se distinguen con \`erroresSesion.js\`.
- **Sesión**: \`features/auth/AuthContext.jsx\` + \`lib/storage/index.js\` (\`localStorage\`: \`token\`, \`usuario\`, \`ultimoHistorialVisto\`). Solo entra \`administrador\`; perfil actualiza los datos de sesión desde la API.
- **Cliente web**: \`public-site/tienda/TiendaContext.jsx\` y \`clienteApi.js\` mantienen sesión exclusiva de \`cliente\`, carrito por usuario/invitado e intento de compra persistente; nunca usan la sesión administrativa. \`PublicLayout\` los proporciona a cuenta, carrito, checkout, compras y detalle del libro.
- **Guards**: \`routes/RutaProtegida.jsx\` redirige a \`/admin/login\` sin sesión administrativa; \`RutaPorRol.jsx\` exige los roles configurados. Un **403** muestra rechazo de permisos.
- **Layout**: \`features/layout/AdminLayout.jsx\` (Sidebar, Topbar, Breadcrumbs, transición con Framer Motion${personalizable ? ', proveedor de tema' : ', tema claro fijo'}).
- **Tema**: ${personalizable ? 'Proveedor de tema conectado al layout.' : 'El layout actual declara `data-theme="light"`; `/personalizacion` redirige a `/dashboard`.'} \`src/index.css\` carga \`styles/paleta-editorial.css\`, \`styles/theme.css\`, \`styles/panel-editorial.css\` y \`styles/panel-formal.css\`. La tienda usa su propio tema en \`public-site/tema-editorial.css\`. Los iconos de navegación y búsqueda se centralizan en \`features/layout/navConfig.js\`.
- **Despliegue**: Vercel (\`frontend/vercel.json\` reescribe todo a \`index.html\`).

## Rutas

| Ruta | Componente | Archivo |\n|---|---|---|\n`;
    for (const r of H.frontend.rutas) md += `| \`${r.path}\` | ${r.component || '—'} | ${r.file ? `\`${corto(r.file)}\`` : r.element.includes('Navigate') ? `redirección: \`${r.element}\`` : '—'} |\n`;
    md += `\nEl panel cuelga de \`<RutaProtegida><AdminLayout/></RutaProtegida>\` y permite solo administrador. \`/\`, \`/verificar-email\` y \`/libro-de-reclamaciones\` son públicas. \`/reportes\` y \`/cierre-caja\` redirigen a \`/dashboard\`; \`/agencias\` a \`/\`.\n`;

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
\`DashboardPage.jsx\` carga en paralelo \`/api/reportes/{resumen, libros-mas-vendidos, ventas-por-estado, ventas-por-mes, ventas-por-dia, indicadores-ventas}\`, \`GET /api/inventario/stock-bajo\` y \`GET /api/libros\`. Los complementarios pueden fallar sin bloquear el resumen. Componentes: \`StatCard\`/\`MiniStat\`, \`MejorRegistro\`, \`SalesChart\`, \`TopBooks\`, \`StatusDonut\`, \`StockBajo\`, \`RecentBooks\`; utilidades en \`graficoUtils.js\`. No muestra ni consulta reservas.
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
- Antes de \`runApp\`, se espera \`TemaController.cargar()\` para restaurar colores, fondo y tarjetas sin un destello de la paleta inicial.
- \`SplashScreen\` comprueba la sesión (\`StorageService\`) y valida el token con \`GET /api/usuarios/perfil\`.
- Navegación imperativa con \`Navigator\` / \`MaterialPageRoute\`; \`services/navigation.dart\` expone \`navigatorKey\`, \`constructorLogin\` (lo registra \`main.dart\`) e \`irALogin()\` para navegar sin contexto (lo usa el interceptor 401).
- Barra inferior: \`widgets/app_bottom_navigation.dart\`.

## Configuración de API (\`utils/constants.dart\`)

- \`apiBaseUrl = serverBaseUrl + '/api'\`. Producción por defecto; \`--dart-define=API_LOCAL=true\` selecciona desarrollo, y \`API_CELULAR=true\` selecciona dispositivo físico. Hosts definidos en \`Constants\`, sin editar las pantallas.
- Todas las rutas del backend están centralizadas como constantes \`*Path\`. Imágenes: \`buildPortadaUrl\` (\`/uploads/portadas/\`) y \`buildPerfilUrl\` (\`/uploads/perfiles/\`), o URL absoluta (Cloudinary).

## Servicios

| Archivo | Responsabilidad |\n|---|---|
| \`services/api_service.dart\` | Cliente **Dio** singleton. Interceptor añade \`Bearer\` y vincula cada petición a su generación de sesión. Un **401** de la sesión vigente la cierra y llama a \`irALogin()\`; una contraseña incorrecta o respuesta tardía de otra sesión no la elimina. Normaliza errores en \`ApiException\` y conserva el checkout por propietario. |
| \`services/storage_service.dart\` | Token JWT en **flutter_secure_storage**; usuario y preferencias en **shared_preferences** (migra el token legado). Serializa cambios de credencial, mantiene la generación de sesión e invalida intentos login/2FA abandonados antes de instalar credenciales. |
| \`services/carrito_service.dart\` | Carrito y guardados (\`ChangeNotifier\`), persistidos por titular en SharedPreferences \`carrito_v2_<id>\`. Migra \`carrito_v1\` solo si coincide el dueño; cerrar sesión limpia memoria y conserva los datos de ese cliente. **Sin endpoint propio**: los ítems se envían en \`POST /api/pagos/crear-orden\`. |
| \`services/checkout_store.dart\` | Diario local por propietario: cuerpo e idempotencia persistidos antes del POST, para recuperar la misma compra sin duplicarla. |
| \`services/tema_controller.dart\` | Colores, fondo y tarjetas globales (\`ChangeNotifier\`); restaura preferencias locales y repinta \`AppColors\`. |
| \`services/navigation.dart\` | \`navigatorKey\` + \`irALogin()\`. |

Fuentes Inter y Source Serif 4 empaquetadas en \`assets/fonts/\` y declaradas en \`pubspec.yaml\`; la app no descarga tipografía en ejecución. La memoria de checkout se limpia al cambiar sesión; los intentos persistidos siguen separados por propietario.

## Perfil y personalización

- \`screens/perfil_screen.dart\` adapta \`ios_swift_app/Views/Account/AccountView.swift\`: cabecera degradada con foto e identidad, accesos a compras/favoritos, datos, colores, seguridad y legal. Conserva edición, cámara/galería y avatares PNG multipart.
- Las lecturas del perfil se vinculan a la generación de sesión y a una revisión local: una respuesta anterior a editar, cambiar foto o modificar 2FA no sobrescribe el estado nuevo. Tras editar se muestra el usuario guardado y se fuerza una lectura actual; el estado 2FA confirmado también se persiste.
- Los temas de \`utils/perfil_temas.dart\` se aplican al tocar; la combinación de dos colores tiene borrador local hasta Aplicar. Los colores y fondos se guardan en SharedPreferences mediante \`StorageService\`, sin endpoint adicional.
- \`screens/fondos_screen.dart\` adapta \`BackgroundsView\` de Swift: vista previa de fondo y tarjetas, grupos Suaves/Con color y selección adaptable. Atrás descarta el borrador; Aplicar actualiza \`TemaController\` y toda la app.
- Texto ampliado, nombres y etiquetas adaptables, controles de color de 48 dp y animaciones que respetan Reduce Motion. \`AppColors.onPrimary\` mantiene al menos 4.5:1 sobre botones, incluidos temas dorados/naranjas; la identidad de la cabecera se protege si el degradado mezcla extremos de bajo contraste.
- Pruebas: \`test/perfil_personalizacion_test.dart\` (persistencia, cancelación, combinación, contraste, edición tardía, 2FA y avatar) y \`test/perfil_presentacion_test.dart\` (cabecera, foto y capturas con fuentes locales reales).

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
| Compra + PayU | entrega_y_pago, mis_compras, pago_en_app | \`GET /api/zonas-delivery\`, \`POST /api/pagos/crear-orden\` → \`PagoEnAppScreen\` muestra WebCheckout con **webview_flutter** (enlaces externos con url_launcher). El retorno obliga a consultar \`GET /api/pagos/:orderId\`; también \`GET /api/ventas/mis-ventas\` y \`GET /api/ventas/:id/pago\`. |
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
      Panel React       Tienda web React       Flutter Android
      administrador     cliente / visitante    cliente
               \\              |              /
                  Backend Express · /api/*
                  JWT · PayU · SMTP · Cloudinary
                              |
                PostgreSQL · ${H.backend.tablasEsquema.length} tablas en esquema canónico
                + auxiliares de migración (${H.backend.tablasDeclaradas.length} declaradas en código)
\`\`\`

## 1. Login (React y Flutter)
1. Cliente → ${linea('POST', '/api/auth/login')}.
2. Sin 2FA: respuesta \`{ token (24 h), data }\`. React guarda en \`localStorage\` (AuthContext); Flutter en **flutter_secure_storage**.
3. Con 2FA: respuesta \`{ requires_2fa, two_factor_token (5 min) }\` → ${linea('POST', '/api/auth/2fa/verify-login')}.
4. Panel React exige administrador; tienda React y Flutter exigen cliente. Las sesiones web están separadas.
5. Un 401 de sesión vigente provoca cierre: el panel vuelve a \`/admin/login\`, la tienda emite \`cliente-sesion-expirada\` y Flutter usa \`irALogin()\`. Los errores de credencial incorrecta se distinguen de una sesión revocada.

## 2. Recuperar contraseña
${linea('POST', '/api/auth/solicitar-reseteo')} envía código por correo → ${linea('POST', '/api/auth/verificar-reseteo')} devuelve \`reset_token\` de 5 min → ${linea('POST', '/api/auth/reestablecer-contrasena')} acepta ese permiso y la nueva contraseña. No inicia sesión. El backend conserva \`codigo + password\` para compatibilidad con clientes antiguos.

## 3. Gestión comercial y logística (React, administrador)
1. \`POST /api/ventas\` está retirado (405); las ventas nuevas nacen pendientes desde checkout PayU. No se crean ventas de panel o reserva ni cobros manuales.
2. \`PUT /api/ventas/:id/estado\` está bloqueado (409). \`PUT /api/pedidos/:id/estado\` avanza logística en tres tramos: **Por preparar → En camino (delivery) / Listo para recoger (tienda) → Entregado**. Avanzar exige \`confirmado=true\`; \`estado_anterior\` detecta confirmaciones obsoletas bajo \`FOR UPDATE\`. Estado e historial se guardan en una transacción. Entregar cambia únicamente \`estado_entrega=entregado\`, conserva \`estado=pagada\` y no cobra ni descuenta stock otra vez. \`preparando\` es un alias de lectura de \`pendiente\`, no un destino nuevo; comercial legacy \`entregada\` no infiere entrega. No se migran ni reescriben compras antiguas. Cancelar sin pago cierra también la venta pendiente, deshabilita el checkout y libera stock en la misma transacción. Cancelar una entrega pagada conserva cobro y existencias hasta la devolución separada. Un cobro posterior a la cancelación queda en revisión.
   Los pagos en revisión o revertidos bloquean preparar/despachar/entregar bajo \`FOR UPDATE\`, pero permiten detener la logística. Un delivery pagado y cancelado exige confirmación de devolución física para reponer existencias. La revisión de aprobación tardía se conserva tras una reversión para cerrar documentalmente sin doble stock.
3. Comprobante: \`EmitirComprobanteModal\` → ${linea('POST', '/api/ventas/:id/comprobante')}; envío: ${linea('POST', '/api/comprobantes/:id/enviar-email')}.
4. Devoluciones: \`POST /api/ventas/:id/reembolso\` valida pago PayU e identificadores de la propia venta bajo bloqueo. \`accion=solicitar\` registra \`estado_reembolso=pendiente_verificacion\` sin efectos; \`accion=confirmar\` exige referencia, evidencia y responsable. Solo entonces confirma documentalmente, cambia a reembolsada y modifica stock/comprobante/historial en la misma transacción. No ejecuta un refund automático. Migración 040 agrega campos NULL sin reescribir históricos.
5. Indicadores: cuatro categorías exclusivas (Por preparar, Listos para recoger, En camino, Entregados). Denominador = pedidos ecommerce pagados vigentes con tipo/estado compatibles, sin cancelación, reembolso confirmado o pendiente ni pago en revisión. Cada ID cuenta una vez. Porcentaje = cantidad / denominador × 100; redondeo a una décima con reparto de restos para sumar 100%. Sin base se muestra “Sin base para calcular porcentaje”; un error no se muestra como cero. Búsqueda/tipo/canal delimitan el ámbito; el filtro de estado solo limita la lista. La API calcula lista y resumen desde una sola lectura. Panel, Mis compras web y Flutter usan el estado logístico registrado; el detalle Flutter abierto se actualiza con cada consulta real, al reanudar y cada 60 s.

## 4. Compra desde la app (Flutter, cliente) con PayU
1. Carrito local (\`CarritoService\`) → \`EntregaYPagoScreen\` consulta \`GET /api/zonas-delivery\`, que devuelve una sola cobertura **Ciudad de Pallasca**, con la **tarifa vigente de PostgreSQL**. No hay selector de barrio ni precio S/5 fijado en el cliente. Recojo gratuito en **Plaza de Armas, Jr. Marañón 161, Pallasca 02835**. La cobertura no incluye anexos ni otros distritos. Si no se puede consultar, el recojo sigue disponible.
2. ${linea('POST', '/api/pagos/crear-orden')} con clave de **idempotencia**; delivery envía dirección y referencia opcional. \`id_zona_delivery\` es opcional; referencias antiguas activas se aceptan por compatibilidad, pero una venta NUEVA usa siempre la cobertura de la ciudad y su tarifa vigente. El modelo vuelve a resolverla con \`FOR SHARE\` y guarda \`cobertura_entrega=pallasca\`, \`zona_delivery_nombre=Ciudad de Pallasca\` y la tarifa en \`costo_envio\` (0 para recojo); total = libros + envío. Ni precio enviado ni tarifas de otras zonas cambian el cobro. Web y Flutter revalidan la tarifa antes del POST y exigen revisar el total si cambió. Las ventas ya creadas/reintentos conservan su instantánea. Devuelve \`checkout_url\`.
3. \`PagoEnAppScreen\` abre \`checkout_url\` en WebView (${linea('GET', '/api/pagos/checkout/:externalReference')}); el formulario se envía a PayU. Cerrar o retornar de la ventana no confirma el pago: se consulta a la API.
4. PayU notifica: ${linea('POST', '/api/pagos/webhook')}. Retorno del navegador: \`GET /api/pagos/respuesta/:externalReference\`.
5. La app consulta ${linea('GET', '/api/pagos/:orderId')} y lista ${linea('GET', '/api/ventas/mis-ventas')}.
6. El job \`jobs/limpieza.js\` revisa ventas abandonadas cada 5 min; consulta PayU antes de liberar stock y conserva pagos inciertos/pendientes.
7. Administración: \`TarifasEnvioPage\` muestra únicamente la configuración de delivery en modo consulta, con botón **Editar tarifa**. El formulario aparece al editar; **Guardar tarifa** vuelve a consulta tras confirmar y **Cancelar** descarta el borrador sin escribir. No incluye un bloque de recojo ni de dirección en esta pantalla. Usa \`PUT /api/zonas-delivery/:id\` (JWT + admin), cuerpo \`{tarifa,tarifa_anterior}\`. Importe positivo PEN, hasta dos decimales, máximo 99999999.99. Solo se edita la cobertura activa de ciudad; no nombre, estado ni barrios. \`FOR UPDATE\` compara el precio esperado, rechaza ediciones obsoletas con 409 y guarda precio + administrador/historial en una transacción. Si falla la auditoría se revierte el precio; guardar sin cambios no duplica historial. POST sigue bloqueado. La migración registrada \`043_delivery_fijo_pallasca.sql\` establece S/5 como valor inicial, no se repite al reiniciar ni reemplaza la configuración posterior. \`GET /api/pagos/capacidades\` publica la tarifa vigente. Publicidad/asistente remiten al precio de checkout para no anunciar importes obsoletos. Panel y Flutter mantienen ubicaciones, courier e importes antiguos.

### Compra desde la web (React, cliente)
- \`PublicLayout\` incorpora \`TiendaProvider\`; rutas \`/cuenta\`, \`/carrito\`, \`/checkout\`, \`/mis-compras\`, \`/libro/:id\`. Catálogo, portada y ofertas permiten agregar libros al carrito.
- \`public-site/tienda/clienteApi.js\` usa fetch y sesión \`libreria-web-cliente-v1\`, independiente de token/usuario del panel. Revalida perfil y rol cliente. Registro y correo verificado, login/2FA y recuperación reutilizan los endpoints existentes.
- Carrito por invitado/usuario con solo IDs y cantidades en localStorage; precios y stock desde el catálogo. Se fusiona el carrito invitado al iniciar sesión. Totales en céntimos.
- \`GET /api/pagos/capacidades\` confirma compatibilidad del backend antes de crear compras web. Checkout envía \`canal_compra=web\` a \`POST /api/pagos/crear-orden\`; \`origen=app\` sigue identificando el ecommerce para compatibilidad. Migración \`033_canal_compra_web.sql\`: columna nullable, sin UPDATE de ventas antiguas.
- Antes de crear se refrescan precios, stock y zonas; cambios requieren revisar y confirmar otra vez. El intento y su clave de idempotencia se persisten antes del POST, permitiendo recuperar timeouts sin duplicar ventas ni stock. El backend guarda el total definitivo; el cliente lo muestra antes de abrir el WebCheckout.
- El retorno PayU solo informa y enlaza a \`/mis-compras\` cuando el canal es web. Nunca confirma pagos por parámetros del navegador. Consulta de pago valida propietario e importe antes de sincronizar; webhook firmado confirma pago. El carrito retira solo las cantidades realmente pagadas, verificadas por la API.
- Panel: pedidos con filtro Web/App y canal en tabla/detalle; ventas, pagos y CSV identifican Web (PayU). Compras web pendientes de pago no pueden avanzar en logística; el modelo verifica también esta regla con el bloqueo de fila.
- Ficha pública \`/libro/:id\`: amplía \`LibroPage\` reutilizando \`PrecioOferta\`, \`ComprarLibro\`, \`Stock\` y \`TarjetaLibro\`. Cantidad opcional en el mismo \`TiendaContext.agregar\`; Comprar ahora conduce al checkout existente. Datos técnicos disponibles: título, autor, categoría, ISBN, precio, estado y stock; descripción y biografía se conservan sin resumir.
- Descubrimiento: \`GET /api/libros/:id/relacionados\` consulta el autor y la categoría con los índices existentes y LIMIT 8 por grupo; entrega hasta 4 relacionados, 4 títulos adicionales del autor y 4 de categoría, sin duplicados. Solo libros activos, disponibilidad real y el mismo precio SQL del catálogo. La entrada directa a una ficha no carga el catálogo completo. Autor interactivo filtra \`/catalogo?autor=:id\`.
- Favoritos de la ficha usan GET/POST/DELETE \`/api/favoritos/:idLibro\` con la sesión cliente y ownership JWT existentes; no hay persistencia nueva. Sin sesión, Cuenta permite retorno interno al libro. Compartir usa Web Share API o copiar enlace/WhatsApp/Facebook. SEO amplía los metadatos existentes y genera Book/Product con datos reales. No modifica pagos, inventario ni migraciones.

## 5. Retiro total de Reservas
- API, panel y Flutter no ofrecen creación, lectura ni cancelación. Los namespaces antiguos \`/api/reservas\` y \`/api/reportes/reservas-por-estado\` exigen JWT y responden 410 sin consultar datos.
- Migración de datos \`042_purga_reservas.sql\`: purga reservas y su historial, libera solo apartados activos sin venta vinculada y registra el kardex en la misma transacción. Se aplica una sola vez y queda registrada en \`migraciones_datos\`.
- La tabla vacía se mantiene por compatibilidad con migraciones anteriores. Los marcadores \`ventas.origen\`/\`id_reserva\` conservan la protección de ventas históricas; no se borran ventas ni comprobantes.
- La ruta web antigua redirige al Dashboard. La pestaña móvil ahora abre Mis compras, sin llamadas al módulo retirado.

## 6. Catálogo e inventario
- Lectura pública compartida: ${linea('GET', '/api/libros')}.
- Alta de libro (React): ${linea('POST', '/api/libros')} (multer + Cloudinary/disco).
- Inventario (React): ${linea('PUT', '/api/inventario/libro/:id')}; kardex: ${linea('GET', '/api/inventario/movimientos')}.

## 7. Resumen / reportes (React)
\`DashboardPage\` → ${E.filter(e => e.path.startsWith('/api/reportes/')).length} endpoints \`/api/reportes/*\`, catálogo e inventario de stock bajo → \`reporte.model\` y modelos correspondientes (consultas agregadas).

## 8. Auditoría
Las operaciones de escritura registran en \`historial_operaciones\` (\`historial.model#crear\`). Historial lo consulta con \`GET /api/historial\`. Las notificaciones del Topbar consultan pagos y stock bajo cada 60 s mientras la pestaña está visible y al volver a ella.
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
    md += `\n## Paquetes Flutter (declarados en \`pubspec.yaml\`)\n
- **Directos**: ${listaDeps(H.flutter.dependencias)}.
- **Dev**: ${listaDeps(H.flutter.devDependencias)}.
- Las dependencias transitivas completas se consultan con \`flutter pub deps --style=compact\`; no se deducen de los imports.
- Paquetes importados en \`lib/\`: ${H.flutter.paquetes.map((p) => `\`${p}\``).join(', ')}.
`;
    md += `\n## Dependencias internas (imports del propio código)\n
| Proyecto | Archivos | Imports internos | Ciclos |\n|---|---|---|---|
| Backend (\`require\`) | ${H.backend.archivos} | ${aristas(H.backend.grafo)} | ${H.backend.ciclos.length} (analizador estático de imports) |
| Frontend (\`import\`) | ${H.frontend.archivos} | ${aristas(H.frontend.grafo)} | ${H.frontend.ciclos.length} (analizador estático de imports) |
| Flutter (\`import\` relativos) | ${H.flutter.archivos} | ${aristas(H.flutter.grafo)} | ${H.flutter.ciclos.length} caminos cíclicos |

### Ciclos en Flutter

Corregido el ciclo entre capas: \`services/navigation.dart\` ya no importa \`LoginScreen\`; \`main.dart\` registra \`constructorLogin\` y el interceptor 401 lo usa. Ningún servicio, modelo o utilidad importa pantallas.

Los ${H.flutter.ciclos.length} caminos restantes son de **navegación entre pantallas** (p. ej. Login → Inicio → Perfil → cerrar sesión → Login). Son habituales con \`Navigator\` imperativo y no acoplan capas; se eliminarían con rutas con nombre si hiciera falta.

Ejemplos de caminos:\n\n${H.flutter.ciclos.slice(0, 4).map((c) => `- ${c.map(corto).join(' → ')}`).join('\n')}\n`;
    md += `\n## Posiblemente no utilizado\n
- Flutter: ${H.posiblesNoUsados.flutter.map((f) => `\`${corto(f)}\` (ningún archivo lo importa)`).join(', ') || 'ninguno'}.
- React: funciones de servicio no importadas: \`agenciasService#obtenerAgencia\`, \`ubicacionesService#listarProvincias\`/\`listarDistritos\` (se usan solo internamente por \`listarDistritosParaEnvio\`).
- Backend: ${depsBackendSinUso.length ? `dependencias ${listaDeps(depsBackendSinUso)}; ` : ''}endpoints \`GET /api/historial/mi-historial\`, \`POST /api/historial\`, \`PUT /api/inventario/libro/:id/stock\` sin consumidor React/Flutter; \`GET /api/debug-egress\` es diagnóstico manual protegido.
- Estilos: las reglas de la antigua página Reportes sin consumidores se retiraron. \`tabla-reporte\`, \`reporte-barra\`, \`reporte-puesto\` y \`reporte-contador\` se conservan porque los usan Dashboard y Ventas.
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
        if (f.startsWith('flutter_app/')) {
            if (/_screen\.dart$/.test(f)) return `Pantalla Flutter ${n}`;
            if (/\/widgets\//.test(f)) return `Widget Flutter ${n}`;
            if (/\/models\//.test(f)) return `Modelo de datos Flutter ${n}`;
            if (/\/services\//.test(f)) return `Servicio Flutter ${n}`;
            if (/\/utils\//.test(f)) return `Utilidad Flutter ${n}`;
            return `Arranque Flutter ${n}`;
        }
        if (f.startsWith('frontend/src/routes/')) return `Enrutamiento y guardas React ${n}`;
        if (f.startsWith('frontend/src/public-site/')) return /Page\.jsx$/.test(f) ? `Página de la tienda pública ${n}` : `Componente o servicio de la tienda ${n}`;
        if (f === 'backend/server.js') return 'Punto de entrada Express: middlewares globales, montaje de routers, jobs y migraciones en línea';
        if (/\/routes\//.test(f)) return `Rutas Express de ${n.replace('.routes', '')} (prefijo ${H.backend.montajes[f] || '?'})`;
        if (/\/controllers\//.test(f)) return `Controlador HTTP de ${n.replace('.controller', '')}`;
        if (/\/models\//.test(f)) return `Acceso a datos SQL de ${n.replace('.model', '')}; tablas: ${(H.backend.modelos[path.basename(f)]?.tables || []).join(', ')}`;
        if (/\/middlewares\//.test(f)) return `Middleware ${n}`;
        if (/\/utils\//.test(f) && f.startsWith('backend')) return `Utilidad backend ${n}`;
        if (/\/services\//.test(f) && f.startsWith('backend')) return `Servicio de integración ${n}`;
        if (/\/config\//.test(f) && f.startsWith('backend')) return `Configuración ${n}`;
        if (/\/jobs\//.test(f)) return 'Reconciliación de pagos y limpieza de ventas abandonadas';
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
        stats: { backendFiles: H.backend.archivos, frontendFiles: H.frontend.archivos, flutterFiles: H.flutter.archivos, endpoints: E.length,
            schemaTables: H.backend.tablasEsquema.length, declaredTables: H.backend.tablasDeclaradas.length },
        database: { schemaFile: 'backend/database/schema.sql', schemaTables: H.backend.tablasEsquema, declaredTables: H.backend.tablasDeclaradas, tableSources: H.backend.fuentesPorTabla },
        apiEndpoints: E.map(e => ({ ...e, auth: auth(e), reactConsumers: [...(reactPorEp[claveEp(e)] || [])], flutterConsumers: [...(flutterPorEp[claveEp(e)] || [])] })),
        flutterApiMethods: H.flutter.metodosApi,
        apiAudit: { unmatchedClientEndpoints: endpointsClienteSinRuta },
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
| Panel y tienda web | \`frontend/\` | React 19 · Vite · Tailwind 4 · axios/fetch · react-router 7 · Framer Motion (\`motion\`) | **administrador** (panel), **cliente** (compras web) | Vercel |
| App móvil | \`flutter_app/\` | Flutter · Dio · flutter_secure_storage · shared_preferences · url_launcher · image_picker | rol **cliente** | Android (también web/windows) |

Otras carpetas: \`web/\` (build web de Flutter publicado), \`ios_swift_app/\`, \`backups/\`, scripts \`*.ps1\` de utilidades locales.

## Cifras (análisis ${hoy})

- Backend: **${H.backend.archivos}** archivos JS (incluye tests y scripts) · **${E.length}** endpoints · ${Object.keys(H.backend.montajes).length} routers · ${Object.keys(H.backend.controladores).length} controladores · ${Object.keys(H.backend.modelos).length} modelos · **${H.backend.tablasEsquema.length} tablas en esquema canónico** (${H.backend.tablasDeclaradas.length} declaradas al incluir migraciones y arranque).
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
| Flujos completos (login, venta, pago y retiro de reservas) | \`06-DATA-FLOW.md\` |
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
${endpointsClienteSinRuta.length ? `- Endpoints declarados por clientes sin ruta detectada: ${endpointsClienteSinRuta.map(e => `\`${e}\``).join(', ')}.` : '- No se detectaron endpoints declarados por clientes sin ruta correspondiente en el backend.'}
- \`GET /api/debug-egress\` es diagnóstico manual protegido (JWT + admin), sin consumidor React/Flutter.
${depsBackendSinUso.length ? `- Dependencias npm sin uso en backend: ${listaDeps(depsBackendSinUso)}.\n` : ''}- La memoria del asistente requiere **JWT + cliente**; el router comparte esos middlewares mediante un array.
- Los endpoints sin consumidor detectado se detallan en \`05-API-MAP.md\`; stock bajo sí tiene consumidores en Dashboard y notificaciones.
- Flutter: solo quedan ciclos de navegación entre pantallas (sin ciclo servicios ↔ pantallas).
`;
    escribir('01-PROJECT-MAP.md', md);
}

// ════════════════════════ GRAFOS MERMAID ════════════════════════
{
    const id = (s) => s.replace(/[^A-Za-z0-9]/g, '_');
    const G = (n, c) => escribir(`graphs/${n}.mmd`, `%% Generado ${hoy} desde el código real (actualizar-mapa.mjs)\n${c}\n`);

    G('general-architecture', `flowchart TB
    DB[("PostgreSQL · ${H.backend.tablasEsquema.length} tablas del esquema<br/>${H.backend.tablasDeclaradas.length} declaradas con auxiliares")]
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
    TIENDA["Tienda React (Vercel)<br/>cliente / visitante"] -->|"fetch público o JWT cliente"| MW
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
    for (const [archivo, deps] of Object.entries(H.backend.grafo)) {
        if (!archivo.includes('/services/')) continue;
        for (const destino of deps.filter(d => /\/(models|services)\//.test(d))) b += `    ${id(path.basename(archivo, '.js'))} --> ${id(path.basename(destino, '.js'))}\n`;
    }
    if (H.backend.grafo['backend/src/services/geminiAssistant.service.js']) b += '    geminiAssistant_service --> GEMINI["Gemini API (solo backend)"]\n';
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
    Note over C: Panel y tienda React guardan sesiones separadas en localStorage<br/>Flutter guarda JWT cliente en flutter_secure_storage
    Note over C: Peticiones siguientes: Authorization Bearer → verificarToken (+ verificarRol)`);

    G('password-reset-flow', `sequenceDiagram
    autonumber
    participant C as Cliente web / Flutter
    participant A as /api/auth
    participant U as usuario.model
    participant M as SMTP
    C->>A: POST solicitar-reseteo (email)
    A->>U: guardar código de recuperación
    A->>M: enviar código OTP
    C->>A: POST verificar-reseteo (email + código)
    A->>U: comprobar código y expiración
    A-->>C: reset_token temporal (5 min, no es sesión)
    C->>A: POST reestablecer-contrasena (email + reset_token + password)
    A->>U: actualizar contraseña y versión de sesión
    A-->>C: confirmación; volver al login
    Note over A: Compatibilidad legacy: también acepta código + password`);

    G('sales-flow', `sequenceDiagram
    autonumber
    participant P as React · VentasPage / PedidosPage
    participant V as /api/ventas (venta.controller)
    participant VM as venta.model
    participant H as historial.model
    participant CM as comprobante.model
    participant DB as PostgreSQL
    P->>V: POST /api/ventas o PUT estado (retirados)
    V-->>P: 405 creación / 409 estado manual
    P->>VM: Pedidos: transición logística válida
    VM->>DB: FOR UPDATE + entrega y estado comercial atómicos
    Note over P: Pedidos notifica una sola transición nueva, sin cobrar ni tocar stock
    P->>VM: Cancelar pedido sin pago
    VM->>DB: FOR UPDATE + venta cancelada + stock liberado + kardex
    Note over VM: Entrega pagada cancelada mantiene cobro/stock hasta devolución; aprobación tardía requiere revisión
    P->>V: POST reembolso accion solicitar o confirmar
    V->>VM: Validar PayU + solicitud o confirmación documental
    VM->>DB: Pendiente sin efectos / confirmado con evidencia, stock, comprobante e historial
    P->>V: POST /api/ventas/:id/comprobante
    V->>CM: generarComprobante
    CM->>DB: comprobantes
    P->>V: POST /api/comprobantes/:id/enviar-email
    Note over P: Flutter solo lee: GET /api/ventas/mis-ventas y GET /api/ventas/:id/pago`);

    G('reservations-retirement', `sequenceDiagram
    autonumber
    participant B as Arranque del backend
    participant M as Migración de datos 042
    participant DB as PostgreSQL
    participant A as APK antiguo
    participant API as Contrato retirado
    B->>M: aplicar una sola vez con advisory lock
    M->>DB: bloquear reservas y ventas
    M->>DB: liberar apartados activos sin venta, registrar kardex
    M->>DB: borrar reservas e historial del módulo
    M->>DB: registrar 042 y confirmar transacción
    Note over M,DB: fallo revierte todo; ventas y comprobantes permanecen
    A->>API: petición JWT al namespace antiguo
    API-->>A: 410 módulo eliminado, sin datos`);

    G('payments-flow', `sequenceDiagram
    autonumber
    participant F as Flutter · entrega_y_pago
    participant API as /api/pagos (pago.controller)
    participant VM as venta.model
    participant P as PayU (payu.service)
    participant B as WebView de la app / navegador web
    participant DB as PostgreSQL
    F->>API: GET /api/zonas-delivery (activas de Pallasca)
    F->>API: POST /api/pagos/crear-orden (JWT, idempotencia, entrega y zona)
    API->>P: crearOrden (URL local WebCheckout)
    API->>VM: crear venta pendiente con cobertura pallasca
    VM->>DB: Validar zona activa FOR SHARE y tarifa definitiva
    VM->>DB: ventas, detalle_venta, inventario (total libros más envío)
    API-->>F: checkout_url
    F->>B: abrir checkout_url
    B->>API: GET /api/pagos/checkout/:externalReference
    API-->>B: formulario auto-enviado a PayU
    P->>API: POST /api/pagos/webhook (confirmación)
    API->>VM: aplicarPago (firma, importe, moneda y transición atómica)
    B->>API: GET /api/pagos/respuesta/:externalReference
    F->>API: GET /api/pagos/:orderId (estado)
    F->>API: GET /api/ventas/mis-ventas
    Note over API: React (admin) lee: GET /api/pagos y GET /api/pagos/resumen`);
}
console.log('Mapa actualizado.');
