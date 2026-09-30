# Librería — Backend (Express + PostgreSQL)

API REST de la librería. Incluye el módulo de ventas con **checkout profesional**:
pago vía PayU (WebCheckout) y dos modos de entrega: **domicilio**
(dirección, distrito y provincia) y **recogida en tienda**.

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Configuración

Crear `.env` a partir de `.env.example`:

```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=
DB_NAME=libreria_db
PORT=3000
JWT_SECRET=...
PAYU_ACCOUNT_ID=...
PAYU_MERCHANT_ID=...
PAYU_API_LOGIN=...
PAYU_API_KEY=...
PAYU_TEST=...
PAYU_NOTIFICATION_URL=...
```

> En pruebas locales `PAYU_NOTIFICATION_URL` puede dejarse vacío; la
> confirmación del pago se obtiene con `GET /api/pagos/:orderId`
> (consulta a PayU y actualiza la venta).

## Puesta en marcha

1. Tener PostgreSQL disponible y crear la base de datos (por defecto
   `libreria_db`). Para una instalación limpia, aplicar
   `database/schema.sql`, que ya incluye las restricciones de entrega.
2. Crear el archivo `.env` copiando `.env.example` y rellenar al menos:
   `DB_*`, `JWT_SECRET` y `TWO_FACTOR_ENCRYPTION_KEY` (mínimo 16 caracteres).
3. Instalar dependencias: `npm install`.
4. Arrancar el servidor: `npm start` (o `npm run dev` con nodemon).

> El arranque falla si `TWO_FACTOR_ENCRYPTION_KEY` falta o es demasiado corta.

## Migraciones

Para bases ya existentes se aplican los archivos de `database/migrations/`
en orden. En `test` se aplican de forma idempotente; en `production` el
arranque **falla de forma explícita** si una migración pendiente no se ha
aplicado, para no mutar el esquema a mitad de un deploy.

| Migración | Cambio |
| --- | --- |
| `001_add_two_factor.sql` | Columnas de 2FA de usuarios |
| `002_add_email_verification.sql` | Verificación de email |
| `003_add_entrega_ventas.sql` | `tipo_entrega`, `direccion` en ventas |
| `004_add_pago_ventas.sql` | Datos de pago en ventas (columnas históricas `mp_*`) |
| `005_add_external_reference_ventas.sql` | `external_reference` (vincula orden de pago↔venta) |
| `006_add_ubicaciones_lima.sql` | `provincias_lima`, `distritos_lima`, `agencias_courier` |
| `007_add_ubicacion_venta.sql` | `id_distrito`, `id_agencia` en ventas |
| `008_add_costo_envio.sql` | `distritos_lima.tarifa_envio`, `ventas.costo_envio` |
| `009_add_external_reference_index.sql` | Índice sobre `ventas.external_reference` |
| `010_add_distritos_provincias.sql` | Distritos del resto de provincias de Lima |
| `011_add_estado_entregada.sql` | `entregada` en el ENUM de `ventas.estado` |
| `027_restringir_tipo_entrega.sql` | Limita `ventas.tipo_entrega` a `domicilio`/`tienda` (NULL sigue admitido para ventas legacy) |
| `028_coherencia_tipo_estado_entrega.sql` | CHECK de coherencia entre `tipo_entrega` y `estado_entrega` |

## Entregas

- `tipo_entrega` admite solo `domicilio` y `tienda`. `agencia` se retiró del
  flujo: la API responde `400` y la base lo rechaza.
- El valor es obligatorio en la creación por API; si una app antigua lo omite,
  se asume `tienda`.
- `NULL` solo existe en ventas legacy ya pagadas. Para esas filas, cualquier
  cambio de estado logístico responde `409` pidiendo corregir los datos.
- `domicilio`: `pendiente → preparando → en_camino → entregado`
- `tienda`: `pendiente → preparando → listo_recojo → entregado`
- `cancelado` es válido desde cualquier estado previo a `entregado`.

## Datos de envío (solo Lima)

- `provincias_lima`: 10 provincias del departamento de Lima.
- `distritos_lima`: los distritos de las 10 provincias de Lima con
  `tarifa_envio` por distrito. Lima provincia (43 distritos): S/ 6.00 zona A,
  S/ 9.00 zona B, S/ 12.00 zona C. Resto de provincias: costeras (Barranca,
  Cañete, Huaral, Huaura) S/ 15.00, sierra cercana (Canta, Huarochirí) S/ 18.00,
  sierra lejana (Cajatambo, Oyón, Yauyos) S/ 20.00.
- `agencias_courier`: Olva Courier (S/ 12.00), Shalom (S/ 10.00),
  Shalom Moto (S/ 15.00). Cada agencia tiene `tarifa_base` y puede habilitarse o
  deshabilitarse (`estado`).

## Endpoints relacionados con envío

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| GET | `/api/ubicaciones/provincias` | Provincias de Lima | JWT |
| GET | `/api/ubicaciones/provincias/:id/distritos` | Distritos (con `tarifa_envio`) | JWT |
| GET | `/api/agencias/activas` | Agencias courier habilitadas | JWT |
| GET | `/api/agencias` | Todas las agencias | Admin |
| GET | `/api/agencias/:id` | Detalle de agencia | JWT |
| POST | `/api/agencias` | Crear agencia | Admin |
| PUT | `/api/agencias/:id` | Actualizar agencia | Admin |

## Crear orden de pago

`POST /api/pagos/crear-orden` (JWT) recibe:

```json
{
  "items": [{ "id_libro": 1, "cantidad": 2 }],
  "tipo_entrega": "domicilio | tienda",
  "direccion": "Av. Jorge Basadre 680, Of. 203",
  "correo_compra": "cliente@correo.com",
  "id_distrito": 31,
  "idempotencia_clave": "uuid-del-dispositivo"
}
```

El backend:

1. Valida los datos de envío (distrito real de Lima + dirección para
   `domicilio`; nada adicional para `tienda`). Un `tipo_entrega` distinto de
   `domicilio`/`tienda` —o que no sea texto— responde `400`.
2. Calcula `costo_envio` (`tarifa_envio` del distrito; `0` para tienda).
3. Prepara la orden de PayU (WebCheckout firmado) con
   `total = libros + envío`; `checkout_url` abre
   `GET /api/pagos/checkout/:externalReference`, que envía el formulario a PayU.
4. Crea la venta en estado `pendiente` guardando `costo_envio` e `id_distrito`.

`idempotencia_clave` es obligatoria: repetir la misma clave con el mismo cuerpo
devuelve `200` y la venta ya creada, en vez de duplicar el pedido.

Respuesta: `{ data: { id_venta, order_id, checkout_url, status, total,
costo_envio } }`.

## Confirmación del pago

- **Webhook** (`/api/pagos/webhook`): cuando PayU envía la confirmación
  (servidor a servidor), actualiza la venta por `external_reference`.
- **Página de retorno** `GET /api/pagos/respuesta/:externalReference`
  (responseUrl de PayU).
- **Refresco manual** `GET /api/pagos/:orderId`: consulta PayU y aplica el estado a
  la venta. Utilizado por la app Flutter para confirmar sin depender del webhook.

## Ventas

`GET /api/ventas`, `GET /api/ventas/:id` y `GET /api/ventas/pendientes` devuelven
también `costo_envio` y los nombres de `distrito`, `provincia` y `agencia`
(vía JOINs con las tablas de ubicación).

## Verificación

```bash
node --check server.js            # sintaxis
npm test                          # unitarios
npm run test:integration          # integración (requiere API y base de datos)
npm run dev                        # levantar el API
```

## Seguridad

- `POST /api/ventas` está cerrado (`405`): las ventas nuevas solo nacen desde
  el checkout de la app, vía PayU. El panel administrativo ya no crea ventas.
- Máquinas de estado validadas también en los modelos (ventas y reservas), y
  el estado logístico depende del `tipo_entrega` de cada venta.
- Rate limiting global (`300/15min`) y estricto en login, registro,
  verificación de email y 2FA.
- Webhook de PayU con firma verificada (`sign`, MD5 de
  `apiKey~merchant_id~reference_sale~new_value~currency~state_pol`).
- Subida de portadas/fotos validada por magic bytes (JPEG/PNG/WebP) y con
  extensión detectada, no la de la petición.
- Protección IDOR en `GET /api/pagos/:orderId` y `GET /api/ventas/:id/pago`
  (solo dueño o administrador).
- Jobs de limpieza cada 5 minutos: cancela reservas vencidas y ventas
  abandonadas (>30 min) devolviendo stock.
- El arranque falla si `TWO_FACTOR_ENCRYPTION_KEY` falta o es muy corta.