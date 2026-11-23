# Mapa del proyecto C:\libreria

> Generado desde el código real el 2026-11-23 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Visión general

| Parte | Carpeta | Stack | Usuarios | Despliegue |
|---|---|---|---|---|
| API | `backend/` | Node.js · Express 5 · PostgreSQL (`pg`) · JWT · PayU · SMTP · Cloudinary | ambos clientes | Render (`libreria-api-v9h0.onrender.com`) |
| Panel y tienda web | `frontend/` | React 19 · Vite · Tailwind 4 · axios/fetch · react-router 7 · Framer Motion (`motion`) | **administrador** (panel), **cliente** (compras web) | Vercel |
| App móvil | `flutter_app/` | Flutter · Dio · flutter_secure_storage · shared_preferences · url_launcher · image_picker | rol **cliente** | Android (también web/windows) |
| App iOS nativa | `ios_swift_app/` | SwiftUI · URLSession · Keychain · LocalAuthentication · WebKit | rol **cliente** | Proyecto iPhone / Xcode |

Otras carpetas: `web/` (build web de Flutter publicado), `backups/`, scripts `*.ps1` de utilidades locales.

## Cifras (análisis 2026-11-23)

- Backend: **196** archivos JS (incluye tests y scripts) · **116** endpoints · 22 routers · 24 controladores · 21 modelos · **20 tablas en esquema canónico** (21 declaradas al incluir migraciones y arranque).
- Frontend: **207** archivos JS/JSX · 40 rutas · 21 archivos de servicio.
- Flutter: **77** archivos Dart · 35 métodos en ApiService · 21 pantallas/widgets con llamadas a la API.
- Swift: **74** archivos de aplicación · 7 archivos de pruebas · navegación cliente documentada en `09-SWIFT-MAP.md`.

## Módulos de negocio

| Módulo | Backend (`/api/...`) | React | Flutter |
|---|---|---|---|
| Autenticación y 2FA | `/api/auth` | views/panel/auth (admin) · views/web/tienda/CuentaPage (cliente) | login, registro, verificación, 2FA, recuperar/restablecer contraseña |
| Usuarios y perfil | `/api/usuarios` | views/panel/usuarios · components/panel/layout/PerfilAdministrador | perfil, editar perfil, foto, contraseña |
| Libros (catálogo) | `/api/libros` | views/panel/libros · views/web/publicas/CatalogoPage · views/web/tienda/LibroPage | home, libros, detalle de libro |
| Autores | `/api/autores` | views/panel/autores | — |
| Categorías | `/api/categorias` | views/panel/categorias | — |
| Inventario | `/api/inventario` | views/panel/inventario | — |
| Pedidos | `/api/pedidos` | views/panel/pedidos | — |
| Ventas | `/api/ventas` | views/panel/ventas · views/web/tienda/MisComprasPage | mis compras |
| Pagos (PayU) | `/api/pagos` | components/panel/pagos · views/web/tienda/CheckoutPage | entrega y pago, mis compras |
| Comprobantes | `/api/comprobantes` | views/panel/comprobantes · components/panel/ventas/EmitirComprobanteModal | — |
| Clientes | `/api/clientes` | views/panel/usuarios | — |
| Auditoría interna | `/api/historial` | Sin sección en el panel | — |
| Reportes / Resumen | `/api/reportes` | views/panel/dashboard (vía services/panel/reportes/reportesService) | — |
| Favoritos | `/api/favoritos` | components/web/tienda/AccionesLibro (cliente) | favoritos, detalle de libro |
| Cobertura Pallasca | `/api/zonas-delivery` | views/panel/tarifas | entrega y pago, mis compras |
| Ubicaciones (Lima, legacy) | `/api/ubicaciones` | datos de ubicación de ventas antiguas | nombres conservados en Venta; sin selector ni consultas de provincias/distritos |
| Agencias courier (legacy) | `/api/agencias` | ruta redirigida; sin vista activa | — |
| Empresa (emisor) | `/api/empresa` | views/panel/configuracion/EmpresaPage | — |
| Reclamaciones | `/api/reclamaciones` | views/panel/reclamaciones (formulario público y gestión admin) | libro_reclamaciones_screen (formulario nativo) |

## Dónde buscar

| Necesito… | Archivo del mapa |
|---|---|
| Qué endpoint existe, quién lo usa y qué auth pide | `05-API-MAP.md` |
| Cadena ruta → controlador → modelo → tabla | `02-BACKEND-MAP.md` |
| Página/servicio del panel que llama a un endpoint | `03-FRONTEND-MAP.md` |
| Pantalla Flutter que llama a un endpoint | `04-FLUTTER-MAP.md` |
| Navegación, servicios y endpoints declarados de Swift | `09-SWIFT-MAP.md` |
| Flujos completos (login, venta, pago y retiro de reservas) | `06-DATA-FLOW.md` |
| Paquetes, ciclos y código posiblemente no usado | `07-DEPENDENCIES.md` |
| Índice por archivo (imports, usado por, endpoints) | `08-CODE-INDEX.json` |
| Diagramas Mermaid | `graphs/*.mmd` |

## Mantener el mapa actualizado

```bash
node docs/architecture/tools/actualizar-mapa.mjs
```
Regenera todos los archivos a partir del código (solo lectura del código). Si cambia una ruta, un servicio, una pantalla o un import importante, vuelve a ejecutarlo.

## Inconsistencias detectadas (resumen)

Ver detalle en `05-API-MAP.md` y `07-DEPENDENCIES.md`.
- No se detectaron endpoints declarados por clientes sin ruta correspondiente en el backend.
- La memoria del asistente requiere **JWT + cliente**; el router comparte esos middlewares mediante un array.
- Los endpoints sin consumidor detectado se detallan en `05-API-MAP.md`; stock bajo sí tiene consumidores en Dashboard y notificaciones.
- Flutter: solo quedan ciclos de navegación entre pantallas (sin ciclo servicios ↔ pantallas).
