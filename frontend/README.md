# MATIDANA — Frontend

Tienda pública y panel administrativo con React 19, Vite y Tailwind CSS 4. Ambos consumen la API de `../backend/`. Las sesiones del cliente y del administrador se guardan por separado.

## Desarrollo

Desde `frontend/`:

```bash
npm ci
npm run dev
```

`VITE_API_URL` configura la dirección de la API. Las variables disponibles se documentan en `.env.example`; los ajustes locales pueden guardarse en `.env.local`.

La tienda abre en `/` y el acceso administrativo en `/admin/login` (también mediante `/admin`).

## Organización

| Carpeta | Responsabilidad |
|---|---|
| `src/app/` | Arranque, rutas, guardas y proveedores globales. |
| `src/views/` | Pantallas públicas, de compra y del panel. |
| `src/components/` | Componentes, layouts y proveedores de cada superficie. |
| `src/services/` | Clientes HTTP, servicios y utilidades. |
| `src/models/` | Configuración, constantes y datos compartidos. |
| `src/hooks/` | Hooks de la web y del panel. |
| `src/assets/` | Recursos importados por el código. |
| `src/styles/` | Estilos globales y temas; los estilos locales acompañan a su componente o vista. |
| `public/` | Recursos servidos directamente, fuentes, portadas y service worker. |
| `test-browser/` | Pruebas de navegador de compras, sesiones, pagos, navegación y gestión administrativa. |

## Verificación

```bash
npm run lint
npm run build
npx playwright install chromium
npm run test:browser
```

Playwright inicia un servidor local en el puerto `5179`; las pruebas simulan las respuestas de la API. Se puede ejecutar una suite concreta con:

```bash
npm run test:browser -- test-browser/tienda-regresiones.spec.js
```

Las regresiones de tienda usan la configuración principal; no necesitan una configuración ni una ruta de resultados específica de un equipo.

La analítica usa una configuración separada para activar una etiqueta de prueba interceptada y un servidor en el puerto `5180`:

```bash
npx playwright test --config playwright.analytics.config.js
```

Las pruebas no forman parte del build de producción. `test-results/` y `playwright-report/` son resultados generados e ignorados por Git.

## Publicación

`npm run build` genera `dist/`; `npm run preview` permite revisarlo localmente.

El despliegue utiliza `vercel.json`: configura el build, las rutas React, las redirecciones, el proxy hacia la API y las cabeceras de caché. La carpeta local `.vercel/` solo es necesaria si se vincula el proyecto mediante la CLI de Vercel.

`node_modules/` y `dist/` se generan localmente y no se versionan.

## Documentación

- `PRODUCT.md`: alcance y reglas del producto.
- `DESIGN.md`: decisiones de diseño.
- `ANALITICA.md`: medición y recomendaciones de compra.
- `../docs/architecture/03-FRONTEND-MAP.md`: rutas y relaciones del frontend.

Los mapas se regeneran desde la raíz del repositorio con `node docs/architecture/tools/actualizar-mapa.mjs`.
