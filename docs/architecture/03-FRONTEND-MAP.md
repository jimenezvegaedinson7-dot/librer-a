# Mapa del frontend (React 19 + Vite + Tailwind 4) — Panel y tienda web

> Generado desde el código real el 2026-11-10 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Arranque

`index.html` → `src/app/main.jsx` → `<ErrorBoundary>` → `app/router/AppRouter.jsx`:
`<ToastProvider>` → `<AuthProvider>` → `<RouterProvider>` (react-router ^7.18.3).

- **Cliente HTTP**: `panel/lib/api/client.js` (axios). `baseURL = VITE_API_URL`; los valores se configuran por entorno. El interceptor añade `Bearer <token>`, devuelve `response.data` y ante **401 de sesión** limpia la sesión y redirige a `/admin/login`. Los 401 de credencial incorrecta se distinguen con `erroresSesion.js`.
- **Sesión**: `app/providers/AuthProvider.jsx` mantiene el estado; `AuthContext.js` expone el contexto y `useAuth`. `panel/lib/storage/index.js` guarda `token` y `usuario` en localStorage. Solo entra `administrador`; perfil actualiza los datos de sesión desde la API.
- **Cliente web**: `web/tienda/TiendaProvider.jsx` y `clienteApi.js` mantienen sesión exclusiva de `cliente`, carrito por usuario/invitado e intento de compra persistente; `TiendaContext.js` expone `useTienda`. Nunca usan la sesión administrativa. `PublicLayout` los proporciona a cuenta, carrito, checkout, compras y detalle del libro.
- **Guards**: `app/router/RutaProtegida.jsx` redirige a `/admin/login` sin sesión administrativa; `RutaPorRol.jsx` exige los roles configurados. Un **403** muestra rechazo de permisos.
- **Layout**: `panel/layout/AdminLayout.jsx` (Sidebar, Topbar, Breadcrumbs, transición con Framer Motion, tema claro fijo).
- **Altas de catálogo**: Libros, Autores y Categorías muestran botones normales en la cabecera de sus filtros. `AltaFlotante` monta el formulario únicamente al pulsarlos y lo presenta en un `Modal` mediante portal dentro del layout administrativo. Cancelar desmonta el borrador; el éxito cierra el diálogo y refresca el listado; un error conserva los campos. `Modal` contiene el foco del diálogo superior y mantiene el bloqueo de scroll al abrir descuentos sobre el alta de libros.
- **Descuento en el alta de libros**: el botón `Agregar descuento` abre el editor opcional. Si se intenta guardar sin una oferta ni una elección previa, el formulario validado pregunta si se desea agregar un descuento o registrar con el precio normal. Solo `Registrar sin descuento` confirma ese envío; configurar una oferta vuelve al formulario para guardarla junto al libro. Edición conserva el mismo editor de descuentos y los endpoints existentes.
- **Aviso de portada en altas**: tras validar los datos, `LibroForm` avisa si no se seleccionó un archivo de portada. Permite abrir el selector o continuar explícitamente sin subir imagen; no envía el registro antes de esa decisión. Quitar la imagen vuelve a habilitar el aviso. Las referencias de portada por ISBN y el contrato de subida existente permanecen en su capa correspondiente.
- **Tablas del panel**: `panel/estilos/tablas-formales.css` se carga después de los estilos existentes y se aplica a `main[data-tablas-formales="true"]` o a un bloque explícito `.tabla-panel`. El Dashboard declara false; su cuadro Últimos libros agregados usa `.tabla-panel`, `CardHeader` y `DataTable` para compartir encabezados, colores y filas con los listados. `CardHeader` separa `filtros` de `acciones` en una rejilla etiquetada. `DataTable` admite clases por columna, nombre accesible, desplazamiento con teclado y aviso de desbordamiento. `FechaTabla` presenta fecha y hora en líneas separadas. Pedidos combina canal y tipo de entrega para el ámbito de sus indicadores; el estado solo filtra la lista.
- **Revisión de secciones**: la pantalla y el servicio React de Historial se retiraron; `/historial` redirige al Dashboard. Empresa abre en consulta y solo muestra el formulario al pulsar Editar datos. Stock reutiliza `AltaFlotante` para registrar inventario bajo demanda. `ErrorCarga` ofrece recuperación explícita y los indicadores de listas fallidas muestran No disponible. Las consultas de clientes descartan respuestas antiguas y los estados vacíos diferencian búsquedas sin coincidencias de listas sin registros.
- **Tema**: El layout actual declara `data-theme="light"`; `/personalizacion` redirige a `/dashboard`. `src/app/index.css` carga `panel/estilos/paleta-editorial.css`, `panel/estilos/theme.css`, `panel/estilos/panel-editorial.css` y `panel/estilos/panel-formal.css`. La tienda usa su propio tema en `web/estilos/tema-editorial.css`. Los iconos de navegación y búsqueda se centralizan en `panel/layout/navConfig.js`.
- **Despliegue**: Vercel (`frontend/vercel.json` reescribe todo a `index.html`).
- **Estructura**: `frontend/src` tiene cuatro capas. `app/` es el arranque (main, index.css, ErrorBoundary, router con las guardas y los providers). `panel/` es la superficie administrativa, con un dominio por carpeta, sus servicios, `componentes/`, `ui/`, `lib/` y `estilos/`. `web/` es la superficie pública: `PublicLayout.jsx`, `paginas/`, `secciones/`, `componentes/`, `tienda/`, `asistente/`, `animacion/`, `hooks/`, `config/`, `lib/`, `estilos/` y `assets/`. `compartido/` guarda lo que usan ambas superficies: `ui/`, `lib/utils/`, `config/env.js` y `assets/`. Las dependencias van en un solo sentido: app → panel | web → compartido. El detalle está en `docs/architecture/04-ARQUITECTURA-FRONTEND.md`.

## Portada ligera y carga por rutas

- El inicio monta `web/secciones/PortadaDiferida.jsx`: centraliza protagonista, recientes y respaldo del catálogo y entrega esos datos a una única `PortadaEspacial.jsx`. Identidad, título, precio, acceso y foco conservan el mismo DOM durante la preparación. `LibroInicial.jsx` proyecta la cubierta con CSS y comparte cámara, pose y escala con `escenaLibro.js` mediante `poseLibro.js`; al estar listo el primer cuadro, solo el libro CSS y el canvas se funden durante 180ms. La carga del motor espera datos utilizables y tiempo libre del navegador, salvo ahorro de datos, conexión 2G, movimiento reducido o falta de WebGL. El respaldo mantiene la composición estática. `main.jsx` no precarga el motor 3D.
- `web/hooks/useLibroProtagonista.js` consulta el protagonista sin JWT, revalida al volver al foco y respeta libro nulo. El respaldo 404 funciona aunque el catálogo llegue después.
- Aplicación, Características, Nosotros y Descargar tienen módulos de página separados. `AdminLayout` y el formulario público de reclamaciones se cargan bajo demanda; la tienda y el login no descargan el layout administrativo.
- `web/estilos/limpia.css` retira vidrio, destellos, facetas y sombras de espejo. El acceso administrativo conserva el libro CSS y su apertura breve, con páginas sólidas y recuperación en la siguiente hoja.
- `PublicLayout` usa scroll nativo y foco accesible al navegar; no inicia el motor global GSAP ni precarga masivamente todas las portadas.
- Catálogo, recomendados, ofertas, asistente y favoritos habilitan el enlace real de detalle en `ComprarLibro`, sin sustituir la acción de agregar al carrito ni sus estilos compartidos. `config/site.js` declara los metadatos de Favoritos y Reclamaciones; `ReclamacionesPublicasPage` aplica y restaura título, descripción y URL canónica al ser una ruta pública fuera de `PublicLayout`.
- `secciones/OfertasDestacadas.jsx` organiza ofertas en tarjetas verticales con estilos propios en `ofertas-destacadas.css`: cuatro columnas de carrusel en escritorio, tres en tabletas y dos en teléfonos. Portada y título enlazan a `/libro/:id`. `ComprarLibro` habilita `enlaceDetalle` para agrupar el carrito y un enlace real a la ficha. Los botones heredan tamaño adaptable, forma de píldora, colores y texto de las reglas compartidas de las demás tarjetas; el detalle se mantiene próximo y se apila en tarjetas estrechas. Las demás superficies conservan su modo de detalle existente.

## Portada espacial bajo demanda

- `secciones/portada3d/PortadaEspacial.jsx` se importa directamente desde `PortadaDiferida.jsx` para pintar su composición ligera desde el inicio. GSAP/ScrollTrigger y `escenaLibro.js` se descargan bajo demanda; si el equipo no admite el efecto se conserva el libro CSS, los datos y la navegación. `asistente/IconoIA.jsx` dibuja el avatar de libro en SVG, sin importar videos ni poster anime.
- Dirección confirmada por el usuario: **Portal editorial**, tras revisar su video local. `portalEditorial.js` calcula una atmósfera volumétrica acotada con ruido 3D y una cinta analítica de luz sobre papel; la disolución se realiza por material. `cinematografia.js` centraliza los tramos reversibles y `amortiguarProgreso`, único suavizado del scroll independiente de la frecuencia de cuadros. El modelo añade tapas biseladas, lomo con datos reales e iluminación de estudio direccional y hemisférica. La cara frontal permanece visible durante la ficha.
- La superficie autoaloja Source Serif 4 (WOFF2 latino de 23.832 bytes, licencia OFL) para títulos; conserva Work Sans en datos y controles. El usuario eligió **Ibero** como referencia principal de navbar/footer y retiró la franja superior de delivery/recojo/PayU. `components/public-header.css` aplica cabecera gris frío #F5F7F9, buscador blanco, menú blanco con texto marino #24304B y detalles turquesa; marca en Work Sans e iconos Lucide de contorno. Los botones de escena son blancos/marino; el catálogo conserva sus controles de compra. El texto principal se recorta contra el contorno proyectado del libro.
- La portada mide cabecera, navegación y barra móvil mediante ResizeObserver para ajustar su composición. La navegación pública permanece disponible tanto en la escena 3D como en su respaldo estático; las rutas interiores conservan scroll nativo y foco accesible.
- `components/PublicFooter.jsx` y `public-footer.css` usan fondo blanco, títulos marinos y cuatro columnas de identidad/dirección real, navegación, cuenta y atención. Pagos PayU y tarjetas existentes van en una fila independiente; reclamaciones y acceso administrativo siguen disponibles. Móvil usa dos columnas y espacio para barra/asistente. No hay ticker superior ni formulario de suscripción inventado. Buscador, cuenta, carrito y cajón móvil conservan sus funciones.
- Presupuesto gráfico: render target volumétrico reducido, menor detalle en móvil/renderizado por software, resolución adaptativa y pausa según visibilidad del escenario y de la pestaña. No se genera un entorno PMREM al iniciar. `EscenaLibro.preparar()` espera la textura y usa `compileAsync` para preparar los shaders antes del fundido; la pose se mantiene durante la entrega CSS → canvas. Con aceleración gráfica se sigue requestAnimationFrame; el modo por software conserva 30 cuadros/s sin saltar intervalos por redondeo. La encuadernación cerrada se calcula una vez y sus hojas interiores no se dibujan; la oclusión del título usa medidas cacheadas. Las novedades cargan sus imágenes antes de aparecer y se desactivan mientras están ocultas. `test-unit/portada-cinematica.test.js` comprueba fases, reversibilidad y continuidad a 30/60/120 cuadros/s; Playwright también detecta errores de compilación GLSL.
- `GET /api/anuncios/protagonista` es público y responde sin caché. El componente usa fetch sin JWT, tiempo límite de 12 s y reintento; revalida al volver al foco/pestaña y cada 60 s mientras está visible. Una respuesta idéntica no reinicia la escena.
- `backend/src/models/portada.model.js` prioriza el libro manual activo, con título, precio positivo y portada válida; si deja de ser elegible, resuelve el más reciente por `creado_en DESC NULLS LAST, id_libro DESC`. Sin candidato devuelve ninguno, sin inventar datos.
- Configuración en `portada_config`, creada por `044_portada_protagonista.sql` sin modificar libros ni ventas. `GET /api/anuncios/protagonista/panel` y `PUT /api/anuncios/protagonista` exigen JWT administrador; `panel/anuncios/ProtagonistaPanel.jsx` y `protagonistaService.js` gestionan modo manual/automático, búsqueda, vista previa y guardado. La respuesta del panel incluye `libro_automatico` para previsualizar el cambio de modo antes de guardarlo.
- Por petición del usuario, el protagonista permanece cerrado durante todo el scroll: `escenaLibro.js` fija la encuadernación a apertura cero, sin mover tapa/hojas ni comprimir el bloque. Se conservan los recorridos de cámara, giro del volumen, cintas, luces, partículas y disolución.
- La portada no crea AudioContext ni muestra controles de sonido. Las regresiones de `portada-espacial.spec.js` comprueban ausencia de audio y encuadernación cerrada en avance y retroceso a 390/1440px.
- Movimiento reducido, ahorro de datos, pantalla baja, ausencia/pérdida de WebGL 2, error de textura o fallo de carga del motor llevan a una portada estática con el mismo libro. Se liberan geometrías, texturas, RAF, observadores, listeners, audio y ScrollTriggers. Móvil/equipos modestos reducen partículas, resolución y frecuencia de dibujo.
- Hasta cinco libros recientes proceden del catálogo normalizado (`libroComercial.creadoEn`). En escritorio se despliegan desde el centro hacia una cuadrícula de cinco columnas: solo las tapas se inclinan y títulos, autores y precios permanecen rectos en columnas independientes. En móvil ≤900px se usa un carrusel horizontal nativo. El recorrido del hero es 250svh en escritorio y 225svh en móvil; novedades continúa con espaciado compacto. El antiguo carrusel de banners y su configuración sin consumidores se retiraron del frontend; Anuncios conserva la gestión de videos y del libro protagonista.
- Regresiones: `test-browser/portada-espacial.spec.js`, `protagonista-panel.spec.js`, `web-ligera.spec.js`, `backend/test/portada-protagonista.test.js` y `backend/test-integration/portada-protagonista.smoke.test.js`.

## Analítica y recomendaciones según compras

- `web/lib/analitica.js` integra GA4 con etiqueta asíncrona y configuración opcional por `VITE_GA4_ID`; `VITE_GA4_DEBUG` habilita DebugView. Sin ID válido no carga la etiqueta. Desactiva Signals y personalización publicitaria; respeta Global Privacy Control.
- `PublicLayout` registra navegación, `LibroPage` fichas y `CheckoutPage` inicio del checkout. `TiendaProvider` mide agregados realmente guardados y compras web pagadas que corresponden al intento local. Deduplica la venta, usa sus precios históricos y separa el envío. El historial antiguo no se registra como nuevas compras. Las URL de eventos excluyen query/hash y no se exportan objetos de cliente o sesión.
- `RecomendacionesCompra.jsx` aparece después de la primera compra en Mis compras y consulta `GET /api/libros/recomendados` con JWT cliente. El modelo utiliza exclusivamente compras pagadas/entregadas de la cuenta: afinidad de autor y categoría, hasta ocho libros activos con stock y sin repetir títulos ya comprados. No requiere nuevas tablas ni servicio externo de recomendaciones.
- Los motivos, errores recuperables y estado vacío se muestran con los componentes comerciales existentes. La lista mide impresiones al entrar en pantalla y selección de una sugerencia. Configuración y alcance: `frontend/ANALITICA.md`.

| Integración detectada | Transporte | Archivo | Variables de configuración |
|---|---|---|---|
| Google Analytics 4 | gtag.js | `web/lib/analitica.js` | `VITE_GA4_DEBUG`, `VITE_GA4_ID` |

## Caché y prioridad de carga pública

- `public/cache-recursos-sw.js`, registrado desde `PublicLayout` mediante `web/lib/cacheRecursos.js`, guarda hasta 200 imágenes, fuentes y archivos JS/CSS de producción con hash en CacheStorage. Sirve los recursos guardados inmediatamente y revalida los que superan 24 horas. No intercepta HTML, JSON, sesiones ni operaciones; respeta respuestas privadas/no-store y no guarda errores ni HTML devuelto como imagen. La escritura de caché no bloquea la primera imagen.
- `web/lib/cachePublica.js` conserva durante 15 minutos datos públicos de catálogo, fichas, autores, empresa y anuncios (hasta 40 entradas y 2 MiB). Los hooks y `LibroPage` pueden mostrarlos durante la consulta de red; las respuestas actualizadas prevalecen y los 404/410 invalidan fichas guardadas. `clienteApi` sigue consultando la red; checkout y pagos no leen esta caché.
- `index.html` no contiene ni activa una pantalla de precarga: el contenido no espera fuentes, imágenes ni canvas. Las fuentes de Google del panel se piden únicamente desde `usePaginaPanel`. La web pública conserva fuentes locales con swap.
- El libro destacado usa imagen eager de hasta 480px y las novedades usan imágenes lazy de hasta 320px. `ImagenCarga.jsx` solo asigna src/srcSet a imágenes lazy cuando IntersectionObserver las aproxima a 300px del viewport; las imágenes prioritarias siguen disponibles desde el primer render. Se retiró la precarga de todo el catálogo a dos tamaños. `cachePortada.js` conserva protagonista y recientes con sus datos públicos; una respuesta válida con libro nulo se respeta. Pruebas vigentes: `web-ligera.spec.js`, `portada-carga.spec.js`, `cache-publica.spec.js`, `compra-web.spec.js` y navegación/responsive públicos.

## Rutas

El menú reúne **Gestión de ventas** en `/ventas` con tres vistas cargadas bajo demanda: Ventas y pagos (índice), Pedidos (`/ventas/pedidos`) y Comprobantes (`/ventas/comprobantes`). Las direcciones anteriores `/pagos`, `/pedidos` y `/comprobantes` redirigen conservando query y hash. La lista comercial usa los campos PayU de `GET /api/ventas`; las notificaciones abren su detalle mediante `?ver=referencia`. Los comprobantes vinculados usan `?venta=id` y el filtro exacto `GET /api/comprobantes?id_venta=id`, validado y confirmado por la API.

| Ruta | Componente | Archivo |
|---|---|---|
| `/` | InicioPage | `web/paginas/paginas.jsx` |
| `/catalogo` | CatalogoPublicoPage | `web/paginas/CatalogoPage.jsx` |
| `/aplicacion` | AplicacionPage | `web/paginas/AplicacionPage.jsx` |
| `/caracteristicas` | CaracteristicasPage | `web/paginas/CaracteristicasPage.jsx` |
| `/nosotros` | NosotrosPage | `web/paginas/NosotrosPage.jsx` |
| `/descargar` | DescargarPage | `web/paginas/DescargarPage.jsx` |
| `/cuenta` | CuentaClientePage | `web/tienda/CuentaPage.jsx` |
| `/carrito` | CarritoWebPage | `web/tienda/CarritoPage.jsx` |
| `/checkout` | CheckoutWebPage | `web/tienda/CheckoutPage.jsx` |
| `/mis-compras` | MisComprasWebPage | `web/tienda/MisComprasPage.jsx` |
| `/favoritos` | FavoritosWebPage | `web/tienda/FavoritosPage.jsx` |
| `/libro/:id` | LibroPublicoPage | `web/tienda/LibroPage.jsx` |
| `/admin/login` | LoginPage | `panel/auth/LoginPage.jsx` |
| `/admin` | Navigate | redirección: `<Navigate to="/admin/login" replace />` |
| `/verificar-email` | VerificarEmailPage | `panel/auth/VerificarEmailPage.jsx` |
| `/libro-de-reclamaciones` | LibroReclamacionesPage | `web/paginas/ReclamacionesPublicasPage.jsx` |
| `/dashboard` | DashboardPage | `panel/dashboard/DashboardPage.jsx` |
| `/libros` | LibrosAutoresPage | `panel/libros/LibrosAutoresPage.jsx` |
| `/autores` | Navigate | redirección: `para(SOLO_ADMIN, <Navigate to="/libros?vista=autores" replace />)` |
| `/categorias` | CategoriasPage | `panel/categorias/CategoriasPage.jsx` |
| `/inventario` | InventarioPage | `panel/inventario/InventarioPage.jsx` |
| `/reservas` | Navigate | redirección: `<Navigate to="/dashboard" replace />` |
| `/ventas` | GestionVentasPage | `panel/ventas/GestionVentasPage.jsx` |
| `/ventas` | VentasPage | `panel/ventas/VentasPage.jsx` |
| `/ventas/pedidos` | PedidosPage | `panel/pedidos/PedidosPage.jsx` |
| `/ventas/comprobantes` | ComprobantesPage | `panel/comprobantes/ComprobantesPage.jsx` |
| `/pedidos` | RedirigirOperacion | — |
| `/comprobantes` | RedirigirOperacion | — |
| `/pagos` | RedirigirOperacion | — |
| `/usuarios` | UsuariosPage | `panel/usuarios/UsuariosClientesPage.jsx` |
| `/clientes` | Navigate | redirección: `para(SOLO_ADMIN, <Navigate to="/usuarios?vista=clientes" replace />)` |
| `/reclamaciones` | ReclamacionesPage | `panel/reclamaciones/ReclamacionesPage.jsx` |
| `/anuncios` | AnunciosPage | `panel/anuncios/AnunciosPage.jsx` |
| `/tarifas-envio` | TarifasEnvioPage | `panel/tarifas/TarifasEnvioPage.jsx` |
| `/historial` | Navigate | redirección: `para(SOLO_ADMIN, <Navigate to="/dashboard" replace />)` |
| `/configuracion/empresa` | EmpresaPage | `panel/configuracion/EmpresaPage.jsx` |
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
| `panel/anuncios/AnunciosPage.jsx` | `DELETE /api/anuncios/:param`<br>`GET /api/anuncios/todos`<br>`POST /api/anuncios`<br>`PUT /api/anuncios/:param` |
| `panel/anuncios/ProtagonistaPanel.jsx` | `GET /api/anuncios/protagonista/panel`<br>`GET /api/libros`<br>`PUT /api/anuncios/protagonista` |
| `panel/auth/LoginPage.jsx` | `POST /api/auth/2fa/verify-login`<br>`POST /api/auth/login`<br>`POST /api/auth/reestablecer-contrasena`<br>`POST /api/auth/solicitar-reseteo` |
| `panel/auth/VerificarEmailPage.jsx` | `POST /api/auth/reenviar-codigo`<br>`POST /api/auth/verificar-email` |
| `panel/autores/AutorEditModal.jsx` | `PUT /api/autores/:param` |
| `panel/autores/AutorForm.jsx` | `POST /api/autores` |
| `panel/autores/AutoresPage.jsx` | `DELETE /api/autores/:param`<br>`GET /api/autores`<br>`GET /api/autores/:param` |
| `panel/categorias/CategoriaEditModal.jsx` | `PUT /api/categorias/:param` |
| `panel/categorias/CategoriaForm.jsx` | `POST /api/categorias` |
| `panel/categorias/CategoriasPage.jsx` | `DELETE /api/categorias/:param`<br>`GET /api/categorias`<br>`GET /api/categorias/:param` |
| `panel/clientes/ClientesPage.jsx` | `GET /api/clientes` |
| `panel/comprobantes/AnularComprobanteModal.jsx` | `POST /api/comprobantes/:param/anular` |
| `panel/comprobantes/ComprobanteViewModal.jsx` | `GET /api/comprobantes/:param`<br>`GET /api/empresa` |
| `panel/comprobantes/ComprobantesPage.jsx` | `GET /api/comprobantes`<br>`GET /api/comprobantes/resumen`<br>`POST /api/comprobantes/:param/enviar-email` |
| `panel/configuracion/EmpresaPage.jsx` | `GET /api/empresa`<br>`PUT /api/empresa` |
| `panel/dashboard/DashboardPage.jsx` | `GET /api/inventario/stock-bajo`<br>`GET /api/libros`<br>`GET /api/reportes/indicadores-ventas`<br>`GET /api/reportes/libros-mas-vendidos`<br>`GET /api/reportes/resumen`<br>`GET /api/reportes/ventas-por-dia`<br>`GET /api/reportes/ventas-por-estado`<br>`GET /api/reportes/ventas-por-mes` |
| `panel/dashboard/dashboardService.js` | `GET /api/inventario/stock-bajo`<br>`GET /api/libros`<br>`GET /api/reportes/indicadores-ventas`<br>`GET /api/reportes/libros-mas-vendidos`<br>`GET /api/reportes/resumen`<br>`GET /api/reportes/ventas-por-dia`<br>`GET /api/reportes/ventas-por-estado`<br>`GET /api/reportes/ventas-por-mes` |
| `panel/inventario/InventarioEditModal.jsx` | `PUT /api/inventario/libro/:param` |
| `panel/inventario/InventarioForm.jsx` | `POST /api/inventario` |
| `panel/inventario/InventarioPage.jsx` | `GET /api/inventario`<br>`GET /api/inventario/libro/:param` |
| `panel/inventario/MovimientosModal.jsx` | `GET /api/inventario/movimientos`<br>`GET /api/libros` |
| `panel/inventario/useLibros.js` | `GET /api/libros` |
| `panel/layout/PerfilAdministrador.jsx` | `GET /api/usuarios/perfil`<br>`POST /api/auth/2fa/confirm`<br>`POST /api/auth/2fa/disable`<br>`POST /api/auth/2fa/setup`<br>`PUT /api/usuarios/foto`<br>`PUT /api/usuarios/password`<br>`PUT /api/usuarios/perfil` |
| `panel/libros/LibroEditModal.jsx` | `GET /api/autores`<br>`GET /api/categorias`<br>`GET /api/libros/:param`<br>`PUT /api/libros/:param` |
| `panel/libros/LibroForm.jsx` | `GET /api/libros/:param`<br>`POST /api/libros` |
| `panel/libros/LibrosPage.jsx` | `DELETE /api/libros/:param`<br>`GET /api/inventario`<br>`GET /api/libros`<br>`GET /api/libros/:param` |
| `panel/libros/useCatalogo.js` | `GET /api/autores`<br>`GET /api/categorias` |
| `panel/notificaciones/notificacionesService.js` | `GET /api/inventario/stock-bajo`<br>`GET /api/pagos` |
| `panel/pedidos/PedidosPage.jsx` | `GET /api/pedidos`<br>`GET /api/pedidos/:param`<br>`PUT /api/pedidos/:param/estado` |
| `panel/reclamaciones/LibroReclamacionesPage.jsx` | `GET /api/empresa`<br>`POST /api/reclamaciones` |
| `panel/reclamaciones/ReclamacionesPage.jsx` | `GET /api/reclamaciones`<br>`GET /api/reclamaciones/resumen`<br>`PUT /api/reclamaciones/:param/respuesta` |
| `panel/tarifas/TarifasEnvioPage.jsx` | `GET /api/zonas-delivery/todos`<br>`PUT /api/zonas-delivery/:param` |
| `panel/usuarios/UsuariosPage.jsx` | `GET /api/usuarios`<br>`PATCH /api/usuarios/:param` |
| `panel/ventas/EmitirComprobanteModal.jsx` | `GET /api/empresa`<br>`POST /api/comprobantes/:param/enviar-email`<br>`POST /api/ventas/:param/comprobante` |
| `panel/ventas/ReembolsoModal.jsx` | `POST /api/ventas/:param/reembolso` |
| `panel/ventas/VentasPage.jsx` | `GET /api/ventas`<br>`GET /api/ventas/:param` |
| `web/PublicLayout.jsx` | `GET /api/empresa`<br>`GET /api/libros` |
| `web/asistente/AsistenteTienda.jsx` | `GET /api/libros`<br>`POST /api/asistente` |
| `web/asistente/useMemoriaAsistente.js` | `DELETE /api/asistente/memoria`<br>`GET /api/asistente/memoria`<br>`PUT /api/asistente/memoria` |
| `web/componentes/ActualizarApp.jsx` | `GET /api/app/version` |
| `web/hooks/useLibroProtagonista.js` | `GET /api/anuncios/protagonista` |
| `web/secciones/VideoSection.jsx` | `GET /api/anuncios` |
| `web/tienda/AccionesLibro.jsx` | `DELETE /api/favoritos/:param`<br>`GET /api/favoritos/:param`<br>`POST /api/favoritos/:param` |
| `web/tienda/CheckoutPage.jsx` | `GET /api/pagos/capacidades`<br>`GET /api/ventas/:param`<br>`GET /api/zonas-delivery` |
| `web/tienda/CuentaPage.jsx` | `POST /api/auth/2fa/verify-login`<br>`POST /api/auth/login`<br>`POST /api/auth/reenviar-codigo`<br>`POST /api/auth/reestablecer-contrasena`<br>`POST /api/auth/registro`<br>`POST /api/auth/solicitar-reseteo`<br>`POST /api/auth/verificar-email`<br>`POST /api/auth/verificar-reseteo` |
| `web/tienda/FavoritosPage.jsx` | `DELETE /api/favoritos/:param`<br>`GET /api/favoritos` |
| `web/tienda/LibroPage.jsx` | `GET /api/autores/:param`<br>`GET /api/libros/:param`<br>`GET /api/libros/:param/relacionados` |
| `web/tienda/MisComprasPage.jsx` | `GET /api/pagos/:param`<br>`GET /api/ventas/:param/pago`<br>`GET /api/ventas/mis-ventas` |
| `web/tienda/PerfilCliente.jsx` | `PUT /api/usuarios/foto`<br>`PUT /api/usuarios/perfil` |
| `web/tienda/RecomendacionesCompra.jsx` | `GET /api/libros/recomendados` |
| `web/tienda/TiendaProvider.jsx` | `GET /api/libros`<br>`GET /api/usuarios/perfil`<br>`GET /api/ventas/:param` |
| `web/tienda/persistenciaCompra.js` | `POST /api/pagos/crear-orden` |
| `web/tienda/useDatosCliente.js` | `GET /api/ventas/mis-ventas` |

## Servicios (`panel/*/*Service.js`)

| Servicio | Función | Endpoint |
|---|---|---|
| `panel/anuncios/anunciosService.js` | `listarAnuncios` | `GET /api/anuncios/todos` |
| `panel/anuncios/anunciosService.js` | `crearAnuncio` | `POST /api/anuncios` |
| `panel/anuncios/anunciosService.js` | `actualizarAnuncio` | `PUT /api/anuncios/:param` |
| `panel/anuncios/anunciosService.js` | `eliminarAnuncio` | `DELETE /api/anuncios/:param` |
| `panel/anuncios/protagonistaService.js` | `obtenerProtagonista` | `GET /api/anuncios/protagonista/panel` |
| `panel/anuncios/protagonistaService.js` | `guardarProtagonista` | `PUT /api/anuncios/protagonista` |
| `panel/auth/authService.js` | `login` | `POST /api/auth/login` |
| `panel/auth/authService.js` | `verificarEmail` | `POST /api/auth/verificar-email` |
| `panel/auth/authService.js` | `reenviarCodigo` | `POST /api/auth/reenviar-codigo` |
| `panel/auth/authService.js` | `verificarLoginOtp` | `POST /api/auth/2fa/verify-login` |
| `panel/auth/authService.js` | `setup2fa` | `POST /api/auth/2fa/setup` |
| `panel/auth/authService.js` | `confirmar2fa` | `POST /api/auth/2fa/confirm` |
| `panel/auth/authService.js` | `desactivar2fa` | `POST /api/auth/2fa/disable` |
| `panel/auth/authService.js` | `solicitarReseteo` | `POST /api/auth/solicitar-reseteo` |
| `panel/auth/authService.js` | `restablecerContrasena` | `POST /api/auth/reestablecer-contrasena` |
| `panel/auth/perfilService.js` | `obtenerPerfil` | `GET /api/usuarios/perfil` |
| `panel/auth/perfilService.js` | `actualizarPerfil` | `PUT /api/usuarios/perfil` |
| `panel/auth/perfilService.js` | `actualizarFoto` | `PUT /api/usuarios/foto` |
| `panel/auth/perfilService.js` | `cambiarPassword` | `PUT /api/usuarios/password` |
| `panel/autores/autoresService.js` | `listarAutores` | `GET /api/autores` |
| `panel/autores/autoresService.js` | `obtenerAutor` | `GET /api/autores/:param` |
| `panel/autores/autoresService.js` | `crearAutor` | `POST /api/autores` |
| `panel/autores/autoresService.js` | `actualizarAutor` | `PUT /api/autores/:param` |
| `panel/autores/autoresService.js` | `eliminarAutor` | `DELETE /api/autores/:param` |
| `panel/categorias/categoriasService.js` | `listarCategorias` | `GET /api/categorias` |
| `panel/categorias/categoriasService.js` | `obtenerCategoria` | `GET /api/categorias/:param` |
| `panel/categorias/categoriasService.js` | `crearCategoria` | `POST /api/categorias` |
| `panel/categorias/categoriasService.js` | `actualizarCategoria` | `PUT /api/categorias/:param` |
| `panel/categorias/categoriasService.js` | `eliminarCategoria` | `DELETE /api/categorias/:param` |
| `panel/clientes/clientesService.js` | `listarClientes` | `GET /api/clientes` |
| `panel/comprobantes/comprobantesService.js` | `listarComprobantes` | `GET /api/comprobantes` |
| `panel/comprobantes/comprobantesService.js` | `obtenerComprobante` | `GET /api/comprobantes/:param` |
| `panel/comprobantes/comprobantesService.js` | `emitirComprobante` | `POST /api/ventas/:param/comprobante` |
| `panel/comprobantes/comprobantesService.js` | `enviarComprobanteEmail` | `POST /api/comprobantes/:param/enviar-email` |
| `panel/comprobantes/comprobantesService.js` | `obtenerResumen` | `GET /api/comprobantes/resumen` |
| `panel/comprobantes/comprobantesService.js` | `anularComprobante` | `POST /api/comprobantes/:param/anular` |
| `panel/configuracion/empresaService.js` | `obtenerEmpresa` | `GET /api/empresa` |
| `panel/configuracion/empresaService.js` | `actualizarEmpresa` | `PUT /api/empresa` |
| `panel/dashboard/dashboardService.js` | `obtenerLibros` | `GET /api/libros` (vía panel/libros/librosService.js#listarLibros) |
| `panel/dashboard/dashboardService.js` | `obtenerResumen` | `GET /api/reportes/resumen` (vía panel/reportes/reportesService.js#obtenerResumen) |
| `panel/dashboard/dashboardService.js` | `obtenerLibrosMasVendidos` | `GET /api/reportes/libros-mas-vendidos` (vía panel/reportes/reportesService.js#obtenerLibrosMasVendidos) |
| `panel/dashboard/dashboardService.js` | `obtenerVentasPorEstado` | `GET /api/reportes/ventas-por-estado` (vía panel/reportes/reportesService.js#obtenerVentasPorEstado) |
| `panel/dashboard/dashboardService.js` | `obtenerVentasPorMes` | `GET /api/reportes/ventas-por-mes` (vía panel/reportes/reportesService.js#obtenerVentasPorMes) |
| `panel/dashboard/dashboardService.js` | `obtenerVentasPorDia` | `GET /api/reportes/ventas-por-dia` (vía panel/reportes/reportesService.js#obtenerVentasPorDia) |
| `panel/dashboard/dashboardService.js` | `obtenerIndicadoresVentas` | `GET /api/reportes/indicadores-ventas` (vía panel/reportes/reportesService.js#obtenerIndicadoresVentas) |
| `panel/dashboard/dashboardService.js` | `obtenerStockBajo` | `GET /api/inventario/stock-bajo` (vía panel/reportes/reportesService.js#obtenerStockBajo) |
| `panel/inventario/inventarioService.js` | `listarInventario` | `GET /api/inventario` |
| `panel/inventario/inventarioService.js` | `obtenerInventarioLibro` | `GET /api/inventario/libro/:param` |
| `panel/inventario/inventarioService.js` | `crearInventario` | `POST /api/inventario` |
| `panel/inventario/inventarioService.js` | `actualizarInventario` | `PUT /api/inventario/libro/:param` |
| `panel/inventario/inventarioService.js` | `listarMovimientos` | `GET /api/inventario/movimientos` |
| `panel/inventario/inventarioService.js` | `listarLibros` | `GET /api/libros` (vía panel/libros/librosService.js#listarLibros) |
| `panel/libros/librosService.js` | `listarLibros` | `GET /api/libros` |
| `panel/libros/librosService.js` | `obtenerLibro` | `GET /api/libros/:param` |
| `panel/libros/librosService.js` | `crearLibro` | `POST /api/libros`<br>`GET /api/libros/:param` (vía panel/libros/librosService.js#obtenerLibro) |
| `panel/libros/librosService.js` | `actualizarLibro` | `PUT /api/libros/:param`<br>`GET /api/libros/:param` (vía panel/libros/librosService.js#obtenerLibro)<br>`GET /api/libros/:param` (vía panel/libros/librosService.js#obtenerLibro) |
| `panel/libros/librosService.js` | `eliminarLibro` | `DELETE /api/libros/:param` |
| `panel/libros/librosService.js` | `listarAutores` | `GET /api/autores` |
| `panel/libros/librosService.js` | `listarCategorias` | `GET /api/categorias` |
| `panel/pagos/pagosService.js` | `listarPagos` | `GET /api/pagos` |
| `panel/pedidos/pedidosService.js` | `listarPedidos` | `GET /api/pedidos` |
| `panel/pedidos/pedidosService.js` | `obtenerPedido` | `GET /api/pedidos/:param` |
| `panel/pedidos/pedidosService.js` | `cambiarEstadoPedido` | `PUT /api/pedidos/:param/estado` |
| `panel/reclamaciones/reclamacionesService.js` | `registrarReclamacion` | `POST /api/reclamaciones` |
| `panel/reclamaciones/reclamacionesService.js` | `listarReclamaciones` | `GET /api/reclamaciones` |
| `panel/reclamaciones/reclamacionesService.js` | `obtenerResumenReclamaciones` | `GET /api/reclamaciones/resumen` |
| `panel/reclamaciones/reclamacionesService.js` | `responderReclamacion` | `PUT /api/reclamaciones/:param/respuesta` |
| `panel/reclamaciones/reclamacionesService.js` | `obtenerEmpresaPublica` | `GET /api/empresa` |
| `panel/reportes/reportesService.js` | `obtenerResumen` | `GET /api/reportes/resumen` |
| `panel/reportes/reportesService.js` | `obtenerLibrosMasVendidos` | `GET /api/reportes/libros-mas-vendidos` |
| `panel/reportes/reportesService.js` | `obtenerVentasPorEstado` | `GET /api/reportes/ventas-por-estado` |
| `panel/reportes/reportesService.js` | `obtenerStockBajo` | `GET /api/inventario/stock-bajo` |
| `panel/reportes/reportesService.js` | `obtenerVentasPorMes` | `GET /api/reportes/ventas-por-mes` |
| `panel/reportes/reportesService.js` | `obtenerVentasPorDia` | `GET /api/reportes/ventas-por-dia` |
| `panel/reportes/reportesService.js` | `obtenerIndicadoresVentas` | `GET /api/reportes/indicadores-ventas` |
| `panel/tarifas/tarifasService.js` | `listarZonasDelivery` | `GET /api/zonas-delivery/todos` |
| `panel/tarifas/tarifasService.js` | `actualizarTarifaDelivery` | `PUT /api/zonas-delivery/:param` |
| `panel/usuarios/usuariosService.js` | `listarUsuarios` | `GET /api/usuarios` |
| `panel/usuarios/usuariosService.js` | `actualizarUsuario` | `PATCH /api/usuarios/:param` |
| `panel/ventas/ventasService.js` | `listarVentas` | `GET /api/ventas` |
| `panel/ventas/ventasService.js` | `obtenerVenta` | `GET /api/ventas/:param` |
| `panel/ventas/ventasService.js` | `reembolsarVenta` | `POST /api/ventas/:param/reembolso` |
| `web/hooks/useApiPublica.js` | `useCatalogo` | `GET /api/libros` |
| `web/hooks/useApiPublica.js` | `useAnuncioActivo` | `GET /api/anuncios` |
| `web/hooks/useApiPublica.js` | `useEmpresa` | `GET /api/empresa` |
| `web/hooks/useApiPublica.js` | `useVersionApp` | `GET /api/app/version` |
| `web/tienda/clienteApi.js` | `login` | `POST /api/auth/login` |
| `web/tienda/clienteApi.js` | `registro` | `POST /api/auth/registro` |
| `web/tienda/clienteApi.js` | `verificarEmail` | `POST /api/auth/verificar-email` |
| `web/tienda/clienteApi.js` | `reenviarCodigo` | `POST /api/auth/reenviar-codigo` |
| `web/tienda/clienteApi.js` | `solicitarReseteo` | `POST /api/auth/solicitar-reseteo` |
| `web/tienda/clienteApi.js` | `verificarReseteo` | `POST /api/auth/verificar-reseteo` |
| `web/tienda/clienteApi.js` | `restablecer` | `POST /api/auth/reestablecer-contrasena` |
| `web/tienda/clienteApi.js` | `verificar2fa` | `POST /api/auth/2fa/verify-login` |
| `web/tienda/clienteApi.js` | `perfil` | `GET /api/usuarios/perfil` |
| `web/tienda/clienteApi.js` | `actualizarPerfil` | `PUT /api/usuarios/perfil` |
| `web/tienda/clienteApi.js` | `subirFoto` | `PUT /api/usuarios/foto` |
| `web/tienda/clienteApi.js` | `catalogo` | `GET /api/libros` |
| `web/tienda/clienteApi.js` | `recomendados` | `GET /api/libros/recomendados` |
| `web/tienda/clienteApi.js` | `asistente` | `POST /api/asistente` |
| `web/tienda/clienteApi.js` | `libro` | `GET /api/libros/:param` |
| `web/tienda/clienteApi.js` | `relacionados` | `GET /api/libros/:param/relacionados` |
| `web/tienda/clienteApi.js` | `autor` | `GET /api/autores/:param` |
| `web/tienda/clienteApi.js` | `favoritos` | `GET /api/favoritos` |
| `web/tienda/clienteApi.js` | `memoriaAsistente` | `GET /api/asistente/memoria` |
| `web/tienda/clienteApi.js` | `guardarMemoriaAsistente` | `PUT /api/asistente/memoria` |
| `web/tienda/clienteApi.js` | `borrarMemoriaAsistente` | `DELETE /api/asistente/memoria` |
| `web/tienda/clienteApi.js` | `favorito` | `GET /api/favoritos/:param` |
| `web/tienda/clienteApi.js` | `agregarFavorito` | `POST /api/favoritos/:param` |
| `web/tienda/clienteApi.js` | `quitarFavorito` | `DELETE /api/favoritos/:param` |
| `web/tienda/clienteApi.js` | `zonas` | `GET /api/zonas-delivery` |
| `web/tienda/clienteApi.js` | `capacidades` | `GET /api/pagos/capacidades` |
| `web/tienda/clienteApi.js` | `crearOrden` | `POST /api/pagos/crear-orden` |
| `web/tienda/clienteApi.js` | `compras` | `GET /api/ventas/mis-ventas` |
| `web/tienda/clienteApi.js` | `compra` | `GET /api/ventas/:param` |
| `web/tienda/clienteApi.js` | `pagoCompra` | `GET /api/ventas/:param/pago` |
| `web/tienda/clienteApi.js` | `verificarPago` | `GET /api/pagos/:param` |

## Componentes compartidos (`components/`)

| Archivo | Usado por (nº de archivos) |
|---|---|
| `panel/componentes/PortadaCatalogo.jsx` | 4 |
| `web/componentes/ActualizarApp.jsx` | 1 |
| `web/componentes/BarraMovil.jsx` | 1 |
| `web/componentes/CierreDescarga.jsx` | 1 |
| `web/componentes/EnlacesApp.jsx` | 1 |
| `web/componentes/EtiquetasLibro.jsx` | 2 |
| `web/componentes/ImagenCarga.jsx` | 2 |
| `web/componentes/MediosPago.jsx` | 1 |
| `web/componentes/Migas.jsx` | 5 |
| `web/componentes/PrecioOferta.jsx` | 6 |
| `web/componentes/PublicFooter.jsx` | 1 |
| `web/componentes/PublicHeader.jsx` | 1 |

## Hooks y utilidades

- `compartido/lib/utils/entrega.js`
- `compartido/lib/utils/estadoEntrega.js`
- `compartido/lib/utils/format.js`
- `compartido/lib/utils/portadasLibro.js`
- `compartido/lib/utils/seguimientoPedido.js`
- `compartido/lib/utils/url.js`
- `panel/lib/api/client.js`
- `panel/lib/hooks/useCarga.js`
- `panel/lib/hooks/useFormulario.js`
- `panel/lib/hooks/useImpresion.js`
- `panel/lib/hooks/usePaginaPanel.js`
- `panel/lib/roles.js`
- `panel/lib/storage/index.js`
- `panel/lib/utils/cuentas.js`
- `panel/lib/utils/exportarCsv.js`
- `panel/lib/utils/imprimirDocumento.js`
- `panel/lib/utils/numeroALetras.js`
- `panel/lib/utils/sonido.js`
- `panel/lib/utils/validaciones.js`
- `web/lib/analitica.js`
- `web/lib/cachePublica.js`
- `web/lib/cacheRecursos.js`
- `web/lib/formato.js`
- `web/lib/useCarruselAutomatico.js`

## Framer Motion (`motion/react`) — 26 archivos

- `app/providers/ToastProvider.jsx`
- `panel/auth/LoginPage.jsx`
- `panel/auth/VerificarEmailPage.jsx`
- `panel/dashboard/DashboardPage.jsx`
- `panel/dashboard/Decoraciones.jsx`
- `panel/dashboard/DetalleTarjeta.jsx`
- `panel/dashboard/MejorRegistro.jsx`
- `panel/dashboard/Pastel3D.jsx`
- `panel/dashboard/SalesChart.jsx`
- `panel/dashboard/StatCard.jsx`
- `panel/dashboard/StatusDonut.jsx`
- `panel/dashboard/StockBajo.jsx`
- `panel/dashboard/useContador.js`
- `panel/layout/AdminLayout.jsx`
- `panel/layout/PerfilAdministrador.jsx`
- `panel/layout/Sidebar.jsx`
- `panel/notificaciones/PanelNotificaciones.jsx`
- `panel/ui/Celebracion.jsx`
- `panel/ui/EmptyState.jsx`
- `panel/ui/Indicadores.jsx`
- `panel/ui/Modal.jsx`
- `panel/usuarios/UsuariosClientesPage.jsx`
- `web/componentes/PublicHeader.jsx`
- `web/PublicLayout.jsx`
- `web/secciones/FeatureStory.jsx`
- `web/tienda/PilaCarrito.jsx`

## Módulo Dashboard (Resumen)

`DashboardPage.jsx` carga en paralelo `/api/reportes/{resumen, libros-mas-vendidos, ventas-por-estado, ventas-por-mes, ventas-por-dia, indicadores-ventas}`, `GET /api/inventario/stock-bajo` y `GET /api/libros`. Los complementarios pueden fallar sin bloquear el resumen. Componentes: `StatCard`/`MiniStat`, `MejorRegistro`, `SalesChart`, `TopBooks`, `StatusDonut`, `StockBajo`, `RecentBooks`; utilidades en `graficoUtils.js`. No muestra ni consulta reservas.
