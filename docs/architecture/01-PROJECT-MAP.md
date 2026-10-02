# Mapa del proyecto C:\libreria

> Generado desde el código real el 2026-10-02 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Visión general

| Parte | Carpeta | Stack | Usuarios | Despliegue |
|---|---|---|---|---|
| API | `backend/` | Node.js · Express 5 · PostgreSQL (`pg`) · JWT · PayU · SMTP · Cloudinary | ambos clientes | Render (`libreria-api-v9h0.onrender.com`) |
| Panel admin | `frontend/` | React 19 · Vite · Tailwind 4 · axios · react-router 7 · Framer Motion (`motion`) | rol **administrador** | Vercel |
| App móvil | `flutter_app/` | Flutter · Dio · flutter_secure_storage · shared_preferences · url_launcher · image_picker | rol **cliente** | Android (también web/windows) |

Otras carpetas: `web/` (build web de Flutter publicado), `ios_swift_app/`, `backups/`, scripts `*.ps1` de utilidades locales.

## Cifras (análisis 2026-10-02)

- Backend: **126** archivos JS (incluye tests y scripts) · **110** endpoints · 21 routers · 22 controladores · 18 modelos · 16 tablas.
- Frontend: **175** archivos JS/JSX · 32 rutas · 25 archivos de servicio.
- Flutter: **68** archivos Dart · 30 métodos en ApiService · 21 pantallas/widgets con llamadas a la API.

## Módulos de negocio

| Módulo | Backend (`/api/...`) | React | Flutter |
|---|---|---|---|
| Autenticación y 2FA | `/api/auth` | features/auth | login, registro, verificación, 2FA, recuperar/restablecer contraseña |
| Usuarios y perfil | `/api/usuarios` | features/usuarios · layout/PerfilAdministrador | perfil, editar perfil, foto, contraseña |
| Libros (catálogo) | `/api/libros` | features/libros | home, libros, detalle de libro |
| Autores | `/api/autores` | features/autores | — |
| Categorías | `/api/categorias` | features/categorias | — |
| Inventario | `/api/inventario` | features/inventario | — |
| Pedidos | `/api/pedidos` | features/pedidos | — |
| Reservas | `/api/reservas` | features/reservas | detalle de libro (crear), reservas |
| Ventas | `/api/ventas` | features/ventas | mis compras |
| Pagos (PayU) | `/api/pagos` | features/pagos | entrega y pago, mis compras |
| Comprobantes | `/api/comprobantes` | features/comprobantes · ventas/EmitirComprobanteModal | — |
| Clientes | `/api/clientes` | features/clientes | — |
| Historial / auditoría | `/api/historial` | features/historial · layout/Topbar (notificaciones) | — |
| Reportes / Resumen | `/api/reportes` | features/dashboard (vía reportes/reportesService) | — |
| Favoritos | `/api/favoritos` | — | favoritos, detalle de libro |
| Ubicaciones (Lima) | `/api/ubicaciones` | features/ventas/ubicacionesService | entrega y pago |
| Agencias courier (legacy) | `/api/agencias` | ruta redirigida; features/agencias sin ruta activa | — |
| Empresa (emisor) | `/api/empresa` | features/configuracion/EmpresaPage | — |
| Reclamaciones | `/api/reclamaciones` | features/reclamaciones | enlace al formulario público |

## Dónde buscar

| Necesito… | Archivo del mapa |
|---|---|
| Qué endpoint existe, quién lo usa y qué auth pide | `05-API-MAP.md` |
| Cadena ruta → controlador → modelo → tabla | `02-BACKEND-MAP.md` |
| Página/servicio del panel que llama a un endpoint | `03-FRONTEND-MAP.md` |
| Pantalla Flutter que llama a un endpoint | `04-FLUTTER-MAP.md` |
| Flujos completos (login, venta, pago, reserva) | `06-DATA-FLOW.md` |
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
- Ningún cliente llama a un endpoint inexistente.
- `GET /api/debug-egress` es diagnóstico manual protegido (JWT + admin), sin consumidor React/Flutter.
- Endpoints de backend sin cliente: historial (mi-historial, POST), inventario (stock-bajo, PUT stock).
- Flutter: solo quedan ciclos de navegación entre pantallas (sin ciclo servicios ↔ pantallas).
