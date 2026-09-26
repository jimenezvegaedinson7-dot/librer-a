# CLAUDE.md — Librería del Saber

Monorepo con tres partes que comparten una misma API:

- `backend/` — Node.js + Express + PostgreSQL (Render). Rutas `/api/*`, JWT, PayU, SMTP, Cloudinary.
- `frontend/` — Panel administrativo React 19 + Vite + Tailwind 4 (Vercel). Solo rol `administrador`.
- `flutter_app/` — App Flutter para clientes (Android). Solo rol `cliente`.

## Mapa de arquitectura (usar ANTES de explorar)

ANTES DE EXPLORAR TODO EL REPOSITORIO:

1. Consulta primero:
   - `docs/architecture/01-PROJECT-MAP.md`
   - `docs/architecture/08-CODE-INDEX.json`
   - `docs/architecture/05-API-MAP.md`

2. Identifica el módulo relacionado con la tarea.

3. Abre únicamente los archivos concretos que necesites verificar.

4. NO vuelvas a recorrer todo `backend/`, `frontend/` y `flutter_app/` si el mapa ya contiene la información.

5. Si se modifica:
   - una ruta
   - un endpoint
   - un import importante
   - un servicio
   - un controlador
   - un modelo
   - una pantalla
   - una relación arquitectónica

   actualiza automáticamente el mapa correspondiente ejecutando desde la raíz del repositorio:

   ```bash
   node docs/architecture/tools/actualizar-mapa.mjs
   ```

   El script solo lee el código y reescribe `docs/architecture/*` (incluidos los grafos `graphs/*.mmd`). Si añades algo que el analizador no detecta (por ejemplo un nuevo cliente HTTP), actualiza `docs/architecture/tools/analizar.mjs`.

6. El mapa sirve como índice, pero antes de modificar código siempre verifica el archivo real involucrado.

## Otros documentos del mapa

| Archivo | Contenido |
|---|---|
| `docs/architecture/02-BACKEND-MAP.md` | Arranque, middlewares, cadena ruta → controlador → modelo → tablas |
| `docs/architecture/03-FRONTEND-MAP.md` | Rutas, servicios, componentes, Framer Motion |
| `docs/architecture/04-FLUTTER-MAP.md` | Pantallas, ApiService, almacenamiento, PayU |
| `docs/architecture/06-DATA-FLOW.md` | Flujos: login/2FA, ventas, pagos, reservas |
| `docs/architecture/07-DEPENDENCIES.md` | Paquetes, ciclos y código posiblemente no usado |
| `docs/architecture/graphs/*.mmd` | Diagramas Mermaid |

## Seguridad

No copies en el mapa ni en ningún documento valores de `.env`, contraseñas, tokens, API keys, JWT secrets ni credenciales de base de datos. Solo nombres de variables.
