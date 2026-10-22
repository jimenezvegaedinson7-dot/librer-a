# Arquitectura del frontend

Estructura de `frontend/src` tras el reordenamiento. Cuatro capas con
responsabilidades separadas y dependencias en un solo sentido.

```
src/
├── app/            Composition root: arranque, router, providers, estilos globales
├── panel/          Superficie administrativa (dominios del panel)
├── web/            Superficie pública (tienda, portada, secciones)
└── compartido/      Lo que usan panel y web: UI base, utilidades, config, recursos
```

## Reglas

1. **Una sola dirección:** `app → panel | web → compartido`. Nadie importa
   desde `panel` hacia `web` ni al revés.
2. **`app` no tiene dominio:** solo arranque, rutas y providers globales.
3. **`compartido` no conoce superficies:** si un archivo necesita saber si está
   en el panel o en la web, no pertenece aquí.
4. **Cada superficie tiene sus estilos, hooks, config y recursos.**
5. **Nada se importa por ruta absoluta de `src`:** siempre rutas relativas, para
   que mover un archivo no rompa a sus consumidores.

## `app` — arranque y navegación

| Ruta | Contenido |
|---|---|
| `app/main.jsx` | Monta React, registra el service worker de recursos y precarga Three.js en el inicio. |
| `app/index.css` | Orden de carga de los estilos globales: tema del panel y base. |
| `app/ErrorBoundary.jsx` | Frontera de errores de la aplicación. |
| `app/router/AppRouter.jsx` | Tabla de rutas; las páginas se cargan en diferido. |
| `app/router/RutaProtegida.jsx`, `app/router/RutaPorRol.jsx` | Guardas de sesión y rol. |
| `app/providers/AuthContext.jsx` | Sesión del administrador. |
| `app/providers/ToastProvider.jsx` | Avisos globales. |

## `panel` — superficie administrativa

```
panel/
├── <dominio>/        auth, libros, ventas, pagos, … (una carpeta por dominio)
├── componentes/      Componentes propios del panel (PortadaCatalogo)
├── ui/               Componentes de interfaz reutilizables del panel
├── lib/              Cliente HTTP, hooks, almacenamiento y utilidades del panel
└── estilos/          Tokens y temas del panel
```

Cada dominio agrupa su página, sus servicios y sus componentes:
`panel/<dominio>/<dominio>Service.js` habla con la API y la página consume el
servicio, nunca `fetch` directo.

## `web` — superficie pública

```
web/
├── PublicLayout.jsx  Layout común: cabecera, pie, barra móvil, pila del carrito
├── paginas/          Composición de cada página (inicio, catálogo, …)
├── secciones/        Bloques de página (portada 3D, categorías, ofertas, video)
├── componentes/      Cabecera, pie, migas, badges de las tiendas de apps
├── tienda/           Compra: catálogo, ficha, carrito, checkout, cuenta
├── asistente/        Asistente de compra
├── animacion/        Motor de movimiento (GSAP, Lenis) y estilos asociados
├── hooks/            Hooks de la API pública
├── config/           Datos del sitio, descargas y tokens de movimiento
├── lib/              Formato, caché pública, precarga y service worker
├── estilos/          Estilos de la web, en orden de cascada explícito
└── assets/           Imágenes propias de la web
```

`web/estilos/` se importa en este orden dentro de `PublicLayout.jsx`:
`public-site.css` → `tema-editorial.css` → `responsive-movil.css` →
`tienda.css` → `formal.css` → `editorial-luminoso.css` → `editorial-ajustes.css`.
El último es el que decide: por eso los ajustes van al final.

## `compartido` — base común

| Ruta | Contenido |
|---|---|
| `compartido/ui/` | Botones, tablas, formularios, modales y avisos. |
| `compartido/lib/utils/` | Utilidades usadas por ambas superficies: portadas, formato, entrega, seguimiento. |
| `compartido/config/env.js` | URL de la API, resuelta como absoluta. |
| `compartido/assets/` | Logotipos, fondos de acceso y medios de pago. |

## Reglas de recursos

- Las imágenes se importan en JavaScript; nunca se escriben rutas a mano.
- `frontend/public/` solo guarda lo que el navegador pide por URL:
  `portadas/` (catálogo local por ISBN), `fonts/`, `precarga/` y
  `cache-recursos-sw.js`.
- El service worker (`public/cache-recursos-sw.js`) guarda imágenes, fuentes y
  los JS/CSS de producción con hash. No cachea HTML, JSON, sesiones ni
  respuestas `no-store`.

## Cómo se documenta

`docs/architecture/tools/actualizar-mapa.mjs` regenera el mapa del proyecto a
partir del código real: rutas, servicios, endpoints, grafo de imports y ciclos.
`npm run lint` y `npm run build` en `frontend/` deben pasar antes de dar por
terminado cualquier cambio.
