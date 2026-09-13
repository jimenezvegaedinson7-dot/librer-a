# Librería — Backend (Express + MySQL)

API REST de la librería. Incluye el módulo de ventas con **checkout profesional**:
pago vía Mercado Pago (API de Orders), entrega a domicilio solo para Lima
(provincias/distritos), envío por agencias courier y recogida en tienda.

## Requisitos

- Node.js 18+
- MariaDB 10.6+ (se usa `ADD COLUMN IF NOT EXISTS`, presente en MariaDB)

## Configuración

Crear `.env` a partir de `.env.example`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=libreria_db
PORT=3000
JWT_SECRET=...
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_NOTIFICATION_URL=...
```

> En sandbox de Mercado Pago el `MERCADOPAGO_NOTIFICATION_URL` puede dejarse
> vacío; la confirmación del pago se obtiene con `GET /api/pagos/:orderId`
> (consulta a MP y actualiza la venta).

## Puesta en marcha

1. Tener MySQL/MariaDB disponible y crear la base de datos (por defecto
   `libreria_db`). Aplicar las migraciones de `database/` que correspondan.
2. Crear el archivo `.env` copiando `.env.example` y rellenar al menos:
   `DB_*`, `JWT_SECRET` y `TWO_FACTOR_ENCRYPTION_KEY` (mínimo 16 caracteres).
3. Instalar dependencias: `npm install`.
4. Arrancar el servidor: `npm start` (o `npm run dev` con nodemon).

> El arranque falla si `TWO_FACTOR_ENCRYPTION_KEY` falta o es demasiado corta.

## Migraciones

Se ejecutan con `mysql` o un script Node contra `libreria_db` (Migrate nada).

| Migración | Cambio |
| --- | --- |
| `001_add_two_factor.sql` | Columnas de 2FA de usuarios |
| `002_add_email_verification.sql` | Verificación de email |
| `003_add_entrega_ventas.sql` | `tipo_entrega`, `direccion` en ventas |
| `004_add_pago_ventas.sql` | Datos MP en ventas (`mp_*`, webhook) |
| `005_add_external_reference_ventas.sql` | `external_reference` (vincula orden MP↔venta) |
| `006_add_ubicaciones_lima.sql` | `provincias_lima`, `distritos_lima`, `agencias_courier` |
| `007_add_ubicacion_venta.sql` | `id_distrito`, `id_agencia` en ventas |
| `008_add_costo_envio.sql` | `distritos_lima.tarifa_envio`, `ventas.costo_envio` |
| `009_add_external_reference_index.sql` | Índice sobre `ventas.external_reference` |
| `010_add_distritos_provincias.sql` | Distritos del resto de provincias de Lima |
| `011_add_estado_entregada.sql` | `entregada` en el ENUM de `ventas.estado` |

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

`POST /api/pagos` (JWT) recibe:

```json
{
  "items": [{ "id_libro": 1, "cantidad": 2 }],
  "tipo_entrega": "domicilio | agencia | tienda",
  "direccion": "Av. Jorge Basadre 680, Of. 203",
  "correo_compra": "cliente@correo.com",
  "id_distrito": 31,
  "id_agencia": 2
}
```

El backend:

1. Valida los datos de envío (distrito real de Lima + dirección para
   `domicilio`; agencia activa para `agencia`).
2. Calcula `costo_envio` (`tarifa_envio` del distrito o `tarifa_base` de la
   agencia; `0` para tienda).
3. Crea la orden en Mercado Pago con un ítem adicional "Envío…" y el
   `total_amount = libros + envío`.
4. Crea la venta en estado `pendiente` guardando `costo_envio`, `id_distrito` o
   `id_agencia`.

Respuesta: `{ data: { id_venta, order_id, checkout_url, status, total,
costo_envio } }`.

## Confirmación del pago

- **Webhook** (`/api/pagos/webhook`): cuando Mercado Pago notifica, actualiza la
  venta por `external_reference` (mapea `approved/closed/paid` → `pagada`,
  `rejected/cancelled/refunded/charged_back` → `cancelada`, resto → `pendiente`).
- **Refresco manual** `GET /api/pagos/:orderId`: consulta MP y aplica el estado a
  la venta. Utilizado por la app Flutter para confirmar sin depender del webhook.

## Ventas

`GET /api/ventas`, `GET /api/ventas/:id` y `GET /api/ventas/pendientes` devuelven
también `costo_envio` y los nombres de `distrito`, `provincia` y `agencia`
(vía JOINs con las tablas de ubicación).

## Verificación

```bash
node --check server.js            # sintaxis
npm run dev                        # levantar el API
```

## Seguridad (Fase 1)

- `POST /api/ventas` solo para administradores; las ventas nuevas nacen en
  estado `pendiente` y el admin confirma el cobro con
  `PUT /api/ventas/:id/estado` (`pendiente -> pagada`).
- Máquinas de estado validadas también en los modelos (ventas y reservas).
- Rate limiting global (`300/15min`) y estricto en login, registro,
  verificación de email y 2FA.
- Webhook de Mercado Pago firma verificada con `MERCADOPAGO_WEBHOOK_SECRET`
  (HMAC-SHA256, `x-signature`); sin secret solo en desarrollo.
- Subida de portadas/fotos validada por magic bytes (JPEG/PNG/WebP) y con
  extensión detectada, no la de la petición.
- Protección IDOR en `GET /api/pagos/:orderId` y `GET /api/ventas/:id/pago`
  (solo dueño o administrador).
- Jobs de limpieza cada 5 minutos: cancela reservas vencidas y ventas
  abandonadas (>30 min) devolviendo stock.
- El arranque falla si `TWO_FACTOR_ENCRYPTION_KEY` falta o es muy corta.