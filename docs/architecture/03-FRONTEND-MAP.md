# Mapa del frontend (React 19 + Vite + Tailwind 4) — Panel y tienda web

> Generado desde el código real el 2026-11-22 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Arranque

`index.html` → `src/app/main.jsx` → `<ErrorBoundary>` → `app/router/AppRouter.jsx`:
`<ToastProvider>` → `<AuthProvider>` → `<RouterProvider>` (react-router ^7.18.3).

- **Cliente HTTP**: `services/panel/api/client.js` (axios). `baseURL = VITE_API_URL`; los valores se configuran por entorno. El interceptor añade `Bearer <token>`, devuelve `response.data` y ante **401 de sesión** limpia la sesión y redirige a `/admin/login`. Los 401 de credencial incorrecta se distinguen con `services/panel/auth/erroresSesion.js`.
- **Sesión**: `app/providers/AuthProvider.jsx` mantiene el estado; `app/providers/AuthContext.js` expone el contexto y `useAuth`. `services/panel/storage/index.js` guarda `token` y `usuario` en localStorage. Solo entra `administrador`; perfil actualiza los datos de sesión desde la API.
- **Cliente web**: `components/web/tienda/TiendaProvider.jsx` y `services/web/tienda/clienteApi.js` mantienen sesión exclusiva de `cliente`, carrito por usuario/invitado e intento de compra persistente; `components/web/tienda/TiendaContext.js` expone `useTienda`. Nunca usan la sesión administrativa. `PublicLayout` los proporciona a cuenta, carrito, checkout, compras y detalle del libro.
- **Guards**: `app/router/RutaProtegida.jsx` redirige a `/admin/login` sin sesión administrativa; `app/router/RutaPorRol.jsx` exige los roles configurados. Un **403** muestra rechazo de permisos.
- **Layout**: `components/panel/layout/AdminLayout.jsx` (Sidebar, Topbar, Breadcrumbs, transición con Framer Motion, tema claro fijo).
- **Altas de catálogo**: Libros, Autores y Categorías muestran botones normales en la cabecera de sus filtros. `AltaFlotante` monta el formulario únicamente al pulsarlos y lo presenta en un `Modal` mediante portal dentro del layout administrativo. Cancelar desmonta el borrador; el éxito cierra el diálogo y refresca el listado; un error conserva los campos. `Modal` contiene el foco del diálogo superior y mantiene el bloqueo de scroll al abrir descuentos sobre el alta de libros.
- **Descuento en el alta de libros**: el botón `Agregar descuento` abre el editor opcional. Si se intenta guardar sin una oferta ni una elección previa, el formulario validado pregunta si se desea agregar un descuento o registrar con el precio normal. Solo `Registrar sin descuento` confirma ese envío; configurar una oferta vuelve al formulario para guardarla junto al libro. Edición conserva el mismo editor de descuentos y los endpoints existentes.
- **Aviso de portada en altas**: tras validar los datos, `LibroForm` avisa si no se seleccionó un archivo de portada. Permite abrir el selector o continuar explícitamente sin subir imagen; no envía el registro antes de esa decisión. Quitar la imagen vuelve a habilitar el aviso. Las referencias de portada por ISBN y el contrato de subida existente permanecen en su capa correspondiente.
- **Tablas del panel**: `styles/panel/tablas-formales.css` se carga después de los estilos existentes y se aplica a `main[data-tablas-formales="true"]` o a un bloque explícito `.tabla-panel`. El Dashboard declara false; su cuadro Últimos libros agregados usa `.tabla-panel`, `CardHeader` y `DataTable` para compartir encabezados, colores y filas con los listados. `CardHeader` separa `filtros` de `acciones` en una rejilla etiquetada. `DataTable` admite clases por columna, nombre accesible, desplazamiento con teclado y aviso de desbordamiento. `FechaTabla` presenta fecha y hora en líneas separadas. Pedidos combina canal y tipo de entrega para el ámbito de sus indicadores; el estado solo filtra la lista.
- **Revisión de secciones**: la pantalla y el servicio React de Historial se retiraron; `/historial` redirige al Dashboard. Empresa abre en consulta y solo muestra el formulario al pulsar Editar datos. Stock reutiliza `AltaFlotante` para registrar inventario bajo demanda. `ErrorCarga` ofrece recuperación explícita y los indicadores de listas fallidas muestran No disponible. Las consultas de clientes descartan respuestas antiguas y los estados vacíos diferencian búsquedas sin coincidencias de listas sin registros.
- **Tema**: El layout actual declara `data-theme="light"`; `/personalizacion` redirige a `/dashboard`. `styles/index.css` carga `styles/panel/paleta-editorial.css`, `styles/panel/theme.css`, `styles/panel/panel-editorial.css` y `styles/panel/panel-formal.css`. La tienda usa su propio tema en `styles/web/tema-editorial.css`. Los iconos de navegación y búsqueda se centralizan en `models/panel/layout/navConfig.js`.
- **Despliegue**: Vercel (`frontend/vercel.json` reescribe todo a `index.html`).
- **Estructura**: `frontend/src` está organizado por capas. `app/` conserva el arranque (main, ErrorBoundary, router con guardas y providers). `views/` agrupa las pantallas en `panel/` y `web/` (`publicas/` y `tienda/`). `components/` separa los componentes `panel/` y `web/` (incluidos `PublicLayout.jsx`, `secciones/` y `ui/`). `services/`, `models/`, `hooks/`, `assets/` y `styles/` agrupan respectivamente clientes/configuración, estado compartido, hooks, recursos y estilos; `styles/` contiene `index.css`, `web/` y `panel/`. Las dependencias van en un solo sentido: app → views → components → services/models/hooks → assets/styles. El detalle está en `docs/architecture/04-ARQUITECTURA-FRONTEND.md`.

## Portada ORBIT y carga por rutas

- El inicio monta `components/web/secciones/PortadaDiferida.jsx`: normaliza el catálogo, filtra libros activos con portada y precio, ordena por `creadoEn` y entrega hasta 16 recientes a una única `PortadaEspacial.jsx`. No hay libro protagonista, respaldo con `LibroInicial.jsx`, WebGL, canvas, GSAP/ScrollTrigger ni precarga del motor 3D desde `main.jsx`.
- `PortadaEspacial.jsx` pinta el bloque editorial y el carrusel ORBIT con el mismo DOM desde el inicio. El carrusel usa `--giro: 42s`, arrastre que compensa la fase de las animaciones sin girar el plano y una sombra dorada tenue bajo la órbita; no hay flechas, botón de pausa ni texto de ayuda. Mantener presionada una portada pausa la animación y soltarla la reanuda; pasar el cursor o enfocar un enlace no la detiene.
- `cachePortada.js` guarda solo los recientes bajo `lds:carrusel-orbite:v3:<API>` con expiración y validación; una caché vencida o corrupta se descarta sin bloquear la navegación.
- Los estilos viven en `secciones/portada3d/portada3d.css` con biblioteca pastel tenue compartida con el asistente, jerarquía editorial descendente con titular serif amplio, énfasis dorado mayor, comilla tenue y halo cálido en el bloque de texto, subtítulo «Últimos libros agregados» y espacio inferior reducido. Las portadas usan `object-fit: contain`; el círculo es compacto y se eleva respecto al texto para no chocar con él.
- Aplicación integra las características de compra en una sola página; ya no existe la ruta `/caracteristicas` ni su módulo de página. Nosotros y Descargar tienen módulos de página separados. La cabecera pública ya no muestra el enlace genérico `Catálogo`: abre con `Inicio` primero, después hasta cinco categorías del catálogo real priorizadas como en la referencia (`Cómic y Manga`, `Ficción`, `No Ficción`, `Juvenil`, `Infantil`, luego cantidad real), ofrece `Ofertas` como `/catalogo?ofertas=1` y muestra por encima de 1024 px un panel desplegable con enlaces internos y hasta ocho libros propios de cada categoría. El pie conserva el enlace al catálogo. `AdminLayout` y el formulario público de reclamaciones se cargan bajo demanda; la tienda y el login no descargan el layout administrativo.
- `styles/web/limpia.css` retira vidrio, destellos, facetas y sombras de espejo. El acceso administrativo conserva el libro CSS y su apertura breve, con páginas sólidas y recuperación en la siguiente hoja.
- `PublicLayout` usa scroll nativo y foco accesible al navegar; no inicia el motor global GSAP ni precarga masivamente todas las portadas.
- Catálogo, recomendados, ofertas, asistente y favoritos habilitan el enlace real de detalle en `ComprarLibro`, sin sustituir la acción de agregar al carrito ni sus estilos compartidos. `models/config/web/site.js` declara los metadatos de Favoritos y Reclamaciones; `ReclamacionesPublicasPage` aplica y restaura título, descripción y URL canónica al ser una ruta pública fuera de `PublicLayout`.
- `secciones/OfertasDestacadas.jsx` organiza ofertas en tarjetas verticales con estilos propios en `ofertas-destacadas.css`: cuatro columnas de carrusel en escritorio, tres en tabletas y dos en teléfonos. Portada y título enlazan a `/libro/:id`. `ComprarLibro` habilita `enlaceDetalle` para agrupar el carrito y un enlace real a la ficha. Los botones heredan tamaño adaptable, forma de píldora, colores y texto de las reglas compartidas de las demás tarjetas; el detalle se mantiene próximo y se apila en tarjetas estrechas. Las demás superficies conservan su modo de detalle existente.
- La cabecera comercial y el pie se implementan en `components/web/PublicHeader.jsx`, `PublicFooter.jsx` y sus estilos locales siguiendo la composición de Casa del Libro: dos franjas superiores a ancho completo (`#dfe6dd` y `#004d43`) desde 992 px, cabecera blanca con logotipo y acciones en verde `#004d43`, buscador con marco `#cfcfcf` que ocupa toda su columna y botón de lupa integrado, y navegación blanca con separadores `|` y subrayado inferior verde en hover/activo; hasta 1023 px el buscador de escritorio se oculta, menú, marca y acciones comparten la primera fila y el buscador móvil va debajo a ancho completo, y por debajo de 576 px la cabecera pasa a fondo verde con controles blancos. `editorial-ajustes.css` concentra ese tratamiento. `PublicFooter.jsx` y `public-footer.css` usan tres franjas: crema `#fff5e6` con enlace real al catálogo y cuatro servicios, bloque verde `#004d43` con cuatro columnas de identidad/dirección real, navegación, cuenta y atención, y franja legal gris `#f3f3f3` con pagos PayU y tarjetas existentes. Reclamaciones y acceso administrativo siguen disponibles; móvil usa dos columnas y espacio para barra/asistente. No se añade formulario de suscripción falso. Buscador, cuenta, carrito y cajón móvil conservan sus funciones.
- `CatalogoPage.jsx` muestra sobre la rejilla un bloque de «Categorías destacadas» con hasta ocho enlaces de texto derivados de `libro.categoria`, ordenados por la misma prioridad de referencia que la cabecera y luego por cantidad real, que filtran por `/catalogo?categoria=...`; «Ver más temáticas» lleva al filtro completo del lateral. Sin libros reales no se inventa ninguna categoría.
- No se crea AudioContext ni hay controles de sonido. Movimiento reducido deja el carrusel quieto y accesible mediante transformaciones estáticas.
- Regresiones: `test-browser/portada-espacial.spec.js`, `web-ligera.spec.js`, `portada-carga.spec.js` y navegación/responsive públicos comprueban ausencia de canvas y del antiguo endpoint de protagonista, rotación, pausa al mantener presionada una portada, anti-corte, separación del texto y ausencia de desbordes.

## Analítica y recomendaciones según compras

- `services/web/analitica.js` integra GA4 con etiqueta asíncrona. `resolverMedicion` usa el flujo oficial únicamente en producción sobre los dominios de la librería, con prioridad de `VITE_GA4_ID` para reemplazarlo o desactivarlo explícitamente. Desarrollo y previews no utilizan el valor automático. `VITE_GA4_DEBUG` habilita DebugView. Sin ID válido no carga la etiqueta. Desactiva Signals y personalización publicitaria; respeta Global Privacy Control.
- `PublicLayout` registra navegación, `LibroPage` fichas y `CheckoutPage` inicio del checkout. `TiendaProvider` mide agregados realmente guardados y compras web pagadas que corresponden al intento local. Deduplica la venta, usa sus precios históricos y separa el envío. El historial antiguo no se registra como nuevas compras. Las URL de eventos excluyen query/hash y no se exportan objetos de cliente o sesión.
- `RecomendacionesCompra.jsx` aparece después de la primera compra en Mis compras y consulta `GET /api/libros/recomendados` con JWT cliente. El modelo utiliza exclusivamente compras pagadas/entregadas de la cuenta: afinidad de autor y categoría, hasta ocho libros activos con stock y sin repetir títulos ya comprados. No requiere nuevas tablas ni servicio externo de recomendaciones.
- Los motivos, errores recuperables y estado vacío se muestran con los componentes comerciales existentes. La lista mide impresiones al entrar en pantalla y selección de una sugerencia. Configuración y alcance: `frontend/ANALITICA.md`.

| Integración detectada | Transporte | Archivo | Variables de configuración |
|---|---|---|---|

## Caché y prioridad de carga pública

- `public/cache-recursos-sw.js`, registrado desde `PublicLayout` mediante `services/web/cacheRecursos.js`, guarda hasta 200 imágenes, fuentes y archivos JS/CSS de producción con hash en CacheStorage. Sirve los recursos guardados inmediatamente y revalida los que superan 24 horas. No intercepta HTML, JSON, sesiones ni operaciones; respeta respuestas privadas/no-store y no guarda errores ni HTML devuelto como imagen. La escritura de caché no bloquea la primera imagen.
- `services/web/cachePublica.js` conserva durante 15 minutos datos públicos de catálogo, fichas, autores, empresa y anuncios (hasta 40 entradas y 2 MiB). Los hooks y `LibroPage` pueden mostrarlos durante la consulta de red; las respuestas actualizadas prevalecen y los 404/410 invalidan fichas guardadas. `clienteApi` sigue consultando la red; checkout y pagos no leen esta caché.
- `index.html` no contiene ni activa una pantalla de precarga: el contenido no espera fuentes, imágenes ni canvas. Las fuentes de Google del panel se piden únicamente desde `usePaginaPanel`. La web pública conserva fuentes locales con swap.
- Las portadas del carrusel usan imágenes lazy de hasta 320px; el catálogo mantiene su carga prioritaria y `ImagenCarga.jsx` solo asigna src/srcSet a imágenes lazy cuando IntersectionObserver las aproxima al viewport. Se retiró la precarga de todo el catálogo a dos tamaños. `cachePortada.js` conserva solo los recientes con sus datos públicos y prueba vigente `portada-carga.spec.js`. Pruebas vigentes: `web-ligera.spec.js`, `portada-carga.spec.js`, `cache-publica.spec.js`, `compra-web.spec.js` y navegación/responsive públicos.

## Rutas

El menú reúne **Gestión de ventas** en `/ventas` con tres vistas cargadas bajo demanda: Ventas y pagos (índice), Pedidos (`/ventas/pedidos`) y Comprobantes (`/ventas/comprobantes`). Las direcciones anteriores `/pagos`, `/pedidos` y `/comprobantes` redirigen conservando query y hash. La lista comercial usa los campos PayU de `GET /api/ventas`; las notificaciones abren su detalle mediante `?ver=referencia`. Los comprobantes vinculados usan `?venta=id` y el filtro exacto `GET /api/comprobantes?id_venta=id`, validado y confirmado por la API.

| Ruta | Componente | Archivo |
|---|---|---|
| `/` | InicioPage | `views/web/publicas/paginas.jsx` |
| `/catalogo` | CatalogoPublicoPage | `views/web/publicas/CatalogoPage.jsx` |
| `/nosotros` | NosotrosPage | `views/web/publicas/NosotrosPage.jsx` |
| `/descargar` | DescargarPage | `views/web/publicas/DescargarPage.jsx` |
| `/cuenta` | CuentaClientePage | `views/web/tienda/CuentaPage.jsx` |
| `/carrito` | CarritoWebPage | `views/web/tienda/CarritoPage.jsx` |
| `/checkout` | CheckoutWebPage | `views/web/tienda/CheckoutPage.jsx` |
| `/mis-compras` | MisComprasWebPage | `views/web/tienda/MisComprasPage.jsx` |
| `/favoritos` | FavoritosWebPage | `views/web/tienda/FavoritosPage.jsx` |
| `/libro/:id` | LibroPublicoPage | `views/web/tienda/LibroPage.jsx` |
| `/buscar` | BuscarPage | `views/web/publicas/BuscarPage.jsx` |
| `/admin/login` | LoginPage | `views/panel/auth/LoginPage.jsx` |
| `/admin` | Navigate | redirección: `<Navigate to="/admin/login" replace />` |
| `/verificar-email` | VerificarEmailPage | `views/panel/auth/VerificarEmailPage.jsx` |
| `/libro-de-reclamaciones` | LibroReclamacionesPage | `views/web/publicas/ReclamacionesPublicasPage.jsx` |
| `/dashboard` | DashboardPage | `views/panel/dashboard/DashboardPage.jsx` |
| `/libros` | LibrosAutoresPage | `views/panel/libros/LibrosAutoresPage.jsx` |
| `/autores` | Navigate | redirección: `para(SOLO_ADMIN, <Navigate to="/libros?vista=autores" replace />)` |
| `/categorias` | CategoriasPage | `views/panel/categorias/CategoriasPage.jsx` |
| `/inventario` | InventarioPage | `views/panel/inventario/InventarioPage.jsx` |
| `/reservas` | Navigate | redirección: `<Navigate to="/dashboard" replace />` |
| `/ventas` | GestionVentasPage | `views/panel/ventas/GestionVentasPage.jsx` |
| `/ventas` | VentasPage | `views/panel/ventas/VentasPage.jsx` |
| `/ventas/pedidos` | PedidosPage | `views/panel/pedidos/PedidosPage.jsx` |
| `/ventas/comprobantes` | ComprobantesPage | `views/panel/comprobantes/ComprobantesPage.jsx` |
| `/pedidos` | RedirigirOperacion | — |
| `/comprobantes` | RedirigirOperacion | — |
| `/pagos` | RedirigirOperacion | — |
| `/usuarios` | UsuariosPage | `views/panel/usuarios/UsuariosPage.jsx` |
| `/clientes` | Navigate | redirección: `para(SOLO_ADMIN, <Navigate to="/usuarios" replace />)` |
| `/reclamaciones` | ReclamacionesPage | `views/panel/reclamaciones/ReclamacionesPage.jsx` |
| `/anuncios` | AnunciosPage | `views/panel/anuncios/AnunciosPage.jsx` |
| `/tarifas-envio` | TarifasEnvioPage | `views/panel/tarifas/TarifasEnvioPage.jsx` |
| `/historial` | Navigate | redirección: `para(SOLO_ADMIN, <Navigate to="/dashboard" replace />)` |
| `/configuracion/empresa` | EmpresaPage | `views/panel/configuracion/EmpresaPage.jsx` |
| `/personalizacion` | Navigate | redirección: `<Navigate to="/dashboard" replace />` |
| `/agencias` | Navigate | redirección: `<Navigate to="/dashboard" replace />` |
| `/cierre-caja` | Navigate | redirección: `<Navigate to="/dashboard" replace />` |
| `/reportes` | Navigate | redirección: `<Navigate to="/dashboard" replace />` |
| `*` | Navigate | redirección: `<Navigate to="/" replace />` |

El panel cuelga de `<RutaProtegida><AdminLayout/></RutaProtegida>` y permite solo administrador. `/`, `/verificar-email` y `/libro-de-reclamaciones` son públicas. `/reportes` y `/cierre-caja` redirigen a `/dashboard`; `/agencias` a `/`.

## Cadena página → servicio → endpoint

Archivos que importan funciones de servicio y los endpoints que alcanzan (el componente puede ser una página, un formulario o un modal):

| Archivo | Endpoints |
|---|---|
| `components/panel/autores/AutorEditModal.jsx` | `PUT /api/autores/:param` |
| `components/panel/autores/AutorForm.jsx` | `POST /api/autores` |
| `components/panel/categorias/CategoriaEditModal.jsx` | `PUT /api/categorias/:param` |
| `components/panel/categorias/CategoriaForm.jsx` | `POST /api/categorias` |
| `components/panel/comprobantes/AnularComprobanteModal.jsx` | `POST /api/comprobantes/:param/anular` |
| `components/panel/comprobantes/ComprobanteViewModal.jsx` | `GET /api/comprobantes/:param`<br>`GET /api/empresa` |
| `components/panel/inventario/InventarioEditModal.jsx` | `PUT /api/inventario/libro/:param` |
| `components/panel/inventario/InventarioForm.jsx` | `POST /api/inventario` |
| `components/panel/inventario/MovimientosModal.jsx` | `GET /api/inventario/movimientos`<br>`GET /api/libros` |
| `components/panel/layout/PerfilAdministrador.jsx` | `GET /api/usuarios/perfil`<br>`POST /api/auth/2fa/confirm`<br>`POST /api/auth/2fa/disable`<br>`POST /api/auth/2fa/setup`<br>`PUT /api/usuarios/foto`<br>`PUT /api/usuarios/password`<br>`PUT /api/usuarios/perfil` |
| `components/panel/libros/LibroEditModal.jsx` | `GET /api/autores`<br>`GET /api/categorias`<br>`GET /api/libros/:param`<br>`PUT /api/libros/:param` |
| `components/panel/libros/LibroForm.jsx` | `GET /api/libros/:param`<br>`POST /api/libros` |
| `components/panel/ventas/EmitirComprobanteModal.jsx` | `GET /api/empresa`<br>`POST /api/comprobantes/:param/enviar-email`<br>`POST /api/ventas/:param/comprobante` |
| `components/panel/ventas/ReembolsoModal.jsx` | `POST /api/ventas/:param/reembolso` |
| `components/web/ActualizarApp.jsx` | `GET /api/app/version` |
| `components/web/PublicLayout.jsx` | `GET /api/empresa`<br>`GET /api/libros` |
| `components/web/secciones/VideoSection.jsx` | `GET /api/anuncios` |
| `components/web/tienda/AccionesLibro.jsx` | `DELETE /api/favoritos/:param`<br>`GET /api/favoritos/:param`<br>`POST /api/favoritos/:param` |
| `components/web/tienda/PerfilCliente.jsx` | `PUT /api/usuarios/foto`<br>`PUT /api/usuarios/perfil` |
| `components/web/tienda/RecomendacionesCompra.jsx` | `GET /api/libros/recomendados` |
| `components/web/tienda/TiendaProvider.jsx` | `GET /api/libros`<br>`GET /api/usuarios/perfil`<br>`GET /api/ventas/:param` |
| `hooks/panel/inventario/useLibros.js` | `GET /api/libros` |
| `hooks/panel/libros/useCatalogo.js` | `GET /api/autores`<br>`GET /api/categorias` |
| `hooks/web/tienda/useDatosCliente.js` | `GET /api/ventas/mis-ventas` |
| `services/panel/dashboard/dashboardService.js` | `GET /api/inventario/stock-bajo`<br>`GET /api/libros`<br>`GET /api/reportes/indicadores-ventas`<br>`GET /api/reportes/libros-mas-vendidos`<br>`GET /api/reportes/resumen`<br>`GET /api/reportes/ventas-por-dia`<br>`GET /api/reportes/ventas-por-estado`<br>`GET /api/reportes/ventas-por-mes` |
| `services/panel/notificaciones/notificacionesService.js` | `GET /api/inventario/stock-bajo`<br>`GET /api/pagos` |
| `services/web/tienda/persistenciaCompra.js` | `POST /api/pagos/crear-orden` |
| `views/panel/anuncios/AnunciosPage.jsx` | `DELETE /api/anuncios/:param`<br>`GET /api/anuncios/todos`<br>`POST /api/anuncios`<br>`PUT /api/anuncios/:param` |
| `views/panel/auth/LoginPage.jsx` | `POST /api/auth/2fa/verify-login`<br>`POST /api/auth/login`<br>`POST /api/auth/reestablecer-contrasena`<br>`POST /api/auth/solicitar-reseteo` |
| `views/panel/auth/VerificarEmailPage.jsx` | `POST /api/auth/reenviar-codigo`<br>`POST /api/auth/verificar-email` |
| `views/panel/autores/AutoresPage.jsx` | `DELETE /api/autores/:param`<br>`GET /api/autores`<br>`GET /api/autores/:param` |
| `views/panel/categorias/CategoriasPage.jsx` | `DELETE /api/categorias/:param`<br>`GET /api/categorias`<br>`GET /api/categorias/:param` |
| `views/panel/comprobantes/ComprobantesPage.jsx` | `GET /api/comprobantes`<br>`GET /api/comprobantes/resumen`<br>`POST /api/comprobantes/:param/enviar-email` |
| `views/panel/configuracion/EmpresaPage.jsx` | `GET /api/empresa`<br>`PUT /api/empresa` |
| `views/panel/dashboard/DashboardPage.jsx` | `GET /api/inventario/stock-bajo`<br>`GET /api/libros`<br>`GET /api/reportes/indicadores-ventas`<br>`GET /api/reportes/libros-mas-vendidos`<br>`GET /api/reportes/resumen`<br>`GET /api/reportes/ventas-por-dia`<br>`GET /api/reportes/ventas-por-estado`<br>`GET /api/reportes/ventas-por-mes` |
| `views/panel/inventario/InventarioPage.jsx` | `GET /api/inventario`<br>`GET /api/inventario/libro/:param` |
| `views/panel/libros/LibrosPage.jsx` | `DELETE /api/libros/:param`<br>`GET /api/inventario`<br>`GET /api/libros`<br>`GET /api/libros/:param` |
| `views/panel/pedidos/PedidosPage.jsx` | `GET /api/pedidos`<br>`GET /api/pedidos/:param`<br>`PUT /api/pedidos/:param/estado` |
| `views/panel/reclamaciones/ReclamacionesPage.jsx` | `GET /api/reclamaciones`<br>`GET /api/reclamaciones/resumen`<br>`PUT /api/reclamaciones/:param/respuesta` |
| `views/panel/tarifas/TarifasEnvioPage.jsx` | `GET /api/zonas-delivery/todos`<br>`PUT /api/zonas-delivery/:param` |
| `views/panel/usuarios/UsuariosPage.jsx` | `GET /api/usuarios`<br>`PATCH /api/usuarios/:param` |
| `views/panel/ventas/VentasPage.jsx` | `GET /api/ventas`<br>`GET /api/ventas/:param` |
| `views/web/publicas/BuscarPage.jsx` | `GET /api/libros`<br>`POST /api/libros/busqueda-inteligente` |
| `views/web/publicas/LibroReclamacionesPage.jsx` | `GET /api/empresa`<br>`POST /api/reclamaciones` |
| `views/web/tienda/CheckoutPage.jsx` | `GET /api/pagos/capacidades`<br>`GET /api/ventas/:param`<br>`GET /api/zonas-delivery` |
| `views/web/tienda/CuentaPage.jsx` | `POST /api/auth/2fa/verify-login`<br>`POST /api/auth/login`<br>`POST /api/auth/reenviar-codigo`<br>`POST /api/auth/reestablecer-contrasena`<br>`POST /api/auth/registro`<br>`POST /api/auth/solicitar-reseteo`<br>`POST /api/auth/verificar-email`<br>`POST /api/auth/verificar-reseteo` |
| `views/web/tienda/FavoritosPage.jsx` | `DELETE /api/favoritos/:param`<br>`GET /api/favoritos` |
| `views/web/tienda/LibroPage.jsx` | `GET /api/autores/:param`<br>`GET /api/libros/:param`<br>`GET /api/libros/:param/relacionados` |
| `views/web/tienda/MisComprasPage.jsx` | `GET /api/pagos/:param`<br>`GET /api/ventas/:param/pago`<br>`GET /api/ventas/mis-ventas` |

## Servicios (`services/panel/**/*Service.js`)

| Servicio | Función | Endpoint |
|---|---|---|
| `hooks/web/useApiPublica.js` | `useCatalogo` | `GET /api/libros` |
| `hooks/web/useApiPublica.js` | `useAnuncioActivo` | `GET /api/anuncios` |
| `hooks/web/useApiPublica.js` | `useEmpresa` | `GET /api/empresa` |
| `hooks/web/useApiPublica.js` | `useVersionApp` | `GET /api/app/version` |
| `services/panel/anuncios/anunciosService.js` | `listarAnuncios` | `GET /api/anuncios/todos` |
| `services/panel/anuncios/anunciosService.js` | `crearAnuncio` | `POST /api/anuncios` |
| `services/panel/anuncios/anunciosService.js` | `actualizarAnuncio` | `PUT /api/anuncios/:param` |
| `services/panel/anuncios/anunciosService.js` | `eliminarAnuncio` | `DELETE /api/anuncios/:param` |
| `services/panel/auth/authService.js` | `login` | `POST /api/auth/login` |
| `services/panel/auth/authService.js` | `verificarEmail` | `POST /api/auth/verificar-email` |
| `services/panel/auth/authService.js` | `reenviarCodigo` | `POST /api/auth/reenviar-codigo` |
| `services/panel/auth/authService.js` | `verificarLoginOtp` | `POST /api/auth/2fa/verify-login` |
| `services/panel/auth/authService.js` | `setup2fa` | `POST /api/auth/2fa/setup` |
| `services/panel/auth/authService.js` | `confirmar2fa` | `POST /api/auth/2fa/confirm` |
| `services/panel/auth/authService.js` | `desactivar2fa` | `POST /api/auth/2fa/disable` |
| `services/panel/auth/authService.js` | `solicitarReseteo` | `POST /api/auth/solicitar-reseteo` |
| `services/panel/auth/authService.js` | `restablecerContrasena` | `POST /api/auth/reestablecer-contrasena` |
| `services/panel/auth/perfilService.js` | `obtenerPerfil` | `GET /api/usuarios/perfil` |
| `services/panel/auth/perfilService.js` | `actualizarPerfil` | `PUT /api/usuarios/perfil` |
| `services/panel/auth/perfilService.js` | `actualizarFoto` | `PUT /api/usuarios/foto` |
| `services/panel/auth/perfilService.js` | `cambiarPassword` | `PUT /api/usuarios/password` |
| `services/panel/autores/autoresService.js` | `listarAutores` | `GET /api/autores` |
| `services/panel/autores/autoresService.js` | `obtenerAutor` | `GET /api/autores/:param` |
| `services/panel/autores/autoresService.js` | `crearAutor` | `POST /api/autores` |
| `services/panel/autores/autoresService.js` | `actualizarAutor` | `PUT /api/autores/:param` |
| `services/panel/autores/autoresService.js` | `eliminarAutor` | `DELETE /api/autores/:param` |
| `services/panel/categorias/categoriasService.js` | `listarCategorias` | `GET /api/categorias` |
| `services/panel/categorias/categoriasService.js` | `obtenerCategoria` | `GET /api/categorias/:param` |
| `services/panel/categorias/categoriasService.js` | `crearCategoria` | `POST /api/categorias` |
| `services/panel/categorias/categoriasService.js` | `actualizarCategoria` | `PUT /api/categorias/:param` |
| `services/panel/categorias/categoriasService.js` | `eliminarCategoria` | `DELETE /api/categorias/:param` |
| `services/panel/comprobantes/comprobantesService.js` | `listarComprobantes` | `GET /api/comprobantes` |
| `services/panel/comprobantes/comprobantesService.js` | `obtenerComprobante` | `GET /api/comprobantes/:param` |
| `services/panel/comprobantes/comprobantesService.js` | `emitirComprobante` | `POST /api/ventas/:param/comprobante` |
| `services/panel/comprobantes/comprobantesService.js` | `enviarComprobanteEmail` | `POST /api/comprobantes/:param/enviar-email` |
| `services/panel/comprobantes/comprobantesService.js` | `obtenerResumen` | `GET /api/comprobantes/resumen` |
| `services/panel/comprobantes/comprobantesService.js` | `anularComprobante` | `POST /api/comprobantes/:param/anular` |
| `services/panel/configuracion/empresaService.js` | `obtenerEmpresa` | `GET /api/empresa` |
| `services/panel/configuracion/empresaService.js` | `actualizarEmpresa` | `PUT /api/empresa` |
| `services/panel/dashboard/dashboardService.js` | `obtenerLibros` | `GET /api/libros` (vía services/panel/libros/librosService.js#listarLibros) |
| `services/panel/dashboard/dashboardService.js` | `obtenerResumen` | `GET /api/reportes/resumen` (vía services/panel/reportes/reportesService.js#obtenerResumen) |
| `services/panel/dashboard/dashboardService.js` | `obtenerLibrosMasVendidos` | `GET /api/reportes/libros-mas-vendidos` (vía services/panel/reportes/reportesService.js#obtenerLibrosMasVendidos) |
| `services/panel/dashboard/dashboardService.js` | `obtenerVentasPorEstado` | `GET /api/reportes/ventas-por-estado` (vía services/panel/reportes/reportesService.js#obtenerVentasPorEstado) |
| `services/panel/dashboard/dashboardService.js` | `obtenerVentasPorMes` | `GET /api/reportes/ventas-por-mes` (vía services/panel/reportes/reportesService.js#obtenerVentasPorMes) |
| `services/panel/dashboard/dashboardService.js` | `obtenerVentasPorDia` | `GET /api/reportes/ventas-por-dia` (vía services/panel/reportes/reportesService.js#obtenerVentasPorDia) |
| `services/panel/dashboard/dashboardService.js` | `obtenerIndicadoresVentas` | `GET /api/reportes/indicadores-ventas` (vía services/panel/reportes/reportesService.js#obtenerIndicadoresVentas) |
| `services/panel/dashboard/dashboardService.js` | `obtenerStockBajo` | `GET /api/inventario/stock-bajo` (vía services/panel/reportes/reportesService.js#obtenerStockBajo) |
| `services/panel/inventario/inventarioService.js` | `listarInventario` | `GET /api/inventario` |
| `services/panel/inventario/inventarioService.js` | `obtenerInventarioLibro` | `GET /api/inventario/libro/:param` |
| `services/panel/inventario/inventarioService.js` | `crearInventario` | `POST /api/inventario` |
| `services/panel/inventario/inventarioService.js` | `actualizarInventario` | `PUT /api/inventario/libro/:param` |
| `services/panel/inventario/inventarioService.js` | `listarMovimientos` | `GET /api/inventario/movimientos` |
| `services/panel/inventario/inventarioService.js` | `listarLibros` | `GET /api/libros` (vía services/panel/libros/librosService.js#listarLibros) |
| `services/panel/libros/librosService.js` | `listarLibros` | `GET /api/libros` |
| `services/panel/libros/librosService.js` | `obtenerLibro` | `GET /api/libros/:param` |
| `services/panel/libros/librosService.js` | `crearLibro` | `POST /api/libros`<br>`GET /api/libros/:param` (vía services/panel/libros/librosService.js#obtenerLibro) |
| `services/panel/libros/librosService.js` | `actualizarLibro` | `PUT /api/libros/:param`<br>`GET /api/libros/:param` (vía services/panel/libros/librosService.js#obtenerLibro)<br>`GET /api/libros/:param` (vía services/panel/libros/librosService.js#obtenerLibro) |
| `services/panel/libros/librosService.js` | `eliminarLibro` | `DELETE /api/libros/:param` |
| `services/panel/libros/librosService.js` | `listarAutores` | `GET /api/autores` |
| `services/panel/libros/librosService.js` | `listarCategorias` | `GET /api/categorias` |
| `services/panel/pagos/pagosService.js` | `listarPagos` | `GET /api/pagos` |
| `services/panel/pedidos/pedidosService.js` | `listarPedidos` | `GET /api/pedidos` |
| `services/panel/pedidos/pedidosService.js` | `obtenerPedido` | `GET /api/pedidos/:param` |
| `services/panel/pedidos/pedidosService.js` | `cambiarEstadoPedido` | `PUT /api/pedidos/:param/estado` |
| `services/panel/reclamaciones/reclamacionesService.js` | `registrarReclamacion` | `POST /api/reclamaciones` |
| `services/panel/reclamaciones/reclamacionesService.js` | `listarReclamaciones` | `GET /api/reclamaciones` |
| `services/panel/reclamaciones/reclamacionesService.js` | `obtenerResumenReclamaciones` | `GET /api/reclamaciones/resumen` |
| `services/panel/reclamaciones/reclamacionesService.js` | `responderReclamacion` | `PUT /api/reclamaciones/:param/respuesta` |
| `services/panel/reclamaciones/reclamacionesService.js` | `obtenerEmpresaPublica` | `GET /api/empresa` |
| `services/panel/reportes/reportesService.js` | `obtenerResumen` | `GET /api/reportes/resumen` |
| `services/panel/reportes/reportesService.js` | `obtenerLibrosMasVendidos` | `GET /api/reportes/libros-mas-vendidos` |
| `services/panel/reportes/reportesService.js` | `obtenerVentasPorEstado` | `GET /api/reportes/ventas-por-estado` |
| `services/panel/reportes/reportesService.js` | `obtenerStockBajo` | `GET /api/inventario/stock-bajo` |
| `services/panel/reportes/reportesService.js` | `obtenerVentasPorMes` | `GET /api/reportes/ventas-por-mes` |
| `services/panel/reportes/reportesService.js` | `obtenerVentasPorDia` | `GET /api/reportes/ventas-por-dia` |
| `services/panel/reportes/reportesService.js` | `obtenerIndicadoresVentas` | `GET /api/reportes/indicadores-ventas` |
| `services/panel/tarifas/tarifasService.js` | `listarZonasDelivery` | `GET /api/zonas-delivery/todos` |
| `services/panel/tarifas/tarifasService.js` | `actualizarTarifaDelivery` | `PUT /api/zonas-delivery/:param` |
| `services/panel/usuarios/usuariosService.js` | `listarUsuarios` | `GET /api/usuarios` |
| `services/panel/usuarios/usuariosService.js` | `actualizarUsuario` | `PATCH /api/usuarios/:param` |
| `services/panel/ventas/ventasService.js` | `listarVentas` | `GET /api/ventas` |
| `services/panel/ventas/ventasService.js` | `obtenerVenta` | `GET /api/ventas/:param` |
| `services/panel/ventas/ventasService.js` | `reembolsarVenta` | `POST /api/ventas/:param/reembolso` |
| `services/web/tienda/clienteApi.js` | `login` | `POST /api/auth/login` |
| `services/web/tienda/clienteApi.js` | `registro` | `POST /api/auth/registro` |
| `services/web/tienda/clienteApi.js` | `verificarEmail` | `POST /api/auth/verificar-email` |
| `services/web/tienda/clienteApi.js` | `reenviarCodigo` | `POST /api/auth/reenviar-codigo` |
| `services/web/tienda/clienteApi.js` | `solicitarReseteo` | `POST /api/auth/solicitar-reseteo` |
| `services/web/tienda/clienteApi.js` | `verificarReseteo` | `POST /api/auth/verificar-reseteo` |
| `services/web/tienda/clienteApi.js` | `restablecer` | `POST /api/auth/reestablecer-contrasena` |
| `services/web/tienda/clienteApi.js` | `verificar2fa` | `POST /api/auth/2fa/verify-login` |
| `services/web/tienda/clienteApi.js` | `perfil` | `GET /api/usuarios/perfil` |
| `services/web/tienda/clienteApi.js` | `actualizarPerfil` | `PUT /api/usuarios/perfil` |
| `services/web/tienda/clienteApi.js` | `subirFoto` | `PUT /api/usuarios/foto` |
| `services/web/tienda/clienteApi.js` | `catalogo` | `GET /api/libros` |
| `services/web/tienda/clienteApi.js` | `recomendados` | `GET /api/libros/recomendados` |
| `services/web/tienda/clienteApi.js` | `buscarInteligente` | `POST /api/libros/busqueda-inteligente` |
| `services/web/tienda/clienteApi.js` | `libro` | `GET /api/libros/:param` |
| `services/web/tienda/clienteApi.js` | `relacionados` | `GET /api/libros/:param/relacionados` |
| `services/web/tienda/clienteApi.js` | `autor` | `GET /api/autores/:param` |
| `services/web/tienda/clienteApi.js` | `favoritos` | `GET /api/favoritos` |
| `services/web/tienda/clienteApi.js` | `favorito` | `GET /api/favoritos/:param` |
| `services/web/tienda/clienteApi.js` | `agregarFavorito` | `POST /api/favoritos/:param` |
| `services/web/tienda/clienteApi.js` | `quitarFavorito` | `DELETE /api/favoritos/:param` |
| `services/web/tienda/clienteApi.js` | `zonas` | `GET /api/zonas-delivery` |
| `services/web/tienda/clienteApi.js` | `capacidades` | `GET /api/pagos/capacidades` |
| `services/web/tienda/clienteApi.js` | `crearOrden` | `POST /api/pagos/crear-orden` |
| `services/web/tienda/clienteApi.js` | `compras` | `GET /api/ventas/mis-ventas` |
| `services/web/tienda/clienteApi.js` | `compra` | `GET /api/ventas/:param` |
| `services/web/tienda/clienteApi.js` | `pagoCompra` | `GET /api/ventas/:param/pago` |
| `services/web/tienda/clienteApi.js` | `verificarPago` | `GET /api/pagos/:param` |

## Componentes compartidos (`components/`)

| Archivo | Usado por (nº de archivos) |
|---|---|

## Hooks y utilidades

## Framer Motion (`motion/react`) — 24 archivos

- `app/providers/ToastProvider.jsx`
- `components/panel/dashboard/Decoraciones.jsx`
- `components/panel/dashboard/DetalleTarjeta.jsx`
- `components/panel/dashboard/MejorRegistro.jsx`
- `components/panel/dashboard/Pastel3D.jsx`
- `components/panel/dashboard/SalesChart.jsx`
- `components/panel/dashboard/StatCard.jsx`
- `components/panel/dashboard/StatusDonut.jsx`
- `components/panel/dashboard/StockBajo.jsx`
- `components/panel/layout/AdminLayout.jsx`
- `components/panel/layout/PerfilAdministrador.jsx`
- `components/panel/layout/Sidebar.jsx`
- `components/panel/notificaciones/PanelNotificaciones.jsx`
- `components/panel/ui/Celebracion.jsx`
- `components/panel/ui/EmptyState.jsx`
- `components/panel/ui/Indicadores.jsx`
- `components/panel/ui/Modal.jsx`
- `components/web/PublicHeader.jsx`
- `components/web/PublicLayout.jsx`
- `components/web/tienda/PilaCarrito.jsx`
- `hooks/panel/dashboard/useContador.js`
- `views/panel/auth/LoginPage.jsx`
- `views/panel/auth/VerificarEmailPage.jsx`
- `views/panel/dashboard/DashboardPage.jsx`

## Módulo Dashboard (Resumen)

`DashboardPage.jsx` carga en paralelo `/api/reportes/{resumen, libros-mas-vendidos, ventas-por-estado, ventas-por-mes, ventas-por-dia, indicadores-ventas}`, `GET /api/inventario/stock-bajo` y `GET /api/libros`. Los complementarios pueden fallar sin bloquear el resumen. Componentes: `StatCard`/`MiniStat`, `MejorRegistro`, `SalesChart`, `TopBooks`, `StatusDonut`, `StockBajo`, `RecentBooks`; utilidades en `graficoUtils.js`. No muestra ni consulta reservas.
