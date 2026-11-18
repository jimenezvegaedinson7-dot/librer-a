# MATIDANA — Backend

API compartida por la tienda web, el panel administrativo y las aplicaciones de clientes. Utiliza Node.js, Express y PostgreSQL, con JWT/2FA, PayU, correo y almacenamiento de imágenes.

## Arquitectura por capas y módulos

```text
backend/
├── server.js             # Entrada del proceso
├── src/
│   ├── app/              # Composición de Express, montaje y arranque
│   ├── routes/           # Endpoints por módulo
│   ├── controllers/      # Entrada, validación y respuesta HTTP
│   ├── services/         # Coordinación de negocio y operaciones compartidas
│   ├── models/           # Consultas SQL y persistencia
│   ├── integrations/     # PayU, Gemini, Cloudinary, correo y PDF
│   ├── middlewares/      # Sesión, permisos, límites, uploads y errores
│   ├── config/           # Entorno, conexiones, CORS y migraciones
│   ├── jobs/             # Tareas programadas
│   └── utils/            # Validaciones, reglas y utilidades compartidas
├── database/             # Esquema y migraciones SQL
├── scripts/              # Mantenimiento, publicación y respaldos
├── test/                 # Pruebas aisladas y HTTP con dependencias simuladas
└── test-integration/     # Integración con PostgreSQL desechable
```

Los módulos se reconocen por sus nombres (`libro`, `usuario`, `pago`, `pedido`, etc.) dentro de cada capa. No se crea una carpeta para cada archivo ni se requieren frameworks adicionales.

### Flujo de una petición

**Ruta → middlewares → controlador → servicio → modelo → PostgreSQL.**

- La ruta declara URL, método y permisos.
- El controlador interpreta la petición y conserva el contrato HTTP: códigos, mensajes y datos.
- El servicio coordina operaciones compartidas o de varios modelos. No recibe `req` ni `res`.
- El modelo concentra SQL. Las transacciones que ya protege un modelo se mantienen allí; un servicio puede coordinar una transacción entre modelos.
- Un CRUD sencillo puede ir del controlador al modelo directamente, sin un servicio que solo repita llamadas.
- Las integraciones encapsulan proveedores externos y no dependen de controladores.
- Los jobs reutilizan servicios/modelos; no invocan controladores HTTP.

Ejemplos: `libro.service.js` coordina la eliminación del libro y su inventario; `pago.service.js` aplica resultados y notificaciones; `auth.service.js` comparte la política de contraseñas y los datos públicos del usuario.

### Arranque

1. `server.js` carga y valida el entorno mediante `config/entorno.js`.
2. `app/iniciar.js` espera las migraciones de esquema y de datos. En modo `test`, el runner prepara el esquema.
3. `app/app.js#crearApp()` compone Express: helmet, CORS, JSON, rate limit, archivos, rutas y errores.
4. `app/rutas.js` registra todos los módulos. Las rutas de salud están en `routes/sistema.routes.js`.
5. Se abre el puerto y después se programan los jobs. `iniciar()` devuelve el servidor y `detenerJobs()`.

Importar `crearApp` no abre un puerto, ejecuta migraciones ni programa tareas; permite probar la aplicación de forma aislada. `npm start` y `npm run dev` siguen entrando por `server.js`.

## Desarrollo

Requisitos: Node.js 20+ y PostgreSQL 14+.

Desde `backend/`:

```bash
npm ci
npm run dev
```

Crear `.env` a partir de `.env.example` y completar las variables del entorno:

- Base de datos: `DATABASE_URL` o `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`; SSL mediante `DB_SSL`.
- Sesión: `JWT_SECRET` y `TWO_FACTOR_ENCRYPTION_KEY` (al menos 16 caracteres).
- HTTP: `PORT`, `TRUST_PROXY`, `FRONTEND_ORIGINS` y `FRONTEND_ORIGINS_REGEX`.
- Proveedores: variables `PAYU_*`, `SMTP_*`, `CLOUDINARY_*` y `GEMINI_*` según `.env.example`.

Las migraciones explícitamente registradas en `src/config/migraciones.js` se procesan antes de aceptar tráfico. Un fallo fatal de migración en producción detiene el arranque. Los backfills se registran en `migraciones_datos` para no repetirse.

## Contratos principales

- `GET /` y `GET /api`: salud pública, sin consultar la base de datos.
- `GET /api/test-db`: diagnóstico de PostgreSQL con sesión de administrador.
- `/api/auth`: registro, verificación de correo, login, recuperación y 2FA.
- `/api/libros`: catálogo, ficha, relacionados y recomendaciones.
- `POST /api/pagos/crear-orden`: compra de cliente con clave de idempotencia; PayU es la vía de pago.
- `/api/pagos/checkout/:externalReference`, `/respuesta/:externalReference` y `/webhook`: checkout y confirmación de PayU.
- `/api/ventas/mis-ventas`: compras del cliente; la gestión administrativa se controla por rol.
- `/api/pedidos`: seguimiento y operaciones logísticas del panel.

La entrega nueva admite delivery dentro de la ciudad de Pallasca, con tarifa vigente del servidor, o recojo gratuito. Lima y courier se conservan para datos históricos. Las reservas y las ventas manuales están retiradas; sus contratos de compatibilidad permanecen.

El detalle de todos los endpoints está en `../docs/architecture/05-API-MAP.md`.

## Verificación

```bash
node --check server.js
npm test
npm run test:integration
```

`npm test` usa dependencias simuladas y configuración de prueba. La integración necesita Docker activo: `test-integration/run.cjs` levanta PostgreSQL desechable, prepara el esquema, inicia la API y limpia los recursos al terminar. Puede ejecutarse una selección:

```bash
npm run test:integration -- test-integration/http.smoke.test.js test-integration/compra-web.smoke.test.js
```

Playwright en el backend también genera los comprobantes PDF; es una dependencia funcional del servidor, además de su uso en pruebas.

## Mantenimiento

- Portadas: `npm run sincronizar-portadas` empaqueta los índices de `frontend/src/models/web/tienda/`.
- Publicación Android: `npm run publicar-app` utiliza la validación de `appVersion.service.js`.
- Respaldos: procedimientos en `scripts/README-respaldos.md`.
- Mapa de arquitectura: desde la raíz del repositorio, `node docs/architecture/tools/actualizar-mapa.mjs`.
